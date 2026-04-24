import type { CompanyResearch, EmailMessage, PricingBreakdown, ProjectScope, ProspectResearch, Thread } from '@closepilot/core';

export type ChaseStage =
  | 'proposal'
  | 'proposal-sent'
  | 'follow-up-1'
  | 'follow-up-2'
  | 'negotiating'
  | 'closed-won'
  | 'closed-lost'
  | 'crm_sync'
  | 'completed'
  | 'failed'
  | string;

export type FollowUpNumber = 1 | 2 | 3;

export interface ChaseDeal {
  id: string | number;
  stage: ChaseStage;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  leadEmail: string;
  leadName: string;
  leadCompany?: string | null;
  leadTitle?: string | null;
  threadId?: string | null;
  initialEmailId?: string | null;
  approvalStatus?: 'pending' | 'approved' | 'rejected' | string | null;
  companyResearch?: CompanyResearch;
  prospectResearch?: ProspectResearch;
  projectScope?: ProjectScope;
  requirements?: unknown[];
  proposal?: unknown;
  proposalDocumentId?: string;
  pricing?: PricingBreakdown;
  crmId?: string;
  crmSyncedAt?: Date | string;
  source?: 'gmail' | 'manual' | 'other' | string;
  assignedAgent?: string;
  proposalSentAt?: Date | string;
  lastActivityAt?: Date | string;
  lastContactedAt?: Date | string;
  chase?: {
    followUpCount?: number;
    lastFollowUpAt?: Date | string;
    lastReplyAt?: Date | string;
  };
  [key: string]: unknown;
}

export interface StalledDeal {
  deal: ChaseDeal;
  daysSinceActivity: number;
  lastActivityAt: Date;
  followUpNumber: FollowUpNumber;
  reason: 'no_activity_after_proposal' | 'awaiting_follow_up';
}

export interface EmailDraft {
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  threadId?: string;
  inReplyToMessageId?: string;
  followUpNumber: FollowUpNumber;
  tone: 'gentle_check_in' | 'value_add' | 'closing_the_loop';
  rationale: string;
  callToAction: string;
  metadata: {
    dealId: string;
    generatedAt: string;
    daysSinceActivity: number;
    previousSubject?: string;
    source: 'llm' | 'fallback';
  };
}

export type ReplyIntent =
  | 'ready_to_proceed'
  | 'meeting_requested'
  | 'question'
  | 'objection'
  | 'not_interested'
  | 'out_of_office'
  | 'neutral';

export interface ReplySignal {
  dealId: string;
  messageId: string;
  threadId: string;
  from: string;
  receivedAt: Date;
  intent: ReplyIntent;
  confidence: number;
  summary: string;
  recommendedStage?: ChaseStage;
  requiresHumanReview: boolean;
}

export interface ApprovalReadyFollowUp {
  dealId: string;
  itemType: 'follow-up-email';
  itemId: string;
  approverEmail?: string;
  requestComment: string;
  draft: EmailDraft;
  suggestedStage: ChaseStage;
}

export interface StageRecommendation {
  dealId: string;
  currentStage: ChaseStage;
  recommendedStage: ChaseStage;
  reason: string;
  confidence: number;
}

export interface ChaseDealResult {
  dealId: string;
  stale?: StalledDeal;
  draft?: EmailDraft;
  approvalRequest?: ApprovalReadyFollowUp;
  replySignals: ReplySignal[];
  stageRecommendation?: StageRecommendation;
  skippedReason?: string;
  errors?: string[];
}

export interface ChaseSweepResult {
  startedAt: Date;
  completedAt: Date;
  scannedDeals: number;
  stalledDeals: StalledDeal[];
  drafts: EmailDraft[];
  approvalRequests: ApprovalReadyFollowUp[];
  replySignals: ReplySignal[];
  stageRecommendations: StageRecommendation[];
  results: ChaseDealResult[];
  errors: string[];
}

export interface ThreadLookup {
  getThread(threadId: string): Promise<Thread | null>;
}

export type ChaseEmailMessage = EmailMessage;
export type ChaseThread = Thread;
