import { DealStage, Proposal } from '@closepilot/core';

/**
 * Valid state transitions in the deal lifecycle
 */
const VALID_TRANSITIONS: Record<DealStage, DealStage[]> = {
  [DealStage.INGESTION]: [DealStage.ENRICHMENT, DealStage.FAILED],
  [DealStage.ENRICHMENT]: [DealStage.QUALIFIED, DealStage.SCOPING, DealStage.FAILED],
  [DealStage.QUALIFIED]: [DealStage.OUTREACH_SENT, DealStage.SCOPING, DealStage.FAILED],
  [DealStage.OUTREACH_SENT]: [DealStage.MEETING_BOOKED, DealStage.FOLLOW_UP_1, DealStage.FAILED],
  [DealStage.MEETING_BOOKED]: [DealStage.SCOPING, DealStage.FAILED],
  [DealStage.SCOPING]: [DealStage.PROPOSAL, DealStage.FAILED],
  [DealStage.PROPOSAL]: [DealStage.PROPOSAL_SENT, DealStage.CRM_SYNC, DealStage.FAILED],
  [DealStage.PROPOSAL_SENT]: [
    DealStage.FOLLOW_UP_1,
    DealStage.NEGOTIATING,
    DealStage.CRM_SYNC,
    DealStage.CLOSED_WON,
    DealStage.CLOSED_LOST,
    DealStage.FAILED,
  ],
  [DealStage.FOLLOW_UP_1]: [DealStage.FOLLOW_UP_2, DealStage.NEGOTIATING, DealStage.CLOSED_WON, DealStage.CLOSED_LOST, DealStage.FAILED],
  [DealStage.FOLLOW_UP_2]: [DealStage.NEGOTIATING, DealStage.STALLED, DealStage.CLOSED_WON, DealStage.CLOSED_LOST, DealStage.FAILED],
  [DealStage.NEGOTIATING]: [DealStage.PROPOSAL_REVISED, DealStage.CLOSED_WON, DealStage.CLOSED_LOST, DealStage.FAILED],
  [DealStage.PROPOSAL_REVISED]: [DealStage.PROPOSAL_SENT, DealStage.CLOSED_WON, DealStage.CLOSED_LOST, DealStage.FAILED],
  [DealStage.CRM_SYNC]: [DealStage.COMPLETED, DealStage.FAILED],
  [DealStage.CLOSED_WON]: [DealStage.CRM_SYNC, DealStage.COMPLETED],
  [DealStage.CLOSED_LOST]: [DealStage.COMPLETED],
  [DealStage.STALLED]: [DealStage.FOLLOW_UP_1, DealStage.FOLLOW_UP_2, DealStage.FAILED],
  [DealStage.COMPLETED]: [],
  [DealStage.FAILED]: [],
};

/**
 * Threshold for proposal approval requirement
 */
const APPROVAL_THRESHOLD = 50000;

/**
 * Maximum retry attempts before marking deal as failed
 */
const MAX_RETRIES = 3;

/**
 * State transition error
 */
export class TransitionError extends Error {
  constructor(
    public fromStage: DealStage,
    public toStage: DealStage,
    message: string
  ) {
    super(message);
    this.name = 'TransitionError';
  }
}

/**
 * Transition validation result
 */
export interface TransitionResult {
  valid: boolean;
  requiresApproval: boolean;
  error?: string;
  canRetry?: boolean;
}

/**
 * State transition metadata
 */
export interface TransitionMetadata {
  fromStage: DealStage;
  toStage: DealStage;
  timestamp: Date;
  reason?: string;
  requiresApproval: boolean;
  retryCount?: number;
}

/**
 * Deal State Machine
 *
 * Manages deal lifecycle state transitions with validation,
 * approval requirements, and retry logic.
 */
export class DealStateMachine {
  /**
   * Validate if a state transition is allowed
   */
  static validateTransition(
    currentStage: DealStage,
    nextStage: DealStage,
    proposal?: Proposal
  ): TransitionResult {
    // Check if transition is valid
    const allowedTransitions = VALID_TRANSITIONS[currentStage];
    if (!allowedTransitions.includes(nextStage)) {
      return {
        valid: false,
        requiresApproval: false,
        error: `Invalid transition from ${currentStage} to ${nextStage}. Valid transitions: ${allowedTransitions.join(', ')}`,
      };
    }

    // Check if proposal over $50k requires approval before CRM sync
    let requiresApproval = false;
    if (nextStage === DealStage.CRM_SYNC && proposal) {
      if (proposal.pricing.total >= APPROVAL_THRESHOLD) {
        requiresApproval = true;
      }
    }

    return {
      valid: true,
      requiresApproval,
    };
  }

