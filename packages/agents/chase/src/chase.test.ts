import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @closepilot/core before any imports that use it
vi.mock('@closepilot/core', () => ({
  createLLMClient: vi.fn(() => undefined),
}));

import {
  detectStalledDeals,
  resolveLastActivityAt,
  nextFollowUpNumber,
  stageAfterFollowUp,
  DEFAULT_ACTIVE_CHASE_STAGES,
  type StallDetectionOptions,
} from './stall-detector.js';

import {
  draftFollowUp,
  type FollowUpDraftInput,
  type TextGenerationClient,
} from './followup-drafter.js';

import type { ChaseDeal, StalledDeal, FollowUpNumber } from './types.js';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const NOW = new Date('2025-06-15T12:00:00Z');

function makeDeal(overrides: Partial<ChaseDeal> = {}): ChaseDeal {
  return {
    id: 'deal-1',
    stage: 'proposal-sent',
    createdAt: new Date('2025-06-01T10:00:00Z'),
    updatedAt: new Date('2025-06-01T10:00:00Z'),
    leadEmail: 'jane@acme.com',
    leadName: 'Jane Smith',
    leadCompany: 'Acme Corp',
    leadTitle: 'VP Engineering',
    ...overrides,
  };
}

function makeStalledDeal(overrides: Partial<StalledDeal> = {}): StalledDeal {
  const deal = makeDeal();
  return {
    deal,
    daysSinceActivity: 7,
    lastActivityAt: new Date('2025-06-08T10:00:00Z'),
    followUpNumber: 1,
    reason: 'no_activity_after_proposal',
    ...overrides,
  };
}

function makeMockLLM(response: unknown): TextGenerationClient {
  return {
    generateJson: vi.fn().mockResolvedValue(response),
  };
}

// ---------------------------------------------------------------------------
// detectStalledDeals
// ---------------------------------------------------------------------------

describe('detectStalledDeals', () => {
  const defaultOptions: StallDetectionOptions = { now: NOW, stallThresholdDays: 5 };

  it('detects a deal that has been stale for >5 days', () => {
    const staleDeal = makeDeal({
      stage: 'proposal-sent',
      lastActivityAt: new Date('2025-06-05T10:00:00Z'), // 10 days ago
    });

    const result = detectStalledDeals([staleDeal], defaultOptions);

    expect(result).toHaveLength(1);
    expect(result[0].deal.id).toBe('deal-1');
    expect(result[0].daysSinceActivity).toBeGreaterThanOrEqual(5);
    expect(result[0].reason).toBe('no_activity_after_proposal');
  });

  it('does NOT flag a fresh deal (activity < 5 days ago)', () => {
    const freshDeal = makeDeal({
      stage: 'proposal-sent',
      lastActivityAt: new Date('2025-06-13T10:00:00Z'), // 2 days ago
    });

    const result = detectStalledDeals([freshDeal], defaultOptions);

    expect(result).toHaveLength(0);
  });

  it('does NOT flag a deal in a closed stage', () => {
    const closedDeal = makeDeal({
      stage: 'closed-won',
      lastActivityAt: new Date('2025-06-01T10:00:00Z'), // 14 days ago
    });

    const result = detectStalledDeals([closedDeal], defaultOptions);

    expect(result).toHaveLength(0);
  });

  it('does NOT flag a deal with pending approval', () => {
    const pendingDeal = makeDeal({
      stage: 'proposal-sent',
      lastActivityAt: new Date('2025-06-01T10:00:00Z'),
      approvalStatus: 'pending',
    });

    const result = detectStalledDeals([pendingDeal], defaultOptions);

    expect(result).toHaveLength(0);
  });

  it('respects custom stall threshold', () => {
    const deal = makeDeal({
      stage: 'proposal-sent',
      lastActivityAt: new Date('2025-06-12T10:00:00Z'), // 3 days ago
    });

    // 3-day threshold: should detect
    const detected = detectStalledDeals([deal], { now: NOW, stallThresholdDays: 3 });
    expect(detected).toHaveLength(1);

    // 5-day threshold (default): should NOT detect
    const notDetected = detectStalledDeals([deal], defaultOptions);
    expect(notDetected).toHaveLength(0);
  });

  it('assigns correct reason for follow-up stage deals', () => {
    const deal = makeDeal({
      stage: 'follow-up-1',
      lastActivityAt: new Date('2025-06-01T10:00:00Z'),
    });

    const result = detectStalledDeals([deal], defaultOptions);

    expect(result).toHaveLength(1);
    expect(result[0].reason).toBe('awaiting_follow_up');
  });

  it('skips deals that have exceeded max follow-ups', () => {
    const deal = makeDeal({
      stage: 'follow-up-2',
      lastActivityAt: new Date('2025-06-01T10:00:00Z'),
      chase: { followUpCount: 2 },
    });

    // followUpCount 2 -> nextFollowUpNumber = 3, which exceeds maxFollowUps of 2
    const result = detectStalledDeals([deal], { ...defaultOptions, maxFollowUps: 2 });

    expect(result).toHaveLength(0);
  });

  it('returns empty array when given no deals', () => {
    const result = detectStalledDeals([], defaultOptions);
    expect(result).toEqual([]);
  });

  it('handles multiple deals and only returns stale ones', () => {
    const staleDeal = makeDeal({
      id: 'stale',
      stage: 'proposal-sent',
      lastActivityAt: new Date('2025-06-01T10:00:00Z'),
    });
    const freshDeal = makeDeal({
      id: 'fresh',
      stage: 'proposal-sent',
      lastActivityAt: new Date('2025-06-14T10:00:00Z'),
    });
    const closedDeal = makeDeal({
      id: 'closed',
      stage: 'closed-lost',
      lastActivityAt: new Date('2025-06-01T10:00:00Z'),
    });

    const result = detectStalledDeals([staleDeal, freshDeal, closedDeal], defaultOptions);

    expect(result).toHaveLength(1);
    expect(result[0].deal.id).toBe('stale');
  });
});

