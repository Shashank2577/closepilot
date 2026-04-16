/**
 * Scoping Agent - Main Orchestrator
 *
 * Analyzes email threads for project requirements and defines project scope
 */

import { Anthropic } from '@anthropic-ai/sdk';
import type { Deal, DealStage, Requirement, ProjectScope } from '@closepilot/core';
import { DealStoreClient } from '@closepilot/mcp-client';
import { RequirementExtractor } from './requirement-extractor.js';
import { ScopeDefiner } from './scope-definer.js';
import { ComplexityAnalyzer } from './complexity-analyzer.js';
import { ClarificationGenerator } from './clarification-generator.js';

export interface ScopingAgentConfig {
  anthropicApiKey: string;
  mcpServerUrl?: string;
}

export interface ScopingResult {
  success: boolean;
  deal: Deal;
  clarificationsSent?: boolean;
  errors?: string[];
}

/**
 * Main Scoping Agent class
 *
 * Responsibilities:
 * 1. Receive deal in 'scoping' stage
 * 2. Analyze email threads for project requirements
 * 3. Extract and categorize requirements
 * 4. Define project scope with timeline, budget, complexity
 * 5. Identify assumptions and risks
 * 6. Calculate complexity score
 * 7. Generate clarification email if info missing
 * 8. Update deal with projectScope and requirements
 * 9. Set stage to 'proposal' when complete
 */
export class ScopingAgent {
  private anthropic: Anthropic;
  private mcpClient: DealStoreClient;
  private requirementExtractor: RequirementExtractor;
  private scopeDefiner: ScopeDefiner;
  private complexityAnalyzer: ComplexityAnalyzer;
  private clarificationGenerator: ClarificationGenerator;

  constructor(config: ScopingAgentConfig) {
    this.anthropic = new Anthropic({
      apiKey: config.anthropicApiKey,
    });

    this.mcpClient = new DealStoreClient(config.mcpServerUrl || 'node packages/mcp-server/dist/index.js');

    this.requirementExtractor = new RequirementExtractor(this.anthropic);
    this.scopeDefiner = new ScopeDefiner(this.anthropic);
    this.complexityAnalyzer = new ComplexityAnalyzer();
    this.clarificationGenerator = new ClarificationGenerator(this.anthropic);
  }

  /**
   * Process a deal through scoping
   */
  async processDeal(dealId: string): Promise<ScopingResult> {
    try {
      // Step 1: Fetch the deal
      const deal = await this.mcpClient.callTool('get_deal', { dealId });
      if (!deal || !deal.content) {
        throw new Error(`Deal ${dealId} not found`);
      }

      const dealData = deal.content as Deal;

      // Step 2: Verify deal is in scoping stage
      if (dealData.stage !== 'scoping') {
        throw new Error(
          `Deal ${dealId} is in ${dealData.stage} stage, expected 'scoping'`
        );
      }

      // Step 3: Fetch email thread for analysis
      const threadId = dealData.threadId;
      if (!threadId) {
        throw new Error(`Deal ${dealId} has no associated email thread`);
      }

      const thread = await this.mcpClient.callTool('get_thread', { threadId });
      if (!thread || !thread.content) {
        throw new Error(`Thread ${threadId} not found`);
      }

      const emailContent = this.extractEmailText(thread.content);

      // Step 4: Extract requirements
      const requirements = await this.requirementExtractor.extract(emailContent);

      // Step 5: Analyze if we need clarifications
      const missingInfo = this.identifyMissingInfo(requirements);
      let clarificationsSent = false;

      if (missingInfo.length > 0) {
        // Generate and send clarification email
        const clarificationEmail =
          await this.clarificationGenerator.generate(dealData, missingInfo);

        await this.mcpClient.callTool('send_email', {
          to: [dealData.leadEmail],
          subject: clarificationEmail.subject,
          body: clarificationEmail.body,
          threadId: threadId,
        });

        clarificationsSent = true;

        // Update deal with partial requirements
        await this.mcpClient.callTool('update_deal', {
          dealId,
          updates: {
            requirements: requirements.map((r) => ({
              ...r,
              status: missingInfo.includes(r.category) ? 'identified' : 'confirmed',
            })),
          },
        });

        return {
          success: true,
          deal: dealData,
          clarificationsSent,
        };
      }

      // Step 6: Define project scope
      const scope = await this.scopeDefiner.define(requirements, emailContent);

      // Step 7: Calculate complexity score
      const complexity = this.complexityAnalyzer.calculate(requirements, scope);

      // Step 8: Update deal with complete scope
      const updatedDeal = await this.mcpClient.callTool('update_deal', {
        dealId,
        updates: {
          requirements: requirements.map((r) => ({
            ...r,
            status: 'confirmed' as const,
          })),
          projectScope: {
            ...scope,
            complexity: complexity,
          },
          stage: 'proposal' as DealStage,
        },
      });

      return {
        success: true,
        deal: updatedDeal.content as Deal,
        clarificationsSent: false,
      };
    } catch (error) {
      return {
        success: false,
        deal: {} as Deal,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Process all deals in scoping stage
   */
  async processPendingDeals(): Promise<ScopingResult[]> {
    const response = await this.mcpClient.callTool('query_deals_by_stage', {
      stage: 'scoping',
    });

    const deals = response.content as Deal[];
    const results: ScopingResult[] = [];

    for (const deal of deals) {
      const result = await this.processDeal(deal.id);
      results.push(result);
    }

    return results;
  }

  /**
   * Extract plain text from email thread
   */
  private extractEmailText(thread: any): string {
    if (typeof thread === 'string') return thread;

    if (thread.messages && Array.isArray(thread.messages)) {
      return thread.messages
        .map((msg: any) => {
          if (typeof msg === 'string') return msg;
          return msg.body || msg.content || msg.text || '';
        })
        .join('\n\n');
    }

    return thread.body || thread.content || thread.text || '';
  }

  /**
   * Identify missing information that requires clarification
   */
  private identifyMissingInfo(requirements: Requirement[]): string[] {
    const missing: string[] = [];

    // Check for timeline requirements
    const timelineReqs = requirements.filter((r) => r.category === 'timeline');
    if (timelineReqs.length === 0 || timelineReqs.every((r) => r.priority === 'low')) {
      missing.push('timeline');
    }

    // Check for budget requirements
    const budgetReqs = requirements.filter((r) => r.category === 'budget');
    if (budgetReqs.length === 0) {
      missing.push('budget');
    }

    // Check for technical requirements ambiguity
    const techReqs = requirements.filter((r) => r.category === 'technical');
    if (techReqs.some((r) => r.description.length < 50)) {
      missing.push('technical_details');
    }

    return missing;
  }
}

export * from './requirement-extractor.js';
export * from './scope-definer.js';
export * from './complexity-analyzer.js';
export * from './clarification-generator.js';
