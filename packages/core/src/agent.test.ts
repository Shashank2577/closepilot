import { describe, it, expect, vi } from 'vitest';
import { BaseAgent } from './agent';
import { AgentInput, AgentOutput, AgentType } from './types/agent';
import { DealStage } from './types/deal';

class TestAgent extends BaseAgent<AgentInput, AgentOutput> {
  validateDealStage(stage: DealStage): boolean {
    return stage === DealStage.SCOPING;
  }

  async execute(input: AgentInput): Promise<Omit<AgentOutput, 'durationMs'>> {
    return {
      dealId: input.dealId,
      success: true,
      requiresApproval: false,
    };
  }
}

describe('BaseAgent', () => {
  it('should run lifecycle in order', async () => {
    const agent = new TestAgent();

    // Spies
    const validateSpy = vi.spyOn(agent, 'validateDealStage');
    const preProcessSpy = vi.spyOn(agent, 'preProcess');
    const executeSpy = vi.spyOn(agent, 'execute');
    const postProcessSpy = vi.spyOn(agent, 'postProcess');

    const input: AgentInput = {
      dealId: '123',
      deal: {
        id: '123',
        stage: DealStage.SCOPING,
        createdAt: new Date(),
        updatedAt: new Date(),
        // Add required deal fields
      } as any,
      context: {}
    };

    const result = await agent.run(input);

    expect(validateSpy).toHaveBeenCalledWith(DealStage.SCOPING);
    expect(preProcessSpy).toHaveBeenCalledWith(input);
    expect(executeSpy).toHaveBeenCalled();
    expect(postProcessSpy).toHaveBeenCalled();

    // Ensure duration is set
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.success).toBe(true);
  });

  it('should throw on invalid stage', async () => {
    const agent = new TestAgent();
    const input: AgentInput = {
      dealId: '123',
      deal: {
        id: '123',
        stage: DealStage.PROPOSAL,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any,
      context: {}
    };

    await expect(agent.run(input)).rejects.toThrow('Invalid deal stage: proposal');
  });
});
