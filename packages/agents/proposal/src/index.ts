import { AgentInput, AgentOutput, Deal, ProposalContext, Proposal, DealStage } from '@closepilot/core';
import { matchCaseStudies } from './case-study-matcher';
import { calculatePricing, PricingStrategyType } from './pricing-strategy';
import { selectTemplate } from './template-selector';
import { generateContent } from './content-generator';

export class ProposalAgent {
  async process(input: AgentInput<ProposalContext>): Promise<AgentOutput<Deal>> {
    const { deal, context } = input;

    if (!deal.projectScope) {
      return {
        dealId: deal.id,
        success: false,
        errors: ['Deal does not have a defined project scope. Cannot generate proposal.'],
        requiresApproval: false,
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
      const pricing = calculatePricing(services, complexity, pricingStrategy);

      // 3. Generate Content
      const content = generateContent(deal, scope);

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

      // Mock Drive Document Generation
      // In a real implementation, we would call a Drive service/tool here
      // const docRequest: DocumentGenerationRequest = {
      //   templateId,
      //   dealId: deal.id,
      //   values: { ...proposal, caseStudies },
      //   outputFormat: 'pdf'
      // };
      // const docResult = await mockDriveService.generateDocument(docRequest);

      const mockDocumentId = `doc_${deal.id}_${Date.now()}`;

      // Update Deal
      const updatedDeal: Deal = {
        ...deal,
        proposal,
        proposalDocumentId: mockDocumentId,
        updatedAt: new Date()
      };

      // Determine Routing
      const requiresApproval = pricing.total > 50000;

      return {
        dealId: deal.id,
        success: true,
        data: updatedDeal,
        nextStage: requiresApproval ? undefined : DealStage.CRM_SYNC, // If requires approval, it might stay in PROPOSAL or go to a specific approval stage
        requiresApproval,
        approvalReason: requiresApproval ? `Total pricing ($${pricing.total}) exceeds $50,000 threshold.` : undefined,
      };

    } catch (error: any) {
      return {
        dealId: deal.id,
        success: false,
        errors: [error.message || 'An unknown error occurred during proposal generation.'],
        requiresApproval: false,
      };
    }
  }
}

// Export a default instance or function for easy use
export const proposalAgent = new ProposalAgent();
