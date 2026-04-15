import type {
  Deal,
  DealStage,
  AgentInput,
  AgentOutput,
  ProposalContext,
  Proposal,
} from '@closepilot/core';
import { DealStoreClient } from '@closepilot/mcp-client';
import { DealStoreTools } from '@closepilot/mcp-client';
import { DriveTools } from '@closepilot/mcp-client';
import { ContentGenerator } from './content-generator.js';
import { selectTemplate, type ProposalTemplate } from './template-selector.js';
import { calculatePricing, estimateTimeline, type PricingStrategy } from './pricing-strategy.js';
import { findMatchingCaseStudies, generateCaseStudiesSection } from './case-study-matcher.js';

/**
 * Proposal Agent configuration
 */
export interface ProposalAgentConfig {
  mcpServerUrl: string;
  anthropicApiKey: string;
  pricingStrategy?: PricingStrategy;
  includeCaseStudies?: boolean;
  approvalThreshold?: number; // Amount above which approval is required
}

/**
 * Proposal Agent for generating B2B proposals
 */
export class ProposalAgent {
  private client: DealStoreClient;
  private dealTools: DealStoreTools;
  private driveTools: DriveTools;
  private config: Required<ProposalAgentConfig>;

  constructor(config: ProposalAgentConfig) {
    this.client = new DealStoreClient();
    this.dealTools = new DealStoreTools(this.client);
    this.driveTools = new DriveTools(this.client);
    this.config = {
      mcpServerUrl: config.mcpServerUrl,
      anthropicApiKey: config.anthropicApiKey,
      pricingStrategy: config.pricingStrategy || 'standard',
      includeCaseStudies: config.includeCaseStudies ?? true,
      approvalThreshold: config.approvalThreshold || 50000,
    };
  }

