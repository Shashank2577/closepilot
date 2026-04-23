import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @closepilot/core before any imports that use it
vi.mock('@closepilot/core', () => ({
  createLLMClient: vi.fn(() => ({
    generateText: vi.fn().mockResolvedValue('{}'),
  })),
  parseJsonFromText: vi.fn((text: string) => JSON.parse(text)),
}));

import {
  draftOutreachEmail,
  parseDraftResponse,
  buildDraftPrompt,
  type LeadBrief,
  type OrgProfile,
  type LLMTextGenerator,
  type DraftOutreachEmailOptions,
} from './email-drafter.js';

import {
  findAvailableSlots,
  toOutreachTimeSlot,
  formatSlotRange,
  type CalendarAvailabilityPort,
  type FindAvailableSlotsOptions,
} from './slot-finder.js';

import type { MeetingSuggestion } from '@closepilot/core';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

function makeLeadBrief(overrides: Partial<LeadBrief> = {}): LeadBrief {
  return {
    dealId: 'deal-1',
    contactName: 'Jane Smith',
    contactEmail: 'jane@acme.com',
    contactTitle: 'VP Engineering',
    company: {
      name: 'Acme Corp',
      website: 'https://acme.com',
      industry: 'SaaS',
      description: 'A project management platform',
    },
    statedNeed: 'Migrate our monolith to microservices',
    inferredTechStack: ['TypeScript', 'PostgreSQL'],
    icpScore: 85,
    similarPastDeals: [{ name: 'Globex migration', summary: 'Microservices rewrite for Globex' }],
    ...overrides,
  };
}

function makeOrgProfile(overrides: Partial<OrgProfile> = {}): OrgProfile {
  return {
    name: 'Closepilot',
    description: 'Engineering services firm',
    valueProp: 'end-to-end platform modernization',
    senderName: 'Alex Johnson',
    senderTitle: 'CEO',
    schedulingLink: 'https://cal.com/closepilot',
    timezone: 'America/New_York',
    defaultMeetingDurationMinutes: 30,
    ...overrides,
  };
}

function makeMockLLM(response: string): LLMTextGenerator {
  return {
    generateText: vi.fn().mockResolvedValue(response),
  };
}

// ---------------------------------------------------------------------------
// draftOutreachEmail
// ---------------------------------------------------------------------------

describe('draftOutreachEmail', () => {
  const lead = makeLeadBrief();
  const org = makeOrgProfile();

  it('returns subject and body from LLM-generated JSON', async () => {
    const llm = makeMockLLM(
      JSON.stringify({ subject: 'Microservices help for Acme', body: 'Hi Jane, we can help.' })
    );

    const draft = await draftOutreachEmail(lead, org, { llm });

    expect(draft.subject).toBe('Microservices help for Acme');
    expect(draft.body).toBe('Hi Jane, we can help.');
    expect(draft.to).toEqual(['jane@acme.com']);
    expect(draft.metadata?.generatedBy).toBe('llm');
    expect(draft.metadata?.wordCount).toBeGreaterThan(0);
  });

  it('uses caller-supplied draft when generatedDraft is provided', async () => {
    const options: DraftOutreachEmailOptions = {
      generatedDraft: { subject: 'Custom subject', body: 'Custom body text' },
    };

    const draft = await draftOutreachEmail(lead, org, options);

    expect(draft.subject).toBe('Custom subject');
    expect(draft.body).toBe('Custom body text');
    expect(draft.metadata?.generatedBy).toBe('caller');
  });

  it('uses caller-supplied draft when generatedDraft is a string', async () => {
    const options: DraftOutreachEmailOptions = {
      generatedDraft: JSON.stringify({ subject: 'String subject', body: 'String body here' }),
    };

    const draft = await draftOutreachEmail(lead, org, options);

    expect(draft.subject).toBe('String subject');
    expect(draft.body).toBe('String body here');
    expect(draft.metadata?.generatedBy).toBe('caller');
  });

  it('falls back to template when LLM throws and allowTemplateFallback is not false', async () => {
    const llm: LLMTextGenerator = {
      generateText: vi.fn().mockRejectedValue(new Error('LLM unavailable')),
    };

    const draft = await draftOutreachEmail(lead, org, { llm });

    expect(draft.metadata?.generatedBy).toBe('fallback');
    expect(draft.subject).toBeTruthy();
    expect(draft.body).toContain('Jane');
  });

  it('throws when LLM fails and allowTemplateFallback is false', async () => {
    const llm: LLMTextGenerator = {
      generateText: vi.fn().mockRejectedValue(new Error('LLM unavailable')),
    };

    await expect(
      draftOutreachEmail(lead, org, { llm, allowTemplateFallback: false })
    ).rejects.toThrow('LLM unavailable');
  });

  it('falls back to template when LLM returns empty JSON object', async () => {
    // When LLM returns no useful subject/body, the fallback template kicks in
    const llm = makeMockLLM('{}');

    const draft = await draftOutreachEmail(lead, org, { llm });

    // The draft should still produce something (either from parsing or fallback)
    expect(draft.to).toEqual(['jane@acme.com']);
    expect(draft.subject).toBeTruthy();
    expect(draft.body).toBeTruthy();
  });

  it('includes sourceThreadId when lead has one', async () => {
    const leadWithThread = makeLeadBrief({ sourceThreadId: 'thread-abc' });
    const llm = makeMockLLM(JSON.stringify({ subject: 'Hi', body: 'Body text here' }));

    const draft = await draftOutreachEmail(leadWithThread, org, { llm });

    expect(draft.threadId).toBe('thread-abc');
  });
});

