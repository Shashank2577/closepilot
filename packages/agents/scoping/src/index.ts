import { AgentInput, AgentOutput, DealStage, AgentType } from '@closepilot/core';
import { extractRequirements } from './requirement-extractor';
import { defineScope } from './scope-definer';
import { calculateComplexity } from './complexity-analyzer';
import { generateClarificationEmail } from './clarification-generator';

export interface ScopingOutput {
  needsClarification: boolean;
  clarificationEmailDraft?: string;
  complexityScore?: number;
}

export interface ScopingContext {
  emailThreadContent?: string[];
}

/**
 * Orchestrates the Scoping Agent's responsibilities:
 * 1. Analyze email threads and extract requirements.
 * 2. Define the project scope based on requirements.
 * 3. Calculate complexity score.
 * 4. Generate clarification email if needed.
 * 5. Update the deal with scope/requirements.
 */
export async function processDeal(input: AgentInput<ScopingContext>): Promise<AgentOutput<ScopingOutput>> {
  try {
    const deal = input.deal;
    const context = input.context || {};

    // Use thread content from context if provided (e.g., for testing), otherwise fallback to deal metadata
    let emailThreadContent = context.emailThreadContent || [
      deal.leadName,
      deal.leadEmail,
      deal.leadCompany,
      deal.id
    ].filter(Boolean) as string[];

    const requirements = await extractRequirements(emailThreadContent);
    const initialScope = await defineScope(requirements, {
      complexity: 'medium',
      title: `${deal.leadCompany || deal.leadName} Project`,
      description: `Custom software project for ${deal.leadName}.`,
    });

    const { score, scope: finalScope } = await calculateComplexity(requirements, initialScope);

    const clarificationResult = await generateClarificationEmail(requirements, deal.leadName);

    // If clarification is needed, we don't move to PROPOSAL yet, or we require human approval
    const requiresApproval = clarificationResult.needsClarification;
    const approvalReason = clarificationResult.needsClarification
      ? 'Clarification needed from the prospect regarding ambiguous requirements.'
      : undefined;

    // Update deal
    deal.requirements = requirements;
    deal.projectScope = finalScope;

    const output: AgentOutput<ScopingOutput> = {
      dealId: deal.id,
      success: true,
      data: {
        needsClarification: clarificationResult.needsClarification,
        clarificationEmailDraft: clarificationResult.emailDraft,
        complexityScore: score,
      },
      nextStage: clarificationResult.needsClarification ? DealStage.SCOPING : DealStage.PROPOSAL,
      requiresApproval,
      approvalReason,
      metadata: {
        agentType: AgentType.SCOPING,
        executionId: Math.random().toString(36).substring(2, 9),
        startedAt: new Date(),
        completedAt: new Date(),
      }
    };

    return output;
  } catch (error: any) {
    return {
      dealId: input.deal.id,
      success: false,
      errors: [error.message],
      requiresApproval: true,
      approvalReason: 'Error during scoping agent execution',
      metadata: {
        agentType: AgentType.SCOPING,
        executionId: Math.random().toString(36).substring(2, 9),
        startedAt: new Date(),
        completedAt: new Date(),
      }
    };
  }
}