  /**
   * Process a deal and generate proposal
   */
  async process(input: AgentInput<ProposalContext>): Promise<AgentOutput<Proposal>> {
    const startTime = Date.now();
    const executionId = `proposal-${input.dealId}-${Date.now()}`;

    try {
      // Validate deal is in proposal stage
      if (input.deal.stage !== 'proposal') {
        throw new Error(`Deal must be in proposal stage, current stage: ${input.deal.stage}`);
      }

      // Validate project scope exists
      if (!input.deal.projectScope) {
        throw new Error('Deal must have project scope to generate proposal');
      }

      // Extract context
      const context = input.context || {
        pricingStrategy: this.config.pricingStrategy,
        includeCaseStudies: this.config.includeCaseStudies,
      };

      // Step 1: Select template based on project scope
      const template = selectTemplate(input.deal.projectScope);
      console.log(`[Proposal Agent] Selected template: ${template.name}`);

      // Step 2: Calculate pricing
      const pricing = calculatePricing(
        input.deal.projectScope,
        context.pricingStrategy,
        context.timelineInWeeks
      );
      console.log(`[Proposal Agent] Calculated pricing: ${pricing.currency} ${pricing.total}`);

      // Step 3: Estimate timeline if not provided
      const estimatedTimeline = context.timelineInWeeks || estimateTimeline(input.deal.projectScope);

      // Step 4: Find matching case studies (if enabled)
      let caseStudies: string[] | undefined;
      if (context.includeCaseStudies) {
        const pastDeals = await this.dealTools.queryDealsByStage('completed' as DealStage);
        const matched = await findMatchingCaseStudies(input.deal.projectScope, pastDeals, 3);
        if (matched.length > 0) {
          caseStudies = matched.map(cs => formatCaseStudyForPrompt(cs));
          console.log(`[Proposal Agent] Found ${matched.length} matching case studies`);
        }
      }

      // Step 5: Generate proposal content using Claude
      const contentGenerator = new ContentGenerator({
        apiKey: this.config.anthropicApiKey,
      });
      const proposal = await contentGenerator.generateProposal(
        input.deal,
        input.deal.projectScope,
        pricing,
        template,
        caseStudies
      );
      console.log(`[Proposal Agent] Generated proposal content`);

      // Step 6: Generate document using Drive tools
      const documentRequest = {
        templateId: template.templateId,
        dealId: input.dealId,
        values: {
          title: proposal.title,
          executiveSummary: proposal.executiveSummary,
          scope: proposal.scope,
          timeline: proposal.timeline,
          pricing: proposal.pricing,
          terms: proposal.terms,
          nextSteps: proposal.nextSteps,
        },
        outputFormat: 'doc' as const,
      };
      const documentResult = await this.driveTools.generateDocument(documentRequest);
      console.log(`[Proposal Agent] Generated document: ${documentResult.documentId}`);

      // Step 7: Update deal with proposal and document ID
      await this.dealTools.updateDeal(input.dealId, {
        proposal: proposal,
        proposalDocumentId: documentResult.documentId,
      });

      // Step 8: Check if approval is required
      const requiresApproval = pricing.total >= this.config.approvalThreshold;
      const approvalReason = requiresApproval
        ? `Proposal amount (${pricing.currency} ${pricing.total}) exceeds approval threshold ($${this.config.approvalThreshold})`
        : undefined;

      // Step 9: Determine next stage
      let nextStage: DealStage;
      if (requiresApproval) {
        nextStage = 'proposal' as DealStage; // Stay in proposal stage awaiting approval
      } else {
        nextStage = 'crm_sync' as DealStage; // Proceed to CRM sync
      }

      const duration = Date.now() - startTime;

      return {
        dealId: input.dealId,
        success: true,
        data: proposal,
        nextStage,
        requiresApproval,
        approvalReason,
        metadata: {
          agentType: 'proposal',
          executionId,
          startedAt: new Date(startTime),
          completedAt: new Date(),
          duration,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        dealId: input.dealId,
        success: false,
        errors: [errorMessage],
        requiresApproval: false,
        metadata: {
          agentType: 'proposal',
          executionId,
          startedAt: new Date(startTime),
          completedAt: new Date(),
          duration,
        },
      };
    }
  }

  /**
   * Format proposal as document content
   */
  private formatProposalAsDocument(proposal: Proposal): string {
    let content = '';

    content += `# ${proposal.title}\n\n`;
    content += `## Executive Summary\n\n${proposal.executiveSummary}\n\n`;
    content += `## Scope of Work\n\n${proposal.scope}\n\n`;
    content += `## Timeline\n\n${proposal.timeline}\n\n`;

    // Format pricing
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: proposal.pricing.currency,
    });

    content += `## Investment\n\n`;
    content += `**Total**: ${formatter.format(proposal.pricing.total)}\n\n`;
    content += `### Breakdown\n\n`;
    for (const item of proposal.pricing.breakdown) {
      content += `- **${item.service}**: ${formatter.format(item.amount)}`;
      if (item.description) {
        content += ` - ${item.description}`;
      }
      content += '\n';
    }
    content += '\n';

    if (proposal.pricing.paymentSchedule) {
      content += `**Payment Schedule**: ${proposal.pricing.paymentSchedule}\n\n`;
    }

    content += `## Terms & Conditions\n\n`;
    for (const term of proposal.terms) {
      content += `${term}\n`;
    }
    content += '\n';

    content += `## Next Steps\n\n`;
    for (const step of proposal.nextSteps) {
      content += `${step}\n`;
    }

    return content;
  }
}

/**
 * Create proposal agent instance
 */
export function createProposalAgent(config: ProposalAgentConfig): ProposalAgent {
  return new ProposalAgent(config);
}

// Export types
export type { ProposalTemplate } from './template-selector.js';
export { selectTemplate, listTemplates } from './template-selector.js';
export { calculatePricing, estimateTimeline } from './pricing-strategy.js';
export { findMatchingCaseStudies } from './case-study-matcher.js';
export { ContentGenerator } from './content-generator.js';