// ---------------------------------------------------------------------------
// resolveLastActivityAt
// ---------------------------------------------------------------------------

describe('resolveLastActivityAt', () => {
  it('returns lastActivityAt when present', () => {
    const date = new Date('2025-06-10T10:00:00Z');
    const deal = makeDeal({ lastActivityAt: date });

    expect(resolveLastActivityAt(deal)).toEqual(date);
  });

  it('falls back to lastContactedAt', () => {
    const date = new Date('2025-06-09T10:00:00Z');
    const deal = makeDeal({ lastActivityAt: undefined, lastContactedAt: date });

    expect(resolveLastActivityAt(deal)).toEqual(date);
  });

  it('falls back to updatedAt when no activity dates exist', () => {
    const date = new Date('2025-06-08T10:00:00Z');
    const deal = makeDeal({
      lastActivityAt: undefined,
      lastContactedAt: undefined,
      proposalSentAt: undefined,
      updatedAt: date,
    });

    expect(resolveLastActivityAt(deal)).toEqual(date);
  });

  it('returns epoch when no dates are parseable', () => {
    const deal = makeDeal({
      lastActivityAt: undefined,
      lastContactedAt: undefined,
      proposalSentAt: undefined,
      updatedAt: undefined,
      createdAt: undefined,
    });

    expect(resolveLastActivityAt(deal)).toEqual(new Date(0));
  });

  it('parses string dates', () => {
    const deal = makeDeal({
      lastActivityAt: '2025-06-10T10:00:00Z',
    });

    const result = resolveLastActivityAt(deal);
    expect(result).toBeInstanceOf(Date);
    expect(result.toISOString()).toBe('2025-06-10T10:00:00.000Z');
  });
});

// ---------------------------------------------------------------------------
// nextFollowUpNumber
// ---------------------------------------------------------------------------

