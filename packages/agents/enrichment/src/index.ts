import { AgentInput, AgentOutput, DealStage, AgentType, EnrichmentContext } from '@closepilot/core';
import { CompanyResearcher } from './company-researcher';
import { ProspectResearcher } from './prospect-researcher';
import { ActivityLogger } from './activity-logger';
import { scoreICP } from './icp-scorer';

export class EnrichmentAgent {
  private companyResearcher: CompanyResearcher;
  private prospectResearcher: ProspectResearcher;
  public logger: ActivityLogger;

  constructor() {
    this.companyResearcher = new CompanyResearcher();
    this.prospectResearcher = new ProspectResearcher();
    this.logger = new ActivityLogger();
  }

  /**
   * Processes a deal in the enrichment stage.
   */
  async process(input: AgentInput<EnrichmentContext>): Promise<AgentOutput> {
    const { dealId, deal, context } = input;
    const startTime = new Date();

    this.logger.log(dealId, 'Enrichment started', { context });

    try {
      if (deal.stage !== DealStage.ENRICHMENT) {
        throw new Error(`Deal is not in ENRICHMENT stage. Current stage: ${deal.stage}`);
      }

      const errors: string[] = [];

      // 1. Research Company
      if (deal.leadCompany) {
        this.logger.log(dealId, 'Starting company research', { company: deal.leadCompany });
        try {
          const companyResearch = await this.companyResearcher.research(deal.leadCompany);
          deal.companyResearch = companyResearch;
          this.logger.log(dealId, 'Completed company research', companyResearch);
        } catch (error: any) {
          errors.push(`Failed to research company: ${error.message}`);
          this.logger.log(dealId, 'Company research failed', { error: error.message });
        }
      } else {
        this.logger.log(dealId, 'Skipping company research, no company provided');
      }

      // 2. Research Prospect
      this.logger.log(dealId, 'Starting prospect research', { name: deal.leadName, company: deal.leadCompany });
      try {
        const prospectResearch = await this.prospectResearcher.research(
          deal.leadName,
          deal.leadCompany,
          deal.leadTitle,
          JSON.stringify(input.context || {})
        );
        deal.prospectResearch = prospectResearch;
        this.logger.log(dealId, 'Completed prospect research', prospectResearch);
      } catch (error: any) {
        errors.push(`Failed to research prospect: ${error.message}`);
        this.logger.log(dealId, 'Prospect research failed', { error: error.message });
      }

      const success = errors.length === 0;
      const icpScore = scoreICP(deal.companyResearch, deal.prospectResearch);
      (deal as any).icpScore = icpScore;
      this.logger.log(dealId, 'ICP scoring completed', icpScore);

      if (success) {
        // Update stage if successful
        deal.stage = DealStage.SCOPING;
        this.logger.log(dealId, 'Enrichment successful, transitioning to SCOPING');
      }

      const endTime = new Date();

      return {
        dealId,
        success,
        data: deal,
        errors: errors.length > 0 ? errors : undefined,
        nextStage: success ? DealStage.SCOPING : undefined,
        requiresApproval: false,
        durationMs: endTime.getTime() - startTime.getTime(),
        metadata: {
          agentType: AgentType.ENRICHMENT,
          executionId: `enrichment-${Date.now()}`,
          startedAt: startTime,
          completedAt: endTime,
          duration: endTime.getTime() - startTime.getTime(),
        }
      };
    } catch (error: any) {
      this.logger.log(dealId, 'Enrichment critically failed', { error: error.message });

      const endTime = new Date();
      return {
        dealId,
        success: false,
        errors: [error.message],
        requiresApproval: true,
        approvalReason: 'Enrichment failed unexpectedly',
        durationMs: endTime.getTime() - startTime.getTime(),
        metadata: {
          agentType: AgentType.ENRICHMENT,
          executionId: `enrichment-${Date.now()}`,
          startedAt: startTime,
          completedAt: endTime,
          duration: endTime.getTime() - startTime.getTime(),
        }
      };
    }
  }
}

// Export dependencies for testing/usage
export * from './company-researcher';
export * from './prospect-researcher';
export * from './icp-scorer';
export * from './activity-logger';
