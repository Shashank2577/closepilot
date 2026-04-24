import type { ChaseDeal, FollowUpNumber, StalledDeal } from './types.js';

export const DEFAULT_ACTIVE_CHASE_STAGES = [
  'proposal',
  'proposal-sent',
  'follow-up-1',
  'follow-up-2',
];

export interface StallDetectionOptions {
  stallThresholdDays?: number;
  maxFollowUps?: FollowUpNumber;
  activeStages?: string[];
  now?: Date;
}

export function detectStalledDeals(
  deals: ChaseDeal[],
  options: StallDetectionOptions = {}
): StalledDeal[] {
  const now = options.now ?? new Date();
  const thresholdDays = options.stallThresholdDays ?? 5;
  const maxFollowUps = options.maxFollowUps ?? 3;
  const activeStages = new Set(options.activeStages ?? DEFAULT_ACTIVE_CHASE_STAGES);

  return deals
    .filter((deal) => activeStages.has(String(deal.stage)))
    .filter((deal) => deal.approvalStatus !== 'pending')
    .map((deal) => {
      const lastActivityAt = resolveLastActivityAt(deal);
      const daysSinceActivity = daysBetween(lastActivityAt, now);
      return { deal, lastActivityAt, daysSinceActivity };
    })
    .filter(({ daysSinceActivity }) => daysSinceActivity >= thresholdDays)
    .map(({ deal, lastActivityAt, daysSinceActivity }) => {
      const followUpNumber = nextFollowUpNumber(deal);
      if (followUpNumber > maxFollowUps) return undefined;

      return {
        deal,
        daysSinceActivity,
        lastActivityAt,
        followUpNumber,
        reason:
          String(deal.stage) === 'proposal' || String(deal.stage) === 'proposal-sent'
            ? 'no_activity_after_proposal'
            : 'awaiting_follow_up',
      } satisfies StalledDeal;
    })
    .filter((deal): deal is StalledDeal => Boolean(deal));
}

export function resolveLastActivityAt(deal: ChaseDeal): Date {
  const rawCandidates = [
    deal.lastActivityAt,
    deal.lastContactedAt,
    deal.chase?.lastFollowUpAt,
    deal.proposalSentAt,
    readNestedDate(deal.proposal, 'sentAt'),
    readNestedDate(deal.proposal, 'createdAt'),
    deal.updatedAt,
    deal.createdAt,
  ];

  for (const candidate of rawCandidates) {
    const parsed = parseDate(candidate);
    if (parsed) return parsed;
  }

  return new Date(0);
}

export function nextFollowUpNumber(deal: ChaseDeal): FollowUpNumber {
  const explicitCount = deal.chase?.followUpCount;
  if (typeof explicitCount === 'number' && explicitCount >= 0) {
    return clampFollowUpNumber(explicitCount + 1);
  }

  const stage = String(deal.stage);
  if (stage === 'follow-up-1') return 2;
  if (stage === 'follow-up-2') return 3;
  return 1;
}

export function stageAfterFollowUp(followUpNumber: FollowUpNumber): 'follow-up-1' | 'follow-up-2' | 'closed-lost' {
  if (followUpNumber === 1) return 'follow-up-1';
  if (followUpNumber === 2) return 'follow-up-2';
  return 'closed-lost';
}

function daysBetween(start: Date, end: Date): number {
  const diffMs = end.getTime() - start.getTime();
  return Math.max(0, Math.floor(diffMs / 86_400_000));
}

function parseDate(value: unknown): Date | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return undefined;
}

function readNestedDate(source: unknown, key: string): unknown {
  if (!source || typeof source !== 'object') return undefined;
  return (source as Record<string, unknown>)[key];
}

function clampFollowUpNumber(value: number): FollowUpNumber {
  if (value <= 1) return 1;
  if (value === 2) return 2;
  return 3;
}
