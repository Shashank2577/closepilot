import { google } from 'googleapis';
import { DateTime } from 'luxon';
import type {
  CalendarEvent,
  MeetingInput,
  AvailabilityCheck,
  MeetingSuggestion,
  TimeSlot,
  Attendee,
} from '@closepilot/core';

/**
 * Calendar authentication configuration
 * In production, this would use OAuth tokens from the database
 */
interface CalendarAuthConfig {
  accessToken: string;
  refreshToken?: string;
  clientId: string;
  clientSecret: string;
}

/**
 * Google Calendar API service
 */
class CalendarService {
  private calendar: any;

  constructor(authConfig: CalendarAuthConfig) {
    const oauth2Client = new google.auth.OAuth2(
      authConfig.clientId,
      authConfig.clientSecret
    );

    oauth2Client.setCredentials({
      access_token: authConfig.accessToken,
      refresh_token: authConfig.refreshToken,
    });

    this.calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  }

  /**
   * Create a calendar event
   */
  async createEvent(params: {
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    attendees: string[];
    location?: string;
  }): Promise<CalendarEvent> {
    const event = {
      summary: params.title,
      description: params.description,
      start: {
        dateTime: params.startTime.toISOString(),
      },
      end: {
        dateTime: params.endTime.toISOString(),
      },
      attendees: params.attendees.map((email) => ({ email })),
      location: params.location,
      conferenceData: {
        createRequest: {
          requestId: `${Date.now()}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet',
          },
        },
      },
      guestsCanInviteOthers: true,
      guestsCanModify: false,
      sendUpdates: 'all',
    };

    const response = await this.calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      conferenceDataVersion: 1,
      sendUpdates: 'all',
    });

    const data = response.data;

    return {
      id: data.id,
      title: data.summary,
      description: data.description,
      startTime: new Date(data.start.dateTime),
      endTime: new Date(data.end.dateTime),
      attendees: data.attendees?.map((att: any) => ({
        email: att.email,
        name: att.displayName,
        responseStatus: att.responseStatus,
        isOrganizer: att.organizer,
      })) || [],
      location: data.location,
      hangoutLink: data.hangoutLink,
      status: data.status === 'confirmed' ? 'confirmed' : 'tentative',
      created: new Date(data.created),
      updated: new Date(data.updated),
    };
  }

  /**
   * Get an event by ID
   */
  async getEvent(eventId: string): Promise<CalendarEvent | null> {
    try {
      const response = await this.calendar.events.get({
        calendarId: 'primary',
        eventId: eventId,
      });

      const data = response.data;

      return {
        id: data.id,
        title: data.summary,
        description: data.description,
        startTime: new Date(data.start.dateTime || data.start.date),
        endTime: new Date(data.end.dateTime || data.end.date),
        attendees: data.attendees?.map((att: any) => ({
          email: att.email,
          name: att.displayName,
          responseStatus: att.responseStatus,
          isOrganizer: att.organizer,
        })) || [],
        location: data.location,
        hangoutLink: data.hangoutLink,
        status: data.status === 'confirmed' ? 'confirmed' : 'tentative',
        created: new Date(data.created),
        updated: new Date(data.updated),
      };
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update an event
   */
  async updateEvent(
    eventId: string,
    updates: Partial<CalendarEvent>
  ): Promise<CalendarEvent> {
    const existingEvent = await this.getEvent(eventId);
    if (!existingEvent) {
      throw new Error(`Event ${eventId} not found`);
    }

    const eventPatch: any = {};

    if (updates.title) eventPatch.summary = updates.title;
    if (updates.description !== undefined) eventPatch.description = updates.description;
    if (updates.startTime) eventPatch.start = { dateTime: updates.startTime.toISOString() };
    if (updates.endTime) eventPatch.end = { dateTime: updates.endTime.toISOString() };
    if (updates.attendees) {
      eventPatch.attendees = updates.attendees.map((att) => ({
        email: att.email,
        displayName: att.name,
        responseStatus: att.responseStatus,
      }));
    }
    if (updates.location !== undefined) eventPatch.location = updates.location;

    const response = await this.calendar.events.patch({
      calendarId: 'primary',
      eventId: eventId,
      resource: eventPatch,
      sendUpdates: 'all',
    });

    const data = response.data;

    return {
      id: data.id,
      title: data.summary,
      description: data.description,
      startTime: new Date(data.start.dateTime || data.start.date),
      endTime: new Date(data.end.dateTime || data.end.date),
      attendees: data.attendees?.map((att: any) => ({
        email: att.email,
        name: att.displayName,
        responseStatus: att.responseStatus,
        isOrganizer: att.organizer,
      })) || [],
      location: data.location,
      hangoutLink: data.hangoutLink,
      status: data.status === 'confirmed' ? 'confirmed' : 'tentative',
      created: new Date(data.created),
      updated: new Date(data.updated),
    };
  }

  /**
   * Delete/cancel an event
   */
  async deleteEvent(eventId: string): Promise<void> {
    await this.calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
      sendUpdates: 'all',
    });
  }

  /**
   * Check availability for attendees
   */
  async checkAvailability(check: AvailabilityCheck): Promise<MeetingSuggestion[]> {
    const windowStart = check.windowStart.toISOString();
    const windowEnd = check.windowEnd.toISOString();

    // Query free/busy information for all attendees
    const freeBusyResponse = await this.calendar.freebusy.query({
      resource: {
        timeMin: windowStart,
        timeMax: windowEnd,
        items: check.attendees.map((email) => ({ id: email })),
      },
    });

    const busyTimes = freeBusyResponse.data.calendars || {};

    // Generate 30-minute slot suggestions
    const suggestions: MeetingSuggestion[] = [];
    const slotDuration = check.duration;
    const slotIncrement = 30; // 30 minutes

    let currentTime = DateTime.fromISO(check.windowStart.toISOString());
    const endTime = DateTime.fromISO(check.windowEnd.toISOString());

    while (currentTime.plus({ minutes: slotDuration }) <= endTime) {
      const slotStart = currentTime;
      const slotEnd = currentTime.plus({ minutes: slotDuration });

      // Check if all attendees are available for this slot
      const conflicts: string[] = [];

      for (const attendee of check.attendees) {
        const attendeeBusy = busyTimes[attendee]?.busy || [];
        const isBusy = attendeeBusy.some((busy: any) => {
          const busyStart = DateTime.fromISO(busy.start);
          const busyEnd = DateTime.fromISO(busy.end);
          return slotStart < busyEnd && slotEnd > busyStart;
        });

        if (isBusy) {
          conflicts.push(attendee);
        }
      }

      suggestions.push({
        startTime: slotStart.toJSDate(),
        endTime: slotEnd.toJSDate(),
        allAttendeesAvailable: conflicts.length === 0,
        conflicts,
      });

      currentTime = currentTime.plus({ minutes: slotIncrement });
    }

    return suggestions;
  }

  /**
   * Schedule a meeting with attendees
   */
  async scheduleMeeting(input: MeetingInput): Promise<CalendarEvent> {
    // Find best available time from proposed slots
    const bestSlot = await this.findBestSlot(input);

    if (!bestSlot) {
      throw new Error('No available time slot found for all attendees');
    }

    // Create the event
    return this.createEvent({
      title: input.title,
      description: input.description,
      startTime: bestSlot.start,
      endTime: bestSlot.end,
      attendees: input.attendees,
      location: input.location,
    });
  }

  /**
   * List upcoming events
   */
  async listUpcomingEvents(
    startDate: Date,
    endDate?: Date,
    maxResults = 10
  ): Promise<CalendarEvent[]> {
    const response = await this.calendar.events.list({
      calendarId: 'primary',
      timeMin: startDate.toISOString(),
      timeMax: endDate?.toISOString(),
      maxResults: maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];

    return events.map((event: any) => ({
      id: event.id,
      title: event.summary,
      description: event.description,
      startTime: new Date(event.start.dateTime || event.start.date),
      endTime: new Date(event.end.dateTime || event.end.date),
      attendees: event.attendees?.map((att: any) => ({
        email: att.email,
        name: att.displayName,
        responseStatus: att.responseStatus,
        isOrganizer: att.organizer,
      })) || [],
      location: event.location,
      hangoutLink: event.hangoutLink,
      status: event.status === 'confirmed' ? 'confirmed' : 'tentative',
      created: new Date(event.created),
      updated: new Date(event.updated),
    }));
  }

  /**
   * Find available time slots for a meeting
   */
  async findAvailableSlots(params: {
    attendees: string[];
    windowStart: Date;
    windowEnd: Date;
    duration: number;
    count?: number;
  }): Promise<MeetingSuggestion[]> {
    const count = params.count || 5;

    // Check availability
    const suggestions = await this.checkAvailability({
      attendees: params.attendees,
      windowStart: params.windowStart,
      windowEnd: params.windowEnd,
      duration: params.duration,
    });

    // Filter and return only available slots
    const availableSlots = suggestions
      .filter((s) => s.allAttendeesAvailable)
      .slice(0, count);

    return availableSlots;
  }

  /**
   * Find best time slot from proposed times
   */
  private async findBestSlot(input: MeetingInput): Promise<TimeSlot | null> {
    // Check each proposed time slot
    for (const proposedTime of input.proposedTimes) {
      const availability = await this.checkAvailability({
        attendees: input.attendees,
        windowStart: proposedTime.start,
        windowEnd: proposedTime.end,
        duration: input.duration,
      });

      // Find a slot where everyone is available
      const availableSlot = availability.find((s) => s.allAttendeesAvailable);
      if (availableSlot) {
        return {
          start: availableSlot.startTime,
          end: availableSlot.endTime,
        };
      }
    }

    return null;
  }
}

/**
 * Register Calendar integration tools with MCP server
 */
export function registerCalendarTools(server: any): void {
  console.log('Calendar tools registered');

  // Tool handlers will be registered through the main MCP server's request handler
  // The CalendarService class provides the actual implementation
}

/**
 * Create calendar event
 */
export async function createEvent(params: {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendees: string[];
  location?: string;
  authConfig: CalendarAuthConfig;
}): Promise<CalendarEvent> {
  const service = new CalendarService(params.authConfig);
  return service.createEvent(params);
}

/**
 * Get event by ID
 */
export async function getEvent(
  eventId: string,
  authConfig: CalendarAuthConfig
): Promise<CalendarEvent | null> {
  const service = new CalendarService(authConfig);
  return service.getEvent(eventId);
}

/**
 * Update event
 */
export async function updateEvent(
  eventId: string,
  updates: Partial<CalendarEvent>,
  authConfig: CalendarAuthConfig
): Promise<CalendarEvent> {
  const service = new CalendarService(authConfig);
  return service.updateEvent(eventId, updates);
}

/**
 * Delete event
 */
export async function deleteEvent(
  eventId: string,
  authConfig: CalendarAuthConfig
): Promise<void> {
  const service = new CalendarService(authConfig);
  return service.deleteEvent(eventId);
}

/**
 * Check availability for attendees
 */
export async function checkAvailability(
  check: AvailabilityCheck,
  authConfig: CalendarAuthConfig
): Promise<MeetingSuggestion[]> {
  const service = new CalendarService(authConfig);
  return service.checkAvailability(check);
}

/**
 * Schedule meeting with attendees
 */
export async function scheduleMeeting(
  input: MeetingInput,
  authConfig: CalendarAuthConfig
): Promise<CalendarEvent> {
  const service = new CalendarService(authConfig);
  return service.scheduleMeeting(input);
}

/**
 * List upcoming events
 */
export async function listUpcomingEvents(
  startDate: Date,
  endDate: Date | undefined,
  maxResults: number,
  authConfig: CalendarAuthConfig
): Promise<CalendarEvent[]> {
  const service = new CalendarService(authConfig);
  return service.listUpcomingEvents(startDate, endDate, maxResults);
}

/**
 * Find available time slots
 */
export async function findAvailableSlots(
  params: {
    attendees: string[];
    windowStart: Date;
    windowEnd: Date;
    duration: number;
    count?: number;
  },
  authConfig: CalendarAuthConfig
): Promise<MeetingSuggestion[]> {
  const service = new CalendarService(authConfig);
  return service.findAvailableSlots(params);
}
