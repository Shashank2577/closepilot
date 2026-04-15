import type {
  CalendarEvent,
  MeetingInput,
  AvailabilityCheck,
  MeetingSuggestion,
} from '@closepilot/core';
import { DealStoreClient } from '../client.js';

/**
 * Calendar MCP Tools
 * Typed wrappers for Calendar operations
 */
export class CalendarTools {
  constructor(private client: DealStoreClient) {}

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
    const response = await this.client.callTool('create_calendar_event', {
      ...params,
      startTime: params.startTime.toISOString(),
      endTime: params.endTime.toISOString(),
    });
    return response.content as CalendarEvent;
  }

  /**
   * Get an event by ID
   */
  async getEvent(eventId: string): Promise<CalendarEvent | null> {
    const response = await this.client.callTool('get_calendar_event', { eventId });
    return response.content as CalendarEvent | null;
  }

  /**
   * Update an event
   */
  async updateEvent(
    eventId: string,
    updates: Partial<CalendarEvent>
  ): Promise<CalendarEvent> {
    const response = await this.client.callTool('update_calendar_event', {
      eventId,
      updates: {
        ...updates,
        startTime: updates.startTime?.toISOString(),
        endTime: updates.endTime?.toISOString(),
      },
    });
    return response.content as CalendarEvent;
  }

  /**
   * Delete an event
   */
  async deleteEvent(eventId: string): Promise<void> {
    await this.client.callTool('delete_calendar_event', { eventId });
  }

  /**
   * Check availability for a meeting
   */
  async checkAvailability(check: AvailabilityCheck): Promise<MeetingSuggestion[]> {
    const response = await this.client.callTool('check_availability', {
      ...check,
      windowStart: check.windowStart.toISOString(),
      windowEnd: check.windowEnd.toISOString(),
    });
    return response.content as MeetingSuggestion[];
  }

  /**
   * Schedule a meeting with attendees
   */
  async scheduleMeeting(input: MeetingInput): Promise<CalendarEvent> {
    const response = await this.client.callTool('schedule_meeting', {
      ...input,
      proposedTimes: input.proposedTimes.map((slot) => ({
        start: slot.start.toISOString(),
        end: slot.end.toISOString(),
      })),
    });
    return response.content as CalendarEvent;
  }

  /**
   * List upcoming events
   */
  async listUpcomingEvents(
    startDate: Date,
    endDate?: Date,
    maxResults = 10
  ): Promise<CalendarEvent[]> {
    const response = await this.client.callTool('list_upcoming_events', {
      startDate: startDate.toISOString(),
      endDate: endDate?.toISOString(),
      maxResults,
    });
    return response.content as CalendarEvent[];
  }

  /**
   * Find available time slots
   */
  async findAvailableSlots(params: {
    attendees: string[];
    windowStart: Date;
    windowEnd: Date;
    duration: number;
    count?: number;
  }): Promise<MeetingSuggestion[]> {
    const response = await this.client.callTool('find_available_slots', {
      ...params,
      windowStart: params.windowStart.toISOString(),
      windowEnd: params.windowEnd.toISOString(),
    });
    return response.content as MeetingSuggestion[];
  }
}