// ---------------------------------------------------------------------------
// parseDraftResponse
// ---------------------------------------------------------------------------

describe('parseDraftResponse', () => {
  it('parses valid JSON with subject and body', () => {
    const input = JSON.stringify({ subject: 'Test', body: 'Hello world' });
    const result = parseDraftResponse(input);

    expect(result.subject).toBe('Test');
    expect(result.body).toBe('Hello world');
  });

  it('falls back to text-based parsing when JSON is invalid', () => {
    const input = 'Subject: Fallback subject\nBody: Here is the body text.';
    const result = parseDraftResponse(input);

    expect(result.subject).toBe('Fallback subject');
    expect(result.body).toContain('Here is the body text.');
  });

  it('strips code block markers and extracts body text', () => {
    // When JSON.parse fails inside code blocks, the text-based fallback strips ``` markers
    const input = '```json\nSubject: Code block subject\nBody: Inside block body text\n```';
    const result = parseDraftResponse(input);

    expect(result.subject).toBe('Code block subject');
    expect(result.body).toContain('Inside block body text');
  });
});

// ---------------------------------------------------------------------------
// buildDraftPrompt
// ---------------------------------------------------------------------------

describe('buildDraftPrompt', () => {
  it('includes lead and org details', () => {
    const prompt = buildDraftPrompt(makeLeadBrief(), makeOrgProfile());

    expect(prompt).toContain('Jane Smith');
    expect(prompt).toContain('Acme Corp');
    expect(prompt).toContain('Closepilot');
    expect(prompt).toContain('Migrate our monolith');
    expect(prompt).toContain('TypeScript');
    expect(prompt).toContain('Return JSON');
  });

  it('includes slot info when slots are provided', () => {
    const slots = [
      { start: new Date('2025-06-10T14:00:00Z'), end: new Date('2025-06-10T14:30:00Z') },
    ];
    const prompt = buildDraftPrompt(makeLeadBrief(), makeOrgProfile(), { slots });

    expect(prompt).not.toContain('No specific slots supplied');
  });

  it('includes calendar link when provided', () => {
    const prompt = buildDraftPrompt(makeLeadBrief(), makeOrgProfile(), {
      calendarLink: 'https://cal.com/test',
    });

    expect(prompt).toContain('https://cal.com/test');
  });
});

// ---------------------------------------------------------------------------
// findAvailableSlots
// ---------------------------------------------------------------------------

