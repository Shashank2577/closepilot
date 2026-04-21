import { DateTime } from 'luxon';
import { DealStoreTools, CalendarTools } from '@closepilot/mcp-client';
import { TimeSlot, MeetingSuggestion } from '@closepilot/core';

export class AvailabilityChecker {
  constructor(private calendarTools: CalendarTools) {}

  /**
   * Find available slots for a discovery call
   */
  async getAvailableSlots(duration: number = 30): Promise<TimeSlot[]> {
    const now = DateTime.now();
    // Look ahead from tomorrow to next 5 business days
    const windowStart = now.plus({ days: 1 }).startOf('day').plus({ hours: 9 }); // 9 AM tomorrow
    const windowEnd = windowStart.plus({ days: 7 }).endOf('day');

    const suggestions = await this.calendarTools.findAvailableSlots({
      attendees: ['primary'], // 'primary' indicates the current user's calendar
      windowStart: windowStart.toJSDate(),
      windowEnd: windowEnd.toJSDate(),
      duration,
      count: 5,
    });

    return suggestions.map(s => ({
      start: s.startTime,
      end: s.endTime,
    }));
  }
}
