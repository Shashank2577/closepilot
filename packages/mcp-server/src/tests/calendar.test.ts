import { describe, it, expect, vi, beforeEach } from 'vitest';
import { google } from 'googleapis';
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
import { DateTime } from 'luxon';

// Mock variables
const insertMock = vi.fn();
const getMock = vi.fn();
const updateMock = vi.fn();
const deleteMock = vi.fn();
const listMock = vi.fn();
const queryMock = vi.fn();

// Mock googleapis
vi.mock('googleapis', () => {
  return {
    google: {
      auth: {
        GoogleAuth: vi.fn(),
      },
      calendar: vi.fn(() => ({
        events: {
          insert: insertMock,
          get: getMock,
          update: updateMock,
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

describe('Calendar Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation for getMock
    getMock.mockResolvedValue({
      data: {
        id: 'test-event-1',
        summary: 'Existing Event',
        start: { dateTime: '2024-05-01T10:00:00Z' },
        end: { dateTime: '2024-05-01T11:00:00Z' },
      }
    });
  });

  describe('createEvent', () => {
    it('creates an event with google meet link', async () => {
      insertMock.mockResolvedValueOnce({
        data: {
          id: 'new-event-1',
          summary: 'Test Meeting',
          description: 'Test Description',
          start: { dateTime: '2024-05-02T10:00:00Z' },
          end: { dateTime: '2024-05-02T11:00:00Z' },
          attendees: [{ email: 'test@example.com' }],
          status: 'confirmed',
        }
      });

      const params = {
        title: 'Test Meeting',
        description: 'Test Description',
        startTime: '2024-05-02T10:00:00Z',
        endTime: '2024-05-02T11:00:00Z',
        attendees: ['test@example.com'],
      };

      const result = await createEvent(params);

      expect(insertMock).toHaveBeenCalledTimes(1);
      const callArg = insertMock.mock.calls[0][0];
      expect(callArg.requestBody.summary).toBe('Test Meeting');
      expect(callArg.requestBody.conferenceData).toBeDefined(); // google meet logic

      expect(result.id).toBe('new-event-1');
      expect(result.title).toBe('Test Meeting');
    });
  });

  describe('getEvent', () => {
    it('gets an existing event', async () => {
      const result = await getEvent('test-event-1');
      expect(getMock).toHaveBeenCalledWith({
        calendarId: 'primary',
        eventId: 'test-event-1',
      });
      expect(result?.id).toBe('test-event-1');
      expect(result?.title).toBe('Existing Event');
    });

    it('returns null on 404', async () => {
      getMock.mockRejectedValueOnce({ code: 404 });
      const result = await getEvent('missing-event');
      expect(result).toBeNull();
    });
  });

  describe('updateEvent', () => {
    it('updates an event successfully', async () => {
      updateMock.mockResolvedValueOnce({
        data: {
          id: 'test-event-1',
          summary: 'Updated Event',
          start: { dateTime: '2024-05-01T10:00:00Z' },
          end: { dateTime: '2024-05-01T12:00:00Z' },
        }
      });

      const result = await updateEvent('test-event-1', {
        title: 'Updated Event',
        endTime: '2024-05-01T12:00:00Z'
      });

      expect(getMock).toHaveBeenCalledWith({ calendarId: 'primary', eventId: 'test-event-1' });
      expect(updateMock).toHaveBeenCalledTimes(1);

      const updateCallArg = updateMock.mock.calls[0][0];
      expect(updateCallArg.requestBody.summary).toBe('Updated Event');
      expect(result.title).toBe('Updated Event');
    });
  });

  describe('deleteEvent', () => {
    it('deletes an event successfully', async () => {
      deleteMock.mockResolvedValueOnce({});

      await deleteEvent('test-event-1');

      expect(deleteMock).toHaveBeenCalledWith({
        calendarId: 'primary',
        eventId: 'test-event-1',
      });
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
      });

      expect(queryMock).toHaveBeenCalledTimes(1);
      expect(result.length).toBe(1);
      expect(result[0].attendee).toBe('test@example.com');
      expect(result[0].busy.length).toBe(1);
    });
  });

  describe('listUpcomingEvents', () => {
    it('lists upcoming events', async () => {
      listMock.mockResolvedValueOnce({
        data: {
          items: [
            { id: '1', summary: 'Event 1' },
            { id: '2', summary: 'Event 2' }
          ]
        }
      });

      const result = await listUpcomingEvents('2024-05-01T00:00:00Z', undefined, 5);

      expect(listMock).toHaveBeenCalledTimes(1);
      const callArg = listMock.mock.calls[0][0];
      expect(callArg.maxResults).toBe(5);
      expect(result.length).toBe(2);
      expect(result[0].title).toBe('Event 1');
    });
  });

  describe('findAvailableSlots', () => {
    it('finds available slots bypassing busy times', async () => {
      // Mock freebusy response with one busy block
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
        windowStart: '2024-05-01T09:00:00Z',
        windowEnd: '2024-05-01T12:00:00Z',
        duration: 60, // 1 hour
      });

      // 09:00 - 10:00 is free (1 suggestion)
      // 10:00 - 11:00 is busy
      // 11:00 - 12:00 is free (1 suggestion)
      // Plus 09:30 - 10:30 overlaps with busy, skip.

      // Let's verify we get slots outside the busy period.
      // 09:00, 09:30 (overlaps), 11:00
      expect(suggestions.length).toBeGreaterThan(0);

      // First slot should be at 09:00
      expect(suggestions[0].startTime.toISOString()).toBe('2024-05-01T09:00:00.000Z');

      // Ensure no suggestions overlap the busy time (10:00 to 11:00)
      const busyStart = new Date('2024-05-01T10:00:00Z').getTime();
      const busyEnd = new Date('2024-05-01T11:00:00Z').getTime();

      for (const slot of suggestions) {
        const slotStart = slot.startTime.getTime();
        const slotEnd = slot.endTime.getTime();
        const overlaps = slotStart < busyEnd && slotEnd > busyStart;
        expect(overlaps).toBe(false);
      }
    });
  });

  describe('scheduleMeeting', () => {
    it('schedules a meeting using the first suitable proposed time', async () => {
      insertMock.mockResolvedValueOnce({
        data: {
          id: 'scheduled-event-1',
          summary: 'Scheduled Meeting',
          start: { dateTime: '2024-05-01T11:00:00Z' },
          end: { dateTime: '2024-05-01T12:00:00Z' },
        }
      });

      const result = await scheduleMeeting({
        title: 'Scheduled Meeting',
        duration: 60,
        attendees: ['test@example.com'],
        proposedTimes: [
          // This slot is only 30 mins, too short
          { start: '2024-05-01T09:00:00Z', end: '2024-05-01T09:30:00Z' },
          // This slot is 60 mins, suitable
          { start: '2024-05-01T11:00:00Z', end: '2024-05-01T12:00:00Z' }
        ]
      });

      expect(insertMock).toHaveBeenCalledTimes(1);
      const callArg = insertMock.mock.calls[0][0];
      // Expect start time of the chosen slot
      expect(callArg.requestBody.start.dateTime).toBe('2024-05-01T11:00:00Z');
      expect(result.id).toBe('scheduled-event-1');
    });

    it('throws error if no suitable time found', async () => {
      await expect(scheduleMeeting({
        title: 'Impossible Meeting',
        duration: 120,
        attendees: ['test@example.com'],
        proposedTimes: [
          { start: '2024-05-01T09:00:00Z', end: '2024-05-01T10:00:00Z' }
        ]
      })).rejects.toThrow('No suitable time slot found');
    });
  });
});
