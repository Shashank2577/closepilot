import { AgentInput, AgentOutput, Deal, ProposalContext, Proposal, DealStage } from '@closepilot/core';
import { findSimilarProjects } from '@closepilot/db';
import { DealStoreClient, DriveTools } from '@closepilot/mcp-client';
import { matchCaseStudies } from './case-study-matcher';
import { calculatePricing, PricingStrategyType } from './pricing-strategy';
import { selectTemplate } from './template-selector';
import { generateContent } from './content-generator';

export class ProposalAgent {
  constructor(private mcpServerCommand?: string) {}

  async process(input: AgentInput<ProposalContext>): Promise<AgentOutput<Deal>> {
    const { deal, context } = input;
    const startMs = Date.now();

    if (!deal.projectScope) {
      return {
        dealId: deal.id,
        success: false,
        errors: ['Deal does not have a defined project scope. Cannot generate proposal.'],
        requiresApproval: false,
        durationMs: Date.now() - startMs,
      };
    }

    try {
      const scope = deal.projectScope;
      const services = scope.services || [];
      const complexity = scope.complexity || 'medium';

      // 1. Select Template
      const templateId = context.templateId || selectTemplate(services, complexity);

      // 2. Calculate Pricing
      const pricingStrategy = (context.pricingStrategy as PricingStrategyType) || 'standard';
      const similarProjects = await findSimilarProjects(
        deal.leadCompany,
        services[0],
        [scope.title, ...services, ...(deal.requirements || []).map((requirement) => requirement.description)],
        5
      ).catch(() => []);
      const pricing = calculatePricing({
        services,
        requirements: deal.requirements || [],
        complexity,
        strategy: pricingStrategy,
        historicalProjects: similarProjects.map((project: { id: number; name: string; budget: string | null }) => ({
          id: project.id,
          name: project.name,
          budget: project.budget,
        })),
      });

      // 3. Generate Content
      const content = await generateContent(deal, scope);

      // 4. Match Case Studies (Simulated appending to scope or using as metadata)
      const caseStudies = context.includeCaseStudies ? matchCaseStudies(services, complexity) : [];

      // Construct the final Proposal object
      const proposal: Proposal = {
        title: `Proposal: ${scope.title}`,
        executiveSummary: content.executiveSummary,
        scope: content.scope,
        timeline: content.timeline,
        pricing: pricing,
        terms: content.terms,
        nextSteps: content.nextSteps,
      };

      const documentResult = await this.generateProposalDocument(deal, templateId, {
        ...proposal,
        caseStudies,
        coverEmail: content.coverEmail,
      });

      // Update Deal
      const updatedDeal: Deal = {
        ...deal,
        proposal,
        proposalDocumentId: documentResult?.documentId,
        updatedAt: new Date()
      };

      // Determine Routing
      const requiresApproval = pricing.total > 50000;

      return {
        dealId: deal.id,
        success: true,
        data: updatedDeal,
        nextStage: requiresApproval ? undefined : DealStage.CRM_SYNC,
        requiresApproval,
        approvalReason: requiresApproval
          ? `Total pricing ($${pricing.total}) exceeds $50,000 threshold.`
          : documentResult
            ? undefined
            : 'Proposal content generated, but no Google Drive document was created because no proposal template is configured.',
        durationMs: Date.now() - startMs,
      };

    } catch (error: any) {
      return {
        dealId: deal.id,
        success: false,
        errors: [error.message || 'An unknown error occurred during proposal generation.'],
        requiresApproval: false,
        durationMs: Date.now() - startMs,
      };
    }
  }

  private async generateProposalDocument(
    deal: Deal,
    templateId: string,
    values: Record<string, unknown>
  ): Promise<{ documentId: string; driveUrl?: string } | null> {
    const effectiveTemplateId = process.env.PROPOSAL_TEMPLATE_ID || templateId;
    if (!effectiveTemplateId) return null;

    const client = new DealStoreClient(this.mcpServerCommand || process.env.MCP_SERVER_COMMAND);
    await client.connect();
    try {
      const driveTools = new DriveTools(client);
      const result = await driveTools.generateDocument({
        templateId: effectiveTemplateId,
        dealId: deal.id,
        values,
        outputFormat: 'doc',
        createInFolder: process.env.PROPOSALS_FOLDER_ID,
      });
      if (result.status === 'failed') {
        throw new Error(result.errors?.join('; ') || 'Drive document generation failed');
      }
      return {
        documentId: result.documentId,
        driveUrl: result.driveUrl,
      };
    } finally {
      await client.disconnect();
    }
  }
}

// Export a default instance or function for easy use
export const proposalAgent = new ProposalAgent();
