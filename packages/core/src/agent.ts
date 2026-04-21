import { AgentInput, AgentOutput } from './types/agent';
import { DealStage } from './types/deal';

export abstract class BaseAgent<TInput extends AgentInput<any>, TOutput extends AgentOutput<any>> {
  /**
   * Validates if the input stage is appropriate for this agent
   */
  validateDealStage(stage: DealStage): boolean {
    return true; // Default implementation, subclasses should override
  }

  /**
   * Pre-process the input before execution
   */
  async preProcess(input: TInput): Promise<TInput> {
    return input; // Default no-op
  }

  /**
   * Core execution logic, implemented by each agent
   */
  abstract execute(input: TInput): Promise<Omit<TOutput, 'durationMs'> & Partial<Pick<TOutput, 'durationMs'>>>;

  /**
   * Post-process the output after execution
   */
  async postProcess(output: Omit<TOutput, 'durationMs'> & Partial<Pick<TOutput, 'durationMs'>>): Promise<TOutput> {
    return output as TOutput; // Default no-op
  }

  /**
   * Orchestrates the agent lifecycle
   */
  async run(input: TInput): Promise<TOutput> {
    const startTime = Date.now();

    if (!this.validateDealStage(input.deal.stage)) {
      throw new Error(`Invalid deal stage: ${input.deal.stage}`);
    }

    const processedInput = await this.preProcess(input);
    const output = await this.execute(processedInput);
    const finalOutput = await this.postProcess(output);

    finalOutput.durationMs = Date.now() - startTime;
    return finalOutput;
  }
}
