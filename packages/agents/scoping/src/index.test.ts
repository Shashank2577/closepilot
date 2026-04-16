import { describe, it, expect } from 'vitest';
import { DealStage, AgentInput, AgentType } from '@closepilot/core';
import { processDeal, ScopingContext } from './index';

describe('Scoping Agent Orchestrator', () => {
  it('should process a clear deal successfully and move to PROPOSAL stage', async () => {
    const input: AgentInput<ScopingContext> = {
      dealId: 'clear-deal',
      deal: {
        id: 'clear-deal',
        stage: DealStage.SCOPING,
        createdAt: new Date(),
        updatedAt: new Date(),
        leadEmail: 'test@example.com',
        leadName: 'John Doe',
        leadCompany: 'Test Corp',
        source: 'manual',
      },
      context: {
        emailThreadContent: ['We need to build a new admin dashboard with auth, login and api integration for our mobile app. The budget is $50,000 and we need it by Q1 urgent.']
      },
    };

    const output = await processDeal(input);

    expect(output.success).toBe(true);
    expect(output.data?.needsClarification).toBe(false);
    expect(output.nextStage).toBe(DealStage.PROPOSAL);
    expect(output.requiresApproval).toBe(false);

    const deal = input.deal;
    expect(deal.requirements).toBeDefined();
    expect(deal.requirements?.length).toBeGreaterThan(0);
    expect(deal.projectScope).toBeDefined();
    expect(deal.projectScope?.complexity).toBe('high'); // Given the keywords used
    expect(output.data?.complexityScore).toBeGreaterThan(0);
  });

  it('should process an ambiguous deal, require clarification, and stay in SCOPING stage', async () => {
    const input: AgentInput<ScopingContext> = {
      dealId: 'ambiguous-deal',
      deal: {
        id: 'ambiguous-deal',
        stage: DealStage.SCOPING,
        createdAt: new Date(),
        updatedAt: new Date(),
        leadEmail: 'ambiguous@example.com',
        leadName: 'Jane Smith',
        source: 'manual',
      },
      context: {
        emailThreadContent: ['We need a timeline for this. Also what is the budget?']
      },
    };

    const output = await processDeal(input);

    expect(output.success).toBe(true);
    expect(output.data?.needsClarification).toBe(true);
    expect(output.data?.clarificationEmailDraft).toBeDefined();
    expect(output.data?.clarificationEmailDraft).toContain('Jane Smith');
    expect(output.nextStage).toBe(DealStage.SCOPING);
    expect(output.requiresApproval).toBe(true);
    expect(output.approvalReason).toContain('Clarification needed');

    const deal = input.deal;
    expect(deal.requirements).toBeDefined();
    expect(deal.projectScope).toBeDefined();
  });
});