  /**
   * Check if a deal can be retried after failure
   */
  static canRetry(retryCount: number): boolean {
    return retryCount < MAX_RETRIES;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  static calculateRetryDelay(retryCount: number): number {
    // Exponential backoff: 2^retryCount * 1000ms, max 30 seconds
    return Math.min(Math.pow(2, retryCount) * 1000, 30000);
  }

  /**
   * Determine next stage after retry
   */
  static getRetryStage(failedStage: DealStage): DealStage {
    // Map failed stages back to their retry starting points
    const retryMap: Record<DealStage, DealStage> = {
      [DealStage.INGESTION]: DealStage.INGESTION,
      [DealStage.ENRICHMENT]: DealStage.ENRICHMENT,
      [DealStage.QUALIFIED]: DealStage.QUALIFIED,
      [DealStage.OUTREACH_SENT]: DealStage.OUTREACH_SENT,
      [DealStage.MEETING_BOOKED]: DealStage.MEETING_BOOKED,
      [DealStage.SCOPING]: DealStage.SCOPING,
      [DealStage.PROPOSAL]: DealStage.PROPOSAL,
      [DealStage.PROPOSAL_SENT]: DealStage.PROPOSAL_SENT,
      [DealStage.FOLLOW_UP_1]: DealStage.FOLLOW_UP_1,
      [DealStage.FOLLOW_UP_2]: DealStage.FOLLOW_UP_2,
      [DealStage.NEGOTIATING]: DealStage.NEGOTIATING,
      [DealStage.PROPOSAL_REVISED]: DealStage.PROPOSAL_REVISED,
      [DealStage.CRM_SYNC]: DealStage.CRM_SYNC,
      [DealStage.CLOSED_WON]: DealStage.CLOSED_WON,
      [DealStage.CLOSED_LOST]: DealStage.CLOSED_LOST,
      [DealStage.STALLED]: DealStage.STALLED,
      [DealStage.COMPLETED]: DealStage.COMPLETED,
      [DealStage.FAILED]: DealStage.FAILED,
    };

    return retryMap[failedStage] || DealStage.INGESTION;
  }

  /**
   * Check if deal has reached final state
   */
  static isFinalStage(stage: DealStage): boolean {
    return stage === DealStage.COMPLETED || stage === DealStage.FAILED;
  }

  /**
   * Get all valid next stages for current stage
   */
  static getNextStages(currentStage: DealStage): DealStage[] {
    return VALID_TRANSITIONS[currentStage] || [];
  }

  /**
   * Create transition metadata
   */
  static createTransitionMetadata(
    fromStage: DealStage,
    toStage: DealStage,
    reason?: string,
    requiresApproval = false,
    retryCount = 0
  ): TransitionMetadata {
    return {
      fromStage,
      toStage,
      timestamp: new Date(),
      reason,
      requiresApproval,
      retryCount,
    };
  }

  /**
   * Validate approval requirement
   */
  static checkApprovalRequirement(
    proposal?: Proposal
  ): { required: boolean; reason?: string } {
    if (!proposal) {
      return { required: false };
    }

    if (proposal.pricing.total >= APPROVAL_THRESHOLD) {
      return {
        required: true,
        reason: `Proposal total (${proposal.pricing.total}) exceeds approval threshold (${APPROVAL_THRESHOLD})`,
      };
    }

    return { required: false };
  }

  /**
   * Get human-readable stage name
   */
  static getStageName(stage: DealStage): string {
    const names: Record<DealStage, string> = {
      [DealStage.INGESTION]: 'Ingestion',
      [DealStage.ENRICHMENT]: 'Enrichment',
      [DealStage.QUALIFIED]: 'Qualified',
      [DealStage.OUTREACH_SENT]: 'Outreach Sent',
      [DealStage.MEETING_BOOKED]: 'Meeting Booked',
      [DealStage.SCOPING]: 'Scoping',
      [DealStage.PROPOSAL]: 'Proposal',
      [DealStage.PROPOSAL_SENT]: 'Proposal Sent',
      [DealStage.FOLLOW_UP_1]: 'Follow-up 1',
      [DealStage.FOLLOW_UP_2]: 'Follow-up 2',
      [DealStage.NEGOTIATING]: 'Negotiating',
      [DealStage.PROPOSAL_REVISED]: 'Proposal Revised',
      [DealStage.CRM_SYNC]: 'CRM Sync',
      [DealStage.CLOSED_WON]: 'Closed Won',
      [DealStage.CLOSED_LOST]: 'Closed Lost',
      [DealStage.STALLED]: 'Stalled',
      [DealStage.COMPLETED]: 'Completed',
      [DealStage.FAILED]: 'Failed',
    };
    return names[stage] || stage;
  }

  /**
   * Get stage description
   */
  static getStageDescription(stage: DealStage): string {
    const descriptions: Record<DealStage, string> = {
      [DealStage.INGESTION]: 'Initial deal ingestion from lead source',
      [DealStage.ENRICHMENT]: 'Company and prospect research',
      [DealStage.QUALIFIED]: 'Lead qualified for outreach or scoping',
      [DealStage.OUTREACH_SENT]: 'Personalized outreach sent, awaiting reply',
      [DealStage.MEETING_BOOKED]: 'Discovery or scoping meeting booked',
      [DealStage.SCOPING]: 'Project scope and requirements gathering',
      [DealStage.PROPOSAL]: 'Proposal generation and pricing',
      [DealStage.PROPOSAL_SENT]: 'Proposal sent, awaiting response',
      [DealStage.FOLLOW_UP_1]: 'First proposal follow-up sent',
      [DealStage.FOLLOW_UP_2]: 'Second proposal follow-up sent',
      [DealStage.NEGOTIATING]: 'Deal in active negotiation',
      [DealStage.PROPOSAL_REVISED]: 'Proposal revised after negotiation',
      [DealStage.CRM_SYNC]: 'Sync to CRM system',
      [DealStage.CLOSED_WON]: 'Deal won',
      [DealStage.CLOSED_LOST]: 'Deal lost',
      [DealStage.STALLED]: 'Deal stalled and needs intervention',
      [DealStage.COMPLETED]: 'Deal successfully completed',
      [DealStage.FAILED]: 'Deal failed after retries',
    };
    return descriptions[stage] || '';
  }
}
