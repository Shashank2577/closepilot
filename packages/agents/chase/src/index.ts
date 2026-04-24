import { CronJob } from 'cron';
import { DealStoreClient } from '@closepilot/mcp-client';
import type { ChaseEmailMessage, ChaseDeal, ChaseDealResult, ChaseSweepResult, ChaseThread, StageRecommendation } from './types.js';
import { DEFAULT_ACTIVE_CHASE_STAGES, detectStalledDeals, stageAfterFollowUp } from './stall-detector.js';
import { draftFollowUp, type TextGenerationClient } from './followup-drafter.js';
import { detectReplySignals } from './reply-detector.js';
import { getThread, markDealPendingApproval, queryDealsByStage } from './mcp.js';

export interface ChaseAgentConfig {
  mcpServerCommand?: string;
  mcpClient?: DealStoreClient;
  llm?: TextGenerationClient;
  stallThresholdDays?: number;
  maxFollowUps?: 1 | 2 | 3;
  stagesToScan?: string[];
  approverEmail?: string;
  updateDealApprovalStatus?: boolean;
  now?: () => Date;
}

export interface StartChaseAgentConfig extends ChaseAgentConfig {
  cronExpression?: string;
  timezone?: string;
}

export class ChaseAgent {
  private readonly client: DealStoreClient;
  private readonly ownsClient: boolean;
  private readonly llm?: TextGenerationClient;
  private readonly stallThresholdDays: number;
  private readonly maxFollowUps: 1 | 2 | 3;
  private readonly stagesToScan: string[];
  private readonly approverEmail?: string;
  private readonly updateDealApprovalStatus: boolean;
  private readonly now: () => Date;

  constructor(config: ChaseAgentConfig = {}) {
    this.client = config.mcpClient ?? new DealStoreClient(config.mcpServerCommand);
    this.ownsClient = !config.mcpClient;
    this.llm = config.llm;
    this.stallThresholdDays = config.stallThresholdDays ?? 5;
    this.maxFollowUps = config.maxFollowUps ?? 3;
    this.stagesToScan = config.stagesToScan ?? DEFAULT_ACTIVE_CHASE_STAGES;
    this.approverEmail = config.approverEmail;
    this.updateDealApprovalStatus = config.updateDealApprovalStatus ?? false;
    this.now = config.now ?? (() => new Date());
  }

  async runDailySweep(inputDeals?: ChaseDeal[]): Promise<ChaseSweepResult> {
    const startedAt = this.now();
    const errors: string[] = [];
    const deals = inputDeals ?? (await this.loadActiveDeals(errors));
    const results: ChaseDealResult[] = [];

    for (const deal of dedupeDeals(deals)) {
      try {
        results.push(await this.processDeal(deal));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown chase processing error';
        errors.push(`Deal ${deal.id}: ${message}`);
        results.push({
          dealId: String(deal.id),
          replySignals: [],
          errors: [message],
        });
      }
    }

    const completedAt = this.now();
    return {
      startedAt,
      completedAt,
      scannedDeals: deals.length,
      stalledDeals: results.flatMap((result) => (result.stale ? [result.stale] : [])),
      drafts: results.flatMap((result) => (result.draft ? [result.draft] : [])),
      approvalRequests: results.flatMap((result) => (result.approvalRequest ? [result.approvalRequest] : [])),
      replySignals: results.flatMap((result) => result.replySignals),
      stageRecommendations: results.flatMap((result) =>
        result.stageRecommendation ? [result.stageRecommendation] : []
      ),
      results,
      errors,
    };
  }

  async processDeal(deal: ChaseDeal): Promise<ChaseDealResult> {
    const thread = await this.loadThread(deal);
    const replySignals = detectReplySignals(deal, thread, { now: this.now() });
    const strongestReply = replySignals[0];

    if (strongestReply?.recommendedStage) {
      return {
        dealId: String(deal.id),
        replySignals,
        stageRecommendation: {
          dealId: String(deal.id),
          currentStage: deal.stage,
          recommendedStage: strongestReply.recommendedStage,
          reason: `Lead replied with intent "${strongestReply.intent}".`,
          confidence: strongestReply.confidence,
        },
      };
    }

    const [stale] = detectStalledDeals([deal], {
      stallThresholdDays: this.stallThresholdDays,
      maxFollowUps: this.maxFollowUps,
      activeStages: this.stagesToScan,
      now: this.now(),
    });

    if (!stale) {
      return {
        dealId: String(deal.id),
        replySignals,
        skippedReason: 'Deal is not stale enough for follow-up.',
      };
    }

    const previousEmail = findPreviousEmail(deal, thread);
    const draft = await draftFollowUp({
      stalledDeal: stale,
      previousEmail,
      llm: this.llm,
      now: this.now(),
    });

    const suggestedStage = stageAfterFollowUp(stale.followUpNumber);
    const approvalRequest = {
      dealId: String(deal.id),
      itemType: 'follow-up-email' as const,
      itemId: `chase-${deal.id}-follow-up-${stale.followUpNumber}-${this.now().getTime()}`,
      approverEmail: this.approverEmail,
      requestComment: `Review follow-up #${stale.followUpNumber} for ${deal.leadCompany || deal.leadName}.`,
      draft,
      suggestedStage,
    };

    if (this.updateDealApprovalStatus) {
      await this.ensureConnected();
      await markDealPendingApproval(this.client, String(deal.id));
    }

    return {
      dealId: String(deal.id),
      stale,
      draft,
      approvalRequest,
      replySignals,
      stageRecommendation: {
        dealId: String(deal.id),
        currentStage: deal.stage,
        recommendedStage: suggestedStage,
        reason: `Follow-up #${stale.followUpNumber} drafted for approval.`,
        confidence: 0.82,
      },
    };
  }