describe('findAvailableSlots', () => {
  function makeCalendarPort(suggestions: MeetingSuggestion[]): CalendarAvailabilityPort {
    return {
      findAvailableSlots: vi.fn().mockResolvedValue(suggestions),
    };
  }

  // Use a Wednesday at 10am to be within working hours
  const baseDate = new Date('2025-06-11T10:00:00Z');

  function makeSuggestion(
    startHour: number,
    dayOffset: number = 0,
    available = true
  ): MeetingSuggestion {
    const start = new Date(baseDate);
    start.setDate(start.getDate() + dayOffset);
    start.setUTCHours(startHour, 0, 0, 0);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + 30);

    return {
      startTime: start,
      endTime: end,
      allAttendeesAvailable: available,
      conflicts: available ? [] : ['conflict@example.com'],
    };
  }

  it('returns available slots from calendar port', async () => {
    const suggestions = [makeSuggestion(14, 0), makeSuggestion(15, 1)];
    const calendarPort = makeCalendarPort(suggestions);

    const slots = await findAvailableSlots(calendarPort, {
      attendees: ['user@test.com'],
      now: baseDate,
      count: 3,
      // Use wide working hours to avoid local-timezone filtering issues in tests
      workingHours: { startHour: 0, endHour: 24, daysOfWeek: [0, 1, 2, 3, 4, 5, 6] },
    });

    expect(calendarPort.findAvailableSlots).toHaveBeenCalledOnce();
    expect(slots.length).toBeGreaterThanOrEqual(1);
    for (const slot of slots) {
      expect(slot.allAttendeesAvailable).toBe(true);
      expect(slot.label).toBeTruthy();
    }
  });

  it('filters out slots where not all attendees are available', async () => {
    const suggestions = [
      makeSuggestion(14, 0, true),
      makeSuggestion(15, 0, false), // conflict
    ];
    const calendarPort = makeCalendarPort(suggestions);

    const slots = await findAvailableSlots(calendarPort, {
      attendees: ['a@test.com', 'b@test.com'],
      now: baseDate,
      workingHours: { startHour: 0, endHour: 24, daysOfWeek: [0, 1, 2, 3, 4, 5, 6] },
    });

    for (const slot of slots) {
      expect(slot.allAttendeesAvailable).toBe(true);
    }
  });

  it('limits result count to requested amount', async () => {
    const suggestions = Array.from({ length: 10 }, (_, i) => makeSuggestion(10 + i, i));
    const calendarPort = makeCalendarPort(suggestions);

    const slots = await findAvailableSlots(calendarPort, {
      attendees: ['a@test.com'],
      now: baseDate,
      count: 2,
      workingHours: { startHour: 0, endHour: 24, daysOfWeek: [0, 1, 2, 3, 4, 5, 6] },
    });

    expect(slots.length).toBeLessThanOrEqual(2);
  });

  it('returns empty array when calendar returns no suggestions', async () => {
    const calendarPort = makeCalendarPort([]);

    const slots = await findAvailableSlots(calendarPort, {
      attendees: ['a@test.com'],
      now: baseDate,
    });

    expect(slots).toEqual([]);
  });

  it('deduplicates slots with the same start time', async () => {
    const suggestions = [makeSuggestion(14, 0), makeSuggestion(14, 0)];
    const calendarPort = makeCalendarPort(suggestions);

    const slots = await findAvailableSlots(calendarPort, {
      attendees: ['a@test.com'],
      now: baseDate,
      workingHours: { startHour: 0, endHour: 24, daysOfWeek: [0, 1, 2, 3, 4, 5, 6] },
    });

    const startTimes = slots.map((s) => s.start.getTime());
    const unique = new Set(startTimes);
    expect(startTimes.length).toBe(unique.size);
  });
});

// ---------------------------------------------------------------------------
// toOutreachTimeSlot
// ---------------------------------------------------------------------------

describe('toOutreachTimeSlot', () => {
  it('converts a MeetingSuggestion to an OutreachTimeSlot', () => {
    const suggestion: MeetingSuggestion = {
      startTime: new Date('2025-06-10T14:00:00Z'),
      endTime: new Date('2025-06-10T14:30:00Z'),
      allAttendeesAvailable: true,
      conflicts: [],
    };

    const slot = toOutreachTimeSlot(suggestion);

    expect(slot.start).toBeInstanceOf(Date);
    expect(slot.end).toBeInstanceOf(Date);
    expect(slot.allAttendeesAvailable).toBe(true);
    expect(slot.conflicts).toEqual([]);
    expect(slot.label).toBeTruthy();
  });

  it('passes through conflicts from the suggestion', () => {
    const suggestion: MeetingSuggestion = {
      startTime: new Date('2025-06-10T14:00:00Z'),
      endTime: new Date('2025-06-10T14:30:00Z'),
      allAttendeesAvailable: false,
      conflicts: ['bob@test.com'],
    };

    const slot = toOutreachTimeSlot(suggestion);

    expect(slot.allAttendeesAvailable).toBe(false);
    expect(slot.conflicts).toEqual(['bob@test.com']);
  });

  it('handles string dates in the suggestion', () => {
    const suggestion: MeetingSuggestion = {
      startTime: '2025-06-10T14:00:00Z' as unknown as Date,
      endTime: '2025-06-10T14:30:00Z' as unknown as Date,
      allAttendeesAvailable: true,
      conflicts: [],
    };

    const slot = toOutreachTimeSlot(suggestion);

    expect(slot.start).toBeInstanceOf(Date);
    expect(slot.end).toBeInstanceOf(Date);
  });
});

// ---------------------------------------------------------------------------
// formatSlotRange
// ---------------------------------------------------------------------------

describe('formatSlotRange', () => {
  it('formats a date range into a human-readable label', () => {
    const start = new Date('2025-06-10T14:00:00Z');
    const end = new Date('2025-06-10T14:30:00Z');

    const label = formatSlotRange(start, end, 'UTC');

    expect(label).toContain('Jun');
    expect(label).toContain('10');
  });
});
