import type { CalendarEvent, EmailMessage, TimeSlot } from '@closepilot/core';
import type { EmailDraft, OrgProfile } from './email-drafter.js';

export interface CalendarBookingPort {
  createEvent(params: {
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    attendees: string[];
    location?: string;
  }): Promise<CalendarEvent>;
}

export interface GmailSendPort {
  sendEmail(params: {
    to: string[];
    subject: string;
    body: string;
    cc?: string[];
    threadId?: string;
  }): Promise<EmailMessage>;
}

export interface BookingRequest {
  dealId: string;
  contactName: string;
  contactEmail: string;
  companyName?: string;
  orgProfile: OrgProfile;
  selectedSlot: TimeSlot;
  durationMinutes?: number;
  agenda?: string[];
  location?: string;
  threadId?: string;
  sendConfirmation?: boolean;
}

export interface BookingResult {
  event: CalendarEvent;
  confirmationEmail?: EmailMessage;
  confirmationDraft: EmailDraft;
}

export async function bookOutreachMeeting(
  calendarTools: CalendarBookingPort,
  request: BookingRequest,
  gmailTools?: GmailSendPort
): Promise<BookingResult> {
  const startTime = new Date(request.selectedSlot.start);
  const endTime = new Date(
    request.selectedSlot.end ||
      startTime.getTime() + (request.durationMinutes || request.orgProfile.defaultMeetingDurationMinutes || 30) * 60_000
  );

  const event = await calendarTools.createEvent({
    title: buildMeetingTitle(request),
    description: buildMeetingDescription(request),
    startTime,
    endTime,
    attendees: [request.contactEmail],
    location: request.location,
  });

  const confirmationDraft = buildConfirmationDraft(request, event);
  const confirmationEmail =
    request.sendConfirmation && gmailTools
      ? await gmailTools.sendEmail({
          to: confirmationDraft.to,
          subject: confirmationDraft.subject,
          body: confirmationDraft.body,
          cc: confirmationDraft.cc,
          threadId: confirmationDraft.threadId,
        })
      : undefined;

  return {
    event,
    confirmationDraft,
    confirmationEmail,
  };
}

export function buildConfirmationDraft(
  request: BookingRequest,
  event: CalendarEvent
): EmailDraft {
  const firstName = request.contactName.split(/\s+/)[0] || request.contactName;
  const meetingLink = event.hangoutLink ? `\n\nMeeting link: ${event.hangoutLink}` : '';
  const location = request.location ? `\nLocation: ${request.location}` : '';
  const agenda = request.agenda?.length
    ? `\n\nAgenda:\n${request.agenda.map((item) => `- ${item}`).join('\n')}`
    : '';

  return {
    to: [request.contactEmail],
    subject: `Confirmed: ${buildMeetingTitle(request)}`,
    body: [
      `Hi ${firstName},`,
      '',
      `Confirmed for ${formatDateTime(event.startTime)}. I sent a calendar invite as well.${meetingLink}${location}${agenda}`,
      '',
      'Best,',
      request.orgProfile.senderName || request.orgProfile.name,
    ].join('\n'),
    threadId: request.threadId,
    metadata: {
      generatedBy: 'fallback',
      wordCount: 0,
    },
  };
}

function buildMeetingTitle(request: BookingRequest): string {
  const company = request.companyName || request.contactName;
  return `Discovery: ${request.orgProfile.name} + ${company}`;
}

function buildMeetingDescription(request: BookingRequest): string {
  const agenda = request.agenda?.length
    ? `\n\nAgenda:\n${request.agenda.map((item) => `- ${item}`).join('\n')}`
    : '';

  return [
    `Discovery call for deal ${request.dealId}.`,
    request.companyName ? `Prospect company: ${request.companyName}.` : '',
    agenda,
  ]
    .filter(Boolean)
    .join('\n');
}

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(value));
}