describe('nextFollowUpNumber', () => {
  it('returns 1 for a proposal-sent deal with no chase info', () => {
    const deal = makeDeal({ stage: 'proposal-sent' });
    expect(nextFollowUpNumber(deal)).toBe(1);
  });

  it('returns 2 when deal is at follow-up-1 stage', () => {
    const deal = makeDeal({ stage: 'follow-up-1' });
    expect(nextFollowUpNumber(deal)).toBe(2);
  });

  it('returns 3 when deal is at follow-up-2 stage', () => {
    const deal = makeDeal({ stage: 'follow-up-2' });
    expect(nextFollowUpNumber(deal)).toBe(3);
  });

  it('uses explicit followUpCount from chase metadata', () => {
    const deal = makeDeal({ chase: { followUpCount: 1 } });
    expect(nextFollowUpNumber(deal)).toBe(2);
  });

  it('clamps followUpCount of 0 to return 1', () => {
    const deal = makeDeal({ chase: { followUpCount: 0 } });
    expect(nextFollowUpNumber(deal)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// stageAfterFollowUp
// ---------------------------------------------------------------------------

describe('stageAfterFollowUp', () => {
  it('returns follow-up-1 for first follow-up', () => {
    expect(stageAfterFollowUp(1)).toBe('follow-up-1');
  });

  it('returns follow-up-2 for second follow-up', () => {
    expect(stageAfterFollowUp(2)).toBe('follow-up-2');
  });

  it('returns closed-lost for third follow-up', () => {
    expect(stageAfterFollowUp(3)).toBe('closed-lost');
  });
});

// ---------------------------------------------------------------------------
// draftFollowUp
// ---------------------------------------------------------------------------

describe('draftFollowUp', () => {
  const stalledDeal = makeStalledDeal();

  it('generates a follow-up email via LLM', async () => {
    const llm = makeMockLLM({
      subject: 'Following up on Acme proposal',
      body: 'Hi Jane, just checking in on the proposal.',
      rationale: 'No response in 7 days',
      callToAction: 'Would a quick call help?',
    });

    const draft = await draftFollowUp({
      stalledDeal,
      llm,
      now: NOW,
    });

    expect(draft.subject).toContain('Following up');
    expect(draft.body).toContain('Jane');
    expect(draft.to).toEqual(['jane@acme.com']);
    expect(draft.followUpNumber).toBe(1);
    expect(draft.tone).toBe('gentle_check_in');
    expect(draft.metadata.source).toBe('llm');
    expect(draft.metadata.dealId).toBe('deal-1');
    expect(draft.metadata.daysSinceActivity).toBe(7);
  });

  it('falls back to deterministic draft when LLM throws', async () => {
    const llm: TextGenerationClient = {
      generateJson: vi.fn().mockRejectedValue(new Error('API down')),
    };

    const draft = await draftFollowUp({
      stalledDeal,
      llm,
      now: NOW,
    });

    expect(draft.metadata.source).toBe('fallback');
    expect(draft.to).toEqual(['jane@acme.com']);
    expect(draft.body).toContain('Jane');
    expect(draft.followUpNumber).toBe(1);
  });

  it('falls back when LLM returns empty body', async () => {
    const llm = makeMockLLM({ subject: 'Test', body: '' });

    const draft = await draftFollowUp({
      stalledDeal,
      llm,
      now: NOW,
    });

    expect(draft.metadata.source).toBe('fallback');
    expect(draft.body).toBeTruthy();
  });

  it('uses different tones for different follow-up numbers', async () => {
    const llmResponse = {
      subject: 'Follow up',
      body: 'Some body text here.',
      rationale: 'No response',
      callToAction: 'Let me know',
    };

    // Follow-up 1 -> gentle_check_in
    const draft1 = await draftFollowUp({
      stalledDeal: makeStalledDeal({ followUpNumber: 1 }),
      llm: makeMockLLM(llmResponse),
      now: NOW,
    });
    expect(draft1.tone).toBe('gentle_check_in');

    // Follow-up 2 -> value_add
    const draft2 = await draftFollowUp({
      stalledDeal: makeStalledDeal({ followUpNumber: 2 }),
      llm: makeMockLLM(llmResponse),
      now: NOW,
    });
    expect(draft2.tone).toBe('value_add');

    // Follow-up 3 -> closing_the_loop
    const draft3 = await draftFollowUp({
      stalledDeal: makeStalledDeal({ followUpNumber: 3 }),
      llm: makeMockLLM(llmResponse),
      now: NOW,
    });
    expect(draft3.tone).toBe('closing_the_loop');
  });

  it('includes threadId and inReplyToMessageId from previous email', async () => {
    const dealWithThread = makeDeal({ threadId: 'thread-xyz' });
    const stalled = makeStalledDeal({ deal: dealWithThread });

    const draft = await draftFollowUp({
      stalledDeal: stalled,
      previousEmail: { id: 'msg-prev', subject: 'Original subject', body: 'Original body' },
      llm: makeMockLLM({
        subject: 'Re: Original subject',
        body: 'Checking in on the original topic.',
        rationale: 'Stale deal',
        callToAction: 'Any thoughts?',
      }),
      now: NOW,
    });

    expect(draft.threadId).toBe('thread-xyz');
    expect(draft.inReplyToMessageId).toBe('msg-prev');
    expect(draft.metadata.previousSubject).toBe('Original subject');
  });

  it('produces different fallback body text for follow-up 1 vs 2 vs 3', async () => {
    // No LLM -> fallback path
    const input1: FollowUpDraftInput = {
      stalledDeal: makeStalledDeal({ followUpNumber: 1 }),
      now: NOW,
    };
    const input2: FollowUpDraftInput = {
      stalledDeal: makeStalledDeal({ followUpNumber: 2 }),
      now: NOW,
    };
    const input3: FollowUpDraftInput = {
      stalledDeal: makeStalledDeal({ followUpNumber: 3 as FollowUpNumber }),
      now: NOW,
    };

    const [draft1, draft2, draft3] = await Promise.all([
      draftFollowUp(input1),
      draftFollowUp(input2),
      draftFollowUp(input3),
    ]);

    // Each follow-up number should produce distinct body text
    expect(draft1.body).not.toBe(draft2.body);
    expect(draft2.body).not.toBe(draft3.body);
    expect(draft1.body).not.toBe(draft3.body);

    // Follow-up 1: gentle check-in
    expect(draft1.body).toContain('check');
    // Follow-up 2: value add
    expect(draft2.body).toContain('trimmed');
    // Follow-up 3: closing the loop
    expect(draft3.body).toContain('pause');
  });

  it('sets generatedAt timestamp in metadata', async () => {
    const draft = await draftFollowUp({
      stalledDeal,
      now: NOW,
    });

    expect(draft.metadata.generatedAt).toBe(NOW.toISOString());
  });
});
