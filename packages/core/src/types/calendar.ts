/**
 * Calendar event
 */
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendees: Attendee[];
  location?: string;
  hangoutLink?: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  created: Date;
  updated: Date;
}

/**
 * Event attendee
 */
export interface Attendee {
  email: string;
  name?: string;
  responseStatus: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  isOrganizer: boolean;
}

/**
 * Input for creating a meeting
 */
export interface MeetingInput {
  title: string;
  description?: string;
  duration: number; // in minutes
  attendees: string[];
  proposedTimes: TimeSlot[];
  location?: string;
}

/**
 * Time slot for meeting
 */
export interface TimeSlot {
  start: Date;
  end: Date;
}

/**
 * Meeting availability check
 */
export interface AvailabilityCheck {
  attendees: string[];
  windowStart: Date;
  windowEnd: Date;
  duration: number; // in minutes
}

/**
 * Suggested meeting time
 */
export interface MeetingSuggestion {
  startTime: Date;
  endTime: Date;
  allAttendeesAvailable: boolean;
  conflicts: string[];
}
