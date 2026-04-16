import { Deal, AgentType, AgentInput, AgentOutput, DealStage } from '@closepilot/core';

export class AgentDispatcher {
  private readonly MAX_RETRIES = 3;

  public async dispatch(
    agentType: AgentType,
    deal: Deal,
    context?: unknown
  ): Promise<AgentOutput> {
    let attempts = 0;
    let lastError: Error | undefined;

    while (attempts < this.MAX_RETRIES) {
      try {
        attempts++;
        // In a real scenario, this would interact with MCP / messaging queue
        const result = await this.simulateAgentCall(agentType, deal, context);
        if (result.success) {
          return result;
        } else {
          lastError = new Error(result.errors?.join(', ') || 'Agent execution failed');
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }

      // Add exponential backoff here if necessary
      await new Promise(resolve => setTimeout(resolve, 100 * attempts));
    }

    return {
      dealId: deal.id,
      success: false,
      errors: [`Failed after ${this.MAX_RETRIES} attempts. Last error: ${lastError?.message}`],
      requiresApproval: false
    };
  }

  /**
   * For the purpose of this implementation, we simulate agent calls.
   * In reality, this would serialize the AgentInput and call other agent packages via MCP or API.
   */
  private async simulateAgentCall(
    agentType: AgentType,
    deal: Deal,
    context?: unknown
  ): Promise<AgentOutput> {
    // Simulate some latency
    await new Promise(resolve => setTimeout(resolve, 50));

    // Basic simulation logic based on agent type
    let nextStage: DealStage;
    switch (agentType) {
      case AgentType.INGESTION:
        nextStage = DealStage.ENRICHMENT;
        break;
      case AgentType.ENRICHMENT:
        nextStage = DealStage.SCOPING;
        break;
      case AgentType.SCOPING:
        nextStage = DealStage.PROPOSAL;
        break;
      case AgentType.PROPOSAL:
        nextStage = DealStage.CRM_SYNC;
        break;
      case AgentType.CRM_SYNC:
        nextStage = DealStage.COMPLETED;
        break;
      default:
        throw new Error(`Unsupported AgentType: ${agentType}`);
    }

    // Determine if it requires approval for PROPOSAL
    let requiresApproval = false;
    let approvalReason: string | undefined;

    if (agentType === AgentType.PROPOSAL) {
      // Simulate generating a proposal that might need approval
      // E.g., based on deal size or random for simulation.
      if (deal.proposal?.pricing?.total && deal.proposal.pricing.total > 50000) {
        requiresApproval = true;
        approvalReason = 'Proposal exceeds $50k threshold';
      }
    }

    return {
      dealId: deal.id,
      success: true,
      nextStage,
      requiresApproval,
      approvalReason
    };
  }
}