  async close(): Promise<void> {
    if (this.ownsClient && this.client.isConnected()) {
      await this.client.disconnect();
    }
  }

  private async loadActiveDeals(errors: string[]): Promise<ChaseDeal[]> {
    await this.ensureConnected();
    const deals: ChaseDeal[] = [];

    for (const stage of this.stagesToScan) {
      try {
        deals.push(...(await queryDealsByStage(this.client, stage)));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown MCP error';
        errors.push(`Failed to query ${stage} deals: ${message}`);
      }
    }

    return deals;
  }

  private async loadThread(deal: ChaseDeal): Promise<ChaseThread | null> {
    if (!deal.threadId) return null;
    await this.ensureConnected();
    return getThread(this.client, deal.threadId);
  }

  private async ensureConnected(): Promise<void> {
    if (!this.client.isConnected()) {
      await this.client.connect();
    }
  }
}

export function startChaseAgent(config: StartChaseAgentConfig = {}): CronJob {
  const cronExpression = config.cronExpression ?? '0 8 * * *';
  const timezone = config.timezone ?? 'America/New_York';
  const job = new CronJob(
    cronExpression,
    async () => {
      const agent = new ChaseAgent(config);
      try {
        const result = await agent.runDailySweep();
        console.log(
          `[ChaseAgent] scanned=${result.scannedDeals} stalled=${result.stalledDeals.length} drafts=${result.drafts.length} replies=${result.replySignals.length}`
        );
        if (result.errors.length > 0) {
          console.warn('[ChaseAgent] sweep completed with errors:', result.errors);
        }
      } finally {
        await agent.close();
      }
    },
    null,
    true,
    timezone
  );

  return job;
}

export async function main(): Promise<void> {
  startChaseAgent({
    stallThresholdDays: parseInt(process.env.CHASE_STALL_THRESHOLD_DAYS || '5', 10),
    approverEmail: process.env.CHASE_APPROVER_EMAIL,
    updateDealApprovalStatus: process.env.CHASE_MARK_PENDING_APPROVAL === 'true',
    cronExpression: process.env.CHASE_CRON || '0 8 * * *',
    timezone: process.env.CHASE_TIMEZONE || 'America/New_York',
  });

  console.log('Closepilot Chase Agent started');
}

function dedupeDeals(deals: ChaseDeal[]): ChaseDeal[] {
  const byId = new Map<string, ChaseDeal>();
  for (const deal of deals) byId.set(String(deal.id), deal);
  return [...byId.values()];
}

function findPreviousEmail(
  deal: ChaseDeal,
  thread: ChaseThread | null
): Pick<ChaseEmailMessage, 'subject' | 'body'> & { id?: string } | undefined {
  if (!thread?.messages?.length) {
    return deal.proposalDocumentId
      ? {
          subject: 'Following up on your proposal',
          body: `Proposal document: ${deal.proposalDocumentId}`,
        }
      : undefined;
  }

  const leadEmail = deal.leadEmail.toLowerCase();
  const sorted = [...thread.messages].sort(
    (a, b) => parseEmailDate(b.timestamp).getTime() - parseEmailDate(a.timestamp).getTime()
  );
  const outbound = sorted.find((message) => message.from.email.toLowerCase() !== leadEmail);
  const fallback = sorted[0];
  const selected = outbound ?? fallback;

  return {
    id: selected.id,
    subject: selected.subject,
    body: selected.body,
  };
}

function parseEmailDate(value: Date | string): Date {
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Failed to start Chase Agent:', error);
    process.exit(1);
  });
}

export * from './types.js';
export * from './stall-detector.js';
export * from './followup-drafter.js';
export * from './reply-detector.js';
