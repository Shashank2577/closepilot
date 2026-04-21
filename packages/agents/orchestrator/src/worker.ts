import { Worker } from 'bullmq';
import { redisConnection } from './redis.js';
import type { AgentJob } from './jobs.js';
import { AgentType, EnrichmentContext, ProposalContext, CrmSyncContext } from '@closepilot/core';

// Import agents
import { startIngestionAgent } from '@closepilot/agents-ingestion';
import { EnrichmentAgent } from '@closepilot/agent-enrichment';
import { ScopingAgent } from '@closepilot/agent-scoping';
import { ProposalAgent } from 'proposal';
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
        case 'RunIngestion':
          // Ingestion is usually the start, so it might not have a specific dealId yet
          // or it might be triggered by a specific deal/thread.
          await startIngestionAgent({
            anthropicApiKey,
          });
          break;

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

      // After successful agent execution, check for the next stage and enqueue it.
      // This ensures the pipeline continues.
      if (result && result.success && result.nextStage) {
        const nextJobTypeMap: Record<string, any> = {
          'enrichment': 'RunEnrichment',
          'scoping': 'RunScoping',
          'proposal': 'RunProposal',
          'crm_sync': 'RunCRMSync',
        };

        const nextJobType = nextJobTypeMap[result.nextStage];
        if (nextJobType) {
          console.log(`[Worker] Enqueueing next stage: ${nextJobType} for deal ${dealId}`);
          await enqueueAgentJob({
            type: nextJobType,
            dealId,
          });
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
