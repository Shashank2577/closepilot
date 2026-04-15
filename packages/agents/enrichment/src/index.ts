/**
 * Enrichment Agent for Closepilot
 *
 * Responsibilities:
 * - Receives deals in 'enrichment' stage
 * - Researches company: industry, size, funding, tech stack, competitors
 * - Researches prospect: LinkedIn, background, decision maker status
 * - Updates deal with research data
 * - Sets deal stage to 'scoping'
 */

import type {
  Deal,
  CompanyResearch,
  ProspectResearch,
  AgentInput,
  AgentOutput,
  AgentType,
} from '@closepilot/core';
import { DealStage } from '@closepilot/core';
import { DealStoreTools, DealStoreClient } from '@closepilot/mcp-client';
import { CompanyResearcher } from './company-researcher.js';
import { ProspectResearcher } from './prospect-researcher.js';
import { ActivityLogger } from './activity-logger.js';

export interface EnrichmentAgentConfig {
  anthropicApiKey: string;
  mcpServerUrl?: string;
  researchDepth?: 'basic' | 'comprehensive';
  enableWebScraping?: boolean;
  enableApis?: boolean;
}

export class EnrichmentAgent {
  private companyResearcher: CompanyResearcher;
  private prospectResearcher: ProspectResearcher;
  private activityLogger: ActivityLogger;
  private dealStoreTools: DealStoreTools;

  constructor(config: EnrichmentAgentConfig) {
    const client = new DealStoreClient(config.mcpServerUrl);
    this.dealStoreTools = new DealStoreTools(client);

    this.companyResearcher = new CompanyResearcher({
      anthropicApiKey: config.anthropicApiKey,
      enableWebScraping: config.enableWebScraping ?? true,
      enableApis: config.enableApis ?? false,
    });

    this.prospectResearcher = new ProspectResearcher({
      anthropicApiKey: config.anthropicApiKey,
      enableWebScraping: config.enableWebScraping ?? true,
      enableApis: config.enableApis ?? false,
    });

    this.activityLogger = new ActivityLogger({
      dealStoreTools: this.dealStoreTools,
    });
  }

  /**
   * Main entry point for enrichment agent
   */
  async processDeal(input: AgentInput): Promise<AgentOutput> {
    const executionId = this.generateExecutionId();
    const startTime = new Date();

    try {
      await this.activityLogger.logStart(input.dealId, executionId, {
        stage: input.deal.stage,
        leadCompany: input.deal.leadCompany,
        leadName: input.deal.leadName,
        leadEmail: input.deal.leadEmail,
      });

      // Validate deal is in enrichment stage
      if (input.deal.stage !== 'enrichment') {
        throw new Error(
          `Deal ${input.dealId} is in stage ${input.deal.stage}, expected 'enrichment'`
        );
      }

      // Research company
      await this.activityLogger.logActivity(
        input.dealId,
        'company_research',
        'started',
        { company: input.deal.leadCompany }
      );

      const companyResearch = await this.companyResearcher.research(
        input.deal.leadCompany || ''
      );

      await this.activityLogger.logActivity(
        input.dealId,
        'company_research',
        'completed',
        {
          companyName: companyResearch.companyName,
          industry: companyResearch.industry,
          size: companyResearch.size,
        }
      );

      // Research prospect
      await this.activityLogger.logActivity(
        input.dealId,
        'prospect_research',
        'started',
        {
          prospect: input.deal.leadName,
          email: input.deal.leadEmail,
        }
      );

      const prospectResearch = await this.prospectResearcher.research({
        name: input.deal.leadName,
        email: input.deal.leadEmail,
        title: input.deal.leadTitle,
        company: input.deal.leadCompany,
      });

      await this.activityLogger.logActivity(
        input.dealId,
        'prospect_research',
        'completed',
        {
          prospect: prospectResearch.name,
          title: prospectResearch.title,
          decisionMaker: prospectResearch.decisionMaker,
          influenceLevel: prospectResearch.influenceLevel,
        }
      );

      // Update deal with research data
      await this.dealStoreTools.updateDeal(input.dealId, {
        companyResearch,
        prospectResearch,
      });

      await this.activityLogger.logActivity(
        input.dealId,
        'deal_update',
        'completed',
        {
          fields: ['companyResearch', 'prospectResearch'],
        }
      );

      // Move deal to scoping stage
      const updatedDeal = await this.dealStoreTools.updateDealStage(
        input.dealId,
        DealStage.SCOPING,
        'Enrichment completed successfully'
      );

      await this.activityLogger.logActivity(
        input.dealId,
        'stage_transition',
        'completed',
        {
          from: 'enrichment',
          to: 'scoping',
        }
      );

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      await this.activityLogger.logComplete(input.dealId, executionId, {
        duration,
        success: true,
        nextStage: 'scoping',
      });

      return {
        dealId: input.dealId,
        success: true,
        data: {
          companyResearch,
          prospectResearch,
        },
        nextStage: DealStage.SCOPING,
        requiresApproval: false,
        metadata: {
          agentType: 'enrichment' as AgentType,
          executionId,
          startedAt: startTime,
          completedAt: endTime,
          duration,
        },
      };
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      await this.activityLogger.logComplete(input.dealId, executionId, {
        duration,
        success: false,
        error: errorMessage,
      });

      return {
        dealId: input.dealId,
        success: false,
        errors: [errorMessage],
        requiresApproval: false,
        metadata: {
          agentType: 'enrichment' as AgentType,
          executionId,
          startedAt: startTime,
          completedAt: endTime,
          duration,
        },
      };
    }
  }

  /**
   * Process multiple deals in batch
   */
  async processBatch(dealIds: string[]): Promise<AgentOutput[]> {
    const results: AgentOutput[] = [];

    for (const dealId of dealIds) {
      const deal = await this.dealStoreTools.getDeal(dealId);
      if (!deal) {
        results.push({
          dealId,
          success: false,
          errors: ['Deal not found'],
          requiresApproval: false,
        });
        continue;
      }

      const result = await this.processDeal({
        dealId,
        deal,
        context: {},
      });
      results.push(result);
    }

    return results;
  }

  private generateExecutionId(): string {
    return `enrichment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export * from './company-researcher.js';
export * from './prospect-researcher.js';
export * from './data-sources.js';
export * from './activity-logger.js';
