import { Worker } from 'bullmq';
import { redisConnection } from './redis.js';
import type { AgentJob } from './jobs.js';
import { AgentType, EnrichmentContext, ProposalContext, CrmSyncContext, DealStage } from '@closepilot/core';
import { updateDealStage } from '@closepilot/db';

// Import agents
import { EnrichmentAgent } from '@closepilot/agent-enrichment';
import { OutreachAgent } from '@closepilot/agent-outreach';
import { ScopingAgent } from '@closepilot/agent-scoping';
import { ProposalAgent } from 'proposal';
import { ChaseAgent } from '@closepilot/agent-chase';
import { CRMSyncAgent } from '@closepilot/agent-crm-sync';
import { DealStoreTools, DealStoreClient } from '@closepilot/mcp-client';
import { enqueueAgentJob } from './queue.js';

const worker = new Worker<AgentJob>(
  'agent-tasks',
  async (job) => {
    const { type, dealId } = job.data;
    console.log(`[Worker] Processing job ${job.id} of type ${type} for deal ${dealId}`);

    try {
      const anthropicApiKey = process.env.ANTHROPIC_API_KEY || '';
      const dealStoreClient = new DealStoreClient();
      await dealStoreClient.connect();
      const dealStoreTools = new DealStoreTools(dealStoreClient);

      let result: any;

      switch (type) {
        case 'RunEnrichment': {
          const enrichmentAgent = new EnrichmentAgent();
          const deal = await dealStoreTools.getDeal(dealId);
          if (!deal) throw new Error(`Deal ${dealId} not found`);

          const context: EnrichmentContext = {
            companyResearchDepth: 'basic',
            prospectResearchDepth: 'basic',
            sourcesToCheck: ['linkedin', 'website']
          };

          result = await enrichmentAgent.process({
            dealId,
            deal,
            context
          });
          break;
        }

        case 'RunOutreach': {
          const outreachAgent = new OutreachAgent(dealStoreClient);
          const deal = await dealStoreTools.getDeal(dealId);
          if (!deal) throw new Error(`Deal ${dealId} not found`);
          const outreachResult = await outreachAgent.process({
            dealId,
            orgId: String(job.data.payload?.orgId || ''),
            deal,
          });
          result = {
            success: outreachResult.success,
            data: {
              ...deal,
              approvalStatus: outreachResult.requiresApproval ? 'pending' : deal.approvalStatus,
              outreachSentAt: outreachResult.mode === 'send' ? new Date() : deal.outreachSentAt,
            },
            errors: outreachResult.errors,
            nextStage: outreachResult.suggestedStage,
          };
          break;
        }

        case 'RunScoping': {
          const scopingAgent = new ScopingAgent({
            anthropicApiKey,
          });
          result = await scopingAgent.processDeal(dealId);
          break;
        }

        case 'RunProposal': {
          const proposalAgent = new ProposalAgent();
          const deal = await dealStoreTools.getDeal(dealId);
          if (!deal) throw new Error(`Deal ${dealId} not found`);

          const context: ProposalContext = {
            pricingStrategy: 'standard',
            includeCaseStudies: true
          };

          result = await proposalAgent.process({
            dealId,
            deal,
            context
          });
          break;
        }

        case 'RunChase': {
          const chaseAgent = new ChaseAgent({ mcpClient: dealStoreClient });
          const deal = await dealStoreTools.getDeal(dealId);
          if (!deal) throw new Error(`Deal ${dealId} not found`);
          const chaseResult = await chaseAgent.processDeal(deal as any);
          result = {
            success: !chaseResult.errors?.length,
            data: {
              ...deal,
              approvalStatus: chaseResult.approvalRequest ? 'pending' : deal.approvalStatus,
              followUpCount: chaseResult.stale?.followUpNumber || deal.followUpCount,
              lastFollowUpAt: chaseResult.approvalRequest ? new Date() : deal.lastFollowUpAt,
            },
            errors: chaseResult.errors,
            nextStage: chaseResult.stageRecommendation?.recommendedStage,
          };
          break;
        }

        case 'RunCRMSync': {
          const crmSyncAgent = new CRMSyncAgent(anthropicApiKey, dealStoreTools);
          const context: CrmSyncContext = {
            crmSystem: 'hubspot',
            createContact: true,
            createDeal: true,
            syncFields: ['email', 'name', 'company']
          };
          result = await crmSyncAgent.processDeal(dealId, context);
          break;
        }

        default:
          throw new Error(`Unknown job type: ${type}`);
      }

      if (dealId && result?.success && result.data && typeof result.data === 'object') {
        await dealStoreTools.updateDeal(dealId, result.data).catch((err: unknown) => {
          console.error(`[Worker] Failed to persist agent output for ${dealId}:`, err);
        });
      }

      // Map job type → the stage the deal moves INTO after this job completes
      const stageAfterJob: Record<string, DealStage> = {
        RunEnrichment: DealStage.SCOPING,
        RunOutreach:   DealStage.OUTREACH_SENT,
        RunScoping:    DealStage.PROPOSAL,
        RunProposal:   DealStage.CRM_SYNC,
        RunCRMSync:    DealStage.COMPLETED,
      };

      // Write new stage to DB so the UI reflects progress
      if (dealId && stageAfterJob[type]) {
        await updateDealStage(dealId, stageAfterJob[type], `Completed by ${type} worker`).catch(
          (err: unknown) => console.error(`[Worker] Failed to update deal stage for ${dealId}:`, err)
        );
      }

      // Chase stage advancement uses the agent's dynamic recommendation
      if (type === 'RunChase' && result?.success && result.nextStage) {
        await updateDealStage(
          dealId,
          result.nextStage as DealStage,
          `Chase agent: advancing to ${result.nextStage}`
        ).catch((err: unknown) =>
          console.error(`[Worker] Chase stage update failed for deal ${dealId}:`, err)
        );
      }

      // After successful agent execution, check for the next stage and enqueue it.
      if (result && result.success && result.nextStage) {
        const nextJobTypeMap: Record<string, string> = {
          'enrichment': 'RunEnrichment',
          'qualified': 'RunOutreach',
          'outreach-sent': 'RunOutreach',
          'meeting-booked': 'RunScoping',
          'scoping':    'RunScoping',
          'proposal':   'RunProposal',
          'proposal-sent': 'RunChase',
          'follow-up-1': 'RunChase',
          'follow-up-2': 'RunChase',
          'negotiating': 'RunChase',
          'proposal-revised': 'RunProposal',
          'crm_sync':   'RunCRMSync',
          'closed-won': 'RunCRMSync',
        };

        const nextJobType = nextJobTypeMap[result.nextStage];
        if (nextJobType) {
          console.log(`[Worker] Enqueueing next stage: ${nextJobType} for deal ${dealId}`);
          await enqueueAgentJob({ type: nextJobType as any, dealId });
        }
      }

      console.log(`[Worker] Successfully completed job ${job.id}`);
    } catch (error) {
      console.error(`[Worker] Error processing job ${job.id}:`, error);
      // Re-throw to let BullMQ handle retries
      throw error;
    }
  },
  { connection: redisConnection }
);

worker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} has completed!`);
});

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} has failed with ${err.message}`);
});

console.log('Agent Worker started, listening for tasks...');
