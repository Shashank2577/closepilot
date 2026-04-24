import type { MeetingSuggestion, TimeSlot } from '@closepilot/core';

export interface OutreachTimeSlot extends TimeSlot {
  label: string;
  allAttendeesAvailable: boolean;
  conflicts: string[];
}

export interface CalendarAvailabilityPort {
  findAvailableSlots(params: {
    attendees: string[];
    windowStart: Date;
    windowEnd: Date;
    duration: number;
    count?: number;
  }): Promise<MeetingSuggestion[]>;
}

export interface FindAvailableSlotsOptions {
  attendees: string[];
  count?: number;
  daysAhead?: number;
  durationMinutes?: number;
  timezone?: string;
  now?: Date;
  workingHours?: {
    startHour: number;
    endHour: number;
    daysOfWeek?: number[];
  };
}

const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5];

export async function findAvailableSlots(
  calendarTools: CalendarAvailabilityPort,
  options: FindAvailableSlotsOptions
): Promise<OutreachTimeSlot[]> {
  const count = options.count ?? 3;
  const daysAhead = options.daysAhead ?? 7;
  const duration = options.durationMinutes ?? 30;
  const now = options.now ?? new Date();
  const windowStart = nextSearchStart(now);
  const windowEnd = new Date(windowStart.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  const suggestions = await calendarTools.findAvailableSlots({
    attendees: options.attendees,
    windowStart,
    windowEnd,
    duration,
    count: Math.max(count * 3, count),
  });

  return suggestions
    .map((suggestion) => toOutreachTimeSlot(suggestion, options.timezone))
    .filter((slot) => slot.allAttendeesAvailable)
    .filter((slot) => isInsideWorkingHours(slot, options.workingHours))
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .filter(dedupeByStart)
    .slice(0, count);
}

export function toOutreachTimeSlot(
  suggestion: MeetingSuggestion,
  timezone?: string
): OutreachTimeSlot {
  const start = asDate(suggestion.startTime);
  const end = asDate(suggestion.endTime);

  return {
    start,
    end,
    label: formatSlotRange(start, end, timezone),
    allAttendeesAvailable: suggestion.allAttendeesAvailable,
    conflicts: suggestion.conflicts || [],
  };
}

export function formatSlotRange(start: Date, end: Date, timezone?: string): string {
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: timezone,
  });
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
    timeZone: timezone,
  });
  const endFormatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
    timeZone: timezone,
  });

  return `${dateFormatter.format(start)}, ${timeFormatter.format(start)}-${endFormatter.format(end)}`;
}

function nextSearchStart(now: Date): Date {
  const start = new Date(now);
  start.setMinutes(0, 0, 0);

  if (start.getHours() >= 17) {
    start.setDate(start.getDate() + 1);
    start.setHours(9, 0, 0, 0);
  } else if (start.getHours() < 9) {
    start.setHours(9, 0, 0, 0);
  } else {
    start.setHours(start.getHours() + 1);
  }

  return start;
}

function isInsideWorkingHours(
  slot: TimeSlot,
  workingHours: FindAvailableSlotsOptions['workingHours'] = {
    startHour: 9,
    endHour: 17,
    daysOfWeek: DEFAULT_WORKING_DAYS,
  }
): boolean {
  const start = slot.start.getHours();
  const end = slot.end.getHours() + slot.end.getMinutes() / 60;
  const day = slot.start.getDay();
  const days = workingHours.daysOfWeek || DEFAULT_WORKING_DAYS;

  return days.includes(day) && start >= workingHours.startHour && end <= workingHours.endHour;
}

function dedupeByStart(slot: TimeSlot, index: number, slots: TimeSlot[]): boolean {
  return slots.findIndex((candidate) => candidate.start.getTime() === slot.start.getTime()) === index;
}

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}
