import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createEvent,
  getEvent,
  updateEvent,
  deleteEvent,
  checkAvailability,
  listUpcomingEvents,
  findAvailableSlots,
  scheduleMeeting,
} from '../tools/calendar';

// Mock variables
const insertMock = vi.fn();
const getMock = vi.fn();
const patchMock = vi.fn();
const deleteMock = vi.fn();
const listMock = vi.fn();
const queryMock = vi.fn();

// Helper: build a minimal Google Calendar event shape
function makeGCalEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'test-event-1',
    summary: 'Existing Event',
    description: '',
    start: { dateTime: '2024-05-01T10:00:00Z' },
    end: { dateTime: '2024-05-01T11:00:00Z' },
    attendees: [],
    location: undefined,
    hangoutLink: undefined,
    status: 'confirmed',
    created: '2024-05-01T00:00:00Z',
    updated: '2024-05-01T00:00:00Z',
    ...overrides,
  };
}

// Mock googleapis
vi.mock('googleapis', () => {
  return {
    google: {
      auth: {
        GoogleAuth: vi.fn(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        OAuth2: vi.fn(function(this: any) { this.setCredentials = vi.fn(); }),
      },
      calendar: vi.fn(() => ({
        events: {
          insert: insertMock,
          get: getMock,
          patch: patchMock,
          delete: deleteMock,
          list: listMock,
        },
        freebusy: {
          query: queryMock,
        }
      })),
    },
  };
});

const mockAuthConfig = {
  accessToken: 'test-token',
  refreshToken: 'test-refresh',
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
};

describe('Calendar Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: get returns a valid event
    getMock.mockResolvedValue({ data: makeGCalEvent() });
  });

  describe('createEvent', () => {
    it('creates an event with google meet link', async () => {
      const eventData = makeGCalEvent({
        id: 'new-event-1',
        summary: 'Test Meeting',
        description: 'Test Description',
        start: { dateTime: '2024-05-02T10:00:00Z' },
        end: { dateTime: '2024-05-02T11:00:00Z' },
        attendees: [{ email: 'test@example.com' }],
      });
      insertMock.mockResolvedValueOnce({ data: eventData });

      const result = await createEvent({
        title: 'Test Meeting',
        description: 'Test Description',
        startTime: new Date('2024-05-02T10:00:00Z'),
        endTime: new Date('2024-05-02T11:00:00Z'),
        attendees: ['test@example.com'],
        authConfig: mockAuthConfig,
      });

      expect(insertMock).toHaveBeenCalledTimes(1);
      const callArg = insertMock.mock.calls[0][0];
      // calendar.ts uses `resource:` not `requestBody:`
      expect(callArg.resource.summary).toBe('Test Meeting');
      expect(callArg.resource.conferenceData).toBeDefined();

      expect(result.id).toBe('new-event-1');
      expect(result.title).toBe('Test Meeting');
    });
  });

  describe('getEvent', () => {
    it('gets an existing event', async () => {
      const result = await getEvent('test-event-1', mockAuthConfig);
      expect(getMock).toHaveBeenCalledWith({
        calendarId: 'primary',
        eventId: 'test-event-1',
      });
      expect(result?.id).toBe('test-event-1');
      expect(result?.title).toBe('Existing Event');
    });

    it('returns null on 404', async () => {
      getMock.mockRejectedValueOnce({ code: 404 });
      const result = await getEvent('missing-event', mockAuthConfig);
      expect(result).toBeNull();
    });
  });

  describe('updateEvent', () => {
    it('updates an event successfully', async () => {
      patchMock.mockResolvedValueOnce({
        data: makeGCalEvent({
          summary: 'Updated Event',
          end: { dateTime: '2024-05-01T12:00:00Z' },
        })
      });

      const result = await updateEvent('test-event-1', {
        title: 'Updated Event',
        endTime: new Date('2024-05-01T12:00:00Z'),
      }, mockAuthConfig);

      // First fetches the existing event, then patches
      expect(getMock).toHaveBeenCalledWith({ calendarId: 'primary', eventId: 'test-event-1' });
      expect(patchMock).toHaveBeenCalledTimes(1);
      const patchArg = patchMock.mock.calls[0][0];
      expect(patchArg.resource.summary).toBe('Updated Event');
      expect(result.title).toBe('Updated Event');
    });
  });

  describe('deleteEvent', () => {
    it('deletes an event successfully', async () => {
      deleteMock.mockResolvedValueOnce({});

      await deleteEvent('test-event-1', mockAuthConfig);

      expect(deleteMock).toHaveBeenCalledTimes(1);
      const deleteArg = deleteMock.mock.calls[0][0];
      expect(deleteArg.calendarId).toBe('primary');
      expect(deleteArg.eventId).toBe('test-event-1');
    });
  });

  describe('checkAvailability', () => {
    it('checks availability using freebusy query', async () => {
      queryMock.mockResolvedValueOnce({
        data: {
          calendars: {
            'test@example.com': {
              busy: [{ start: '2024-05-01T10:00:00Z', end: '2024-05-01T11:00:00Z' }]
            }
          }
        }
      });

      const result = await checkAvailability({
        attendees: ['test@example.com'],
        windowStart: new Date('2024-05-01T09:00:00Z'),
        windowEnd: new Date('2024-05-01T17:00:00Z'),
        duration: 30
      }, mockAuthConfig);

      expect(queryMock).toHaveBeenCalledTimes(1);
      expect(result.length).toBeGreaterThan(0);
      // Slots overlapping busy period should have conflicts
      const busySlot = result.find(s =>
        s.startTime >= new Date('2024-05-01T10:00:00Z') &&
        s.startTime < new Date('2024-05-01T11:00:00Z')
      );
      expect(busySlot?.allAttendeesAvailable).toBe(false);
    });
  });

  describe('listUpcomingEvents', () => {
    it('lists upcoming events', async () => {
      listMock.mockResolvedValueOnce({
        data: {
          items: [
            makeGCalEvent({ id: '1', summary: 'Event 1' }),
            makeGCalEvent({ id: '2', summary: 'Event 2' }),
          ]
        }
      });

      const result = await listUpcomingEvents(
        new Date('2024-05-01T00:00:00Z'),
        undefined,
        5,
        mockAuthConfig
      );

      expect(listMock).toHaveBeenCalledTimes(1);
      const callArg = listMock.mock.calls[0][0];
      expect(callArg.maxResults).toBe(5);
      expect(result.length).toBe(2);
      expect(result[0].title).toBe('Event 1');
    });
  });

  describe('findAvailableSlots', () => {
    it('finds available slots bypassing busy times', async () => {
      queryMock.mockResolvedValueOnce({
        data: {
          calendars: {
            'test@example.com': {
              busy: [{ start: '2024-05-01T10:00:00Z', end: '2024-05-01T11:00:00Z' }]
            }
          }
        }
      });

      const suggestions = await findAvailableSlots({
        attendees: ['test@example.com'],
        windowStart: new Date('2024-05-01T09:00:00Z'),
        windowEnd: new Date('2024-05-01T12:00:00Z'),
        duration: 60,
      }, mockAuthConfig);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].startTime.toISOString()).toBe('2024-05-01T09:00:00.000Z');

      const busyStart = new Date('2024-05-01T10:00:00Z').getTime();
      const busyEnd = new Date('2024-05-01T11:00:00Z').getTime();
      for (const slot of suggestions) {
        const overlaps = slot.startTime.getTime() < busyEnd && slot.endTime.getTime() > busyStart;
        expect(overlaps).toBe(false);
      }
    });
  });

  describe('scheduleMeeting', () => {
    it('schedules a meeting using the first suitable proposed time', async () => {
      // scheduleMeeting → findBestSlot → checkAvailability → freebusy.query
      // Return no busy times so all slots are available
      queryMock.mockResolvedValue({
        data: { calendars: { 'test@example.com': { busy: [] } } }
      });

      insertMock.mockResolvedValueOnce({
        data: makeGCalEvent({
          id: 'scheduled-event-1',
          summary: 'Scheduled Meeting',
          start: { dateTime: '2024-05-01T11:00:00Z' },
          end: { dateTime: '2024-05-01T12:00:00Z' },
        })
      });

      const result = await scheduleMeeting({
        title: 'Scheduled Meeting',
        duration: 60,
        attendees: ['test@example.com'],
        proposedTimes: [
          // Only 30 min — too short
          { start: new Date('2024-05-01T09:00:00Z'), end: new Date('2024-05-01T09:30:00Z') },
          // 60 min — suitable
          { start: new Date('2024-05-01T11:00:00Z'), end: new Date('2024-05-01T12:00:00Z') }
        ]
      }, mockAuthConfig);

      expect(insertMock).toHaveBeenCalledTimes(1);
      const callArg = insertMock.mock.calls[0][0];
      expect(callArg.resource.start.dateTime).toBe('2024-05-01T11:00:00.000Z');
      expect(result.id).toBe('scheduled-event-1');
    });

    it('throws error if no suitable time found', async () => {
      // All attendees are busy for every proposed slot
      queryMock.mockResolvedValue({
        data: {
          calendars: {
            'test@example.com': {
              busy: [{ start: '2024-05-01T00:00:00Z', end: '2024-05-02T00:00:00Z' }]
            }
          }
        }
      });

      await expect(scheduleMeeting({
        title: 'Impossible Meeting',
        duration: 120,
        attendees: ['test@example.com'],
        proposedTimes: [
          { start: new Date('2024-05-01T09:00:00Z'), end: new Date('2024-05-01T10:00:00Z') }
        ]
      }, mockAuthConfig)).rejects.toThrow('No available time slot found');
    });
  });
});
