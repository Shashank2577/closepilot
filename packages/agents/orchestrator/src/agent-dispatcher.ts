import { Deal, DealStage, AgentType, AgentOutput, AgentHandoff } from '@closepilot/core';
import { DealStateMachine, TransitionMetadata } from './state-machine.js';

/**
 * Agent execution configuration
 */
export interface AgentConfig {
  maxRetries: number;
  timeout: number;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Agent execution result
 */
export interface AgentExecutionResult {
  dealId: string;
  agentType: AgentType;
  success: boolean;
  output?: AgentOutput;
  error?: Error;
  retryCount: number;
  duration: number;
  metadata: TransitionMetadata;
}

/**
 * Worker pool configuration
 */
export interface WorkerPoolConfig {
  maxConcurrent: number;
  queueTimeout: number;
}

/**
 * Agent Dispatcher
 *
 * Manages agent instances, dispatches agents based on deal stage,
 * handles execution with retry logic, and coordinates handoffs.
 */
export class AgentDispatcher {
  private agentConfigs: Map<AgentType, AgentConfig>;
  private workerPool: Map<string, Promise<AgentExecutionResult>>;
  private maxConcurrent: number;
  private activeExecutionCount = 0;

  constructor(maxConcurrent = 10) {
    this.maxConcurrent = maxConcurrent;
    this.workerPool = new Map();
    this.agentConfigs = new Map();
    this.initializeDefaultConfigs();
  }

  /**
   * Initialize default agent configurations
   */
  private initializeDefaultConfigs(): void {
    const defaults: Record<AgentType, AgentConfig> = {
      [AgentType.INGESTION]: {
        maxRetries: 3,
        timeout: 60000, // 1 minute
        priority: 'high',
      },
      [AgentType.ENRICHMENT]: {
        maxRetries: 3,
        timeout: 300000, // 5 minutes
        priority: 'medium',
      },
      [AgentType.SCOPING]: {
        maxRetries: 3,
        timeout: 600000, // 10 minutes
        priority: 'medium',
      },
      [AgentType.PROPOSAL]: {
        maxRetries: 3,
        timeout: 600000, // 10 minutes
        priority: 'high',
      },
      [AgentType.CRM_SYNC]: {
        maxRetries: 3,
        timeout: 120000, // 2 minutes
        priority: 'medium',
      },
      [AgentType.ORCHESTRATOR]: {
        maxRetries: 1,
        timeout: 30000,
        priority: 'low',
      },
    };

    Object.entries(defaults).forEach(([agentType, config]) => {
      this.agentConfigs.set(agentType as AgentType, config);
    });
  }

  /**
   * Get agent type for deal stage
   */
  private getAgentTypeForStage(stage: DealStage): AgentType {
    const stageToAgent: Record<DealStage, AgentType> = {
      [DealStage.INGESTION]: AgentType.INGESTION,
      [DealStage.ENRICHMENT]: AgentType.ENRICHMENT,
      [DealStage.SCOPING]: AgentType.SCOPING,
      [DealStage.PROPOSAL]: AgentType.PROPOSAL,
      [DealStage.CRM_SYNC]: AgentType.CRM_SYNC,
      [DealStage.COMPLETED]: AgentType.ORCHESTRATOR,
      [DealStage.FAILED]: AgentType.ORCHESTRATOR,
    };

    return stageToAgent[stage];
  }

  /**
   * Execute agent with retry logic
   */
  async executeAgent(
    deal: Deal,
    stage: DealStage,
    retryCount = 0
  ): Promise<AgentExecutionResult> {
    const agentType = this.getAgentTypeForStage(stage);
    const config = this.agentConfigs.get(agentType) || {
      maxRetries: 3,
      timeout: 300000,
      priority: 'medium',
    };

    const executionId = `${deal.id}-${agentType}-${Date.now()}`;
    const startTime = Date.now();

    try {
      // Check if we can execute (concurrent limit)
      await this.waitForWorkerSlot();

      this.activeExecutionCount++;

      // Create transition metadata
      const metadata = DealStateMachine.createTransitionMetadata(
        deal.stage,
        stage,
        `Executing ${agentType} agent`,
        false,
        retryCount
      );

      // Execute the agent (placeholder - actual agent execution to be implemented)
      const output = await this.executeAgentInternal(
        deal,
        agentType,
        config.timeout
      );

      const duration = Date.now() - startTime;

      const result: AgentExecutionResult = {
        dealId: deal.id,
        agentType,
        success: true,
        output,
        retryCount,
        duration,
        metadata,
      };

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Check if we should retry
      if (retryCount < config.maxRetries && DealStateMachine.canRetry(retryCount)) {
        const delay = DealStateMachine.calculateRetryDelay(retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));

        return this.executeAgent(deal, stage, retryCount + 1);
      }

      // Max retries exceeded
      const result: AgentExecutionResult = {
        dealId: deal.id,
        agentType,
        success: false,
        error: error as Error,
        retryCount,
        duration,
        metadata: DealStateMachine.createTransitionMetadata(
          deal.stage,
          DealStage.FAILED,
          `Agent execution failed after ${retryCount} retries`,
          false,
          retryCount
        ),
      };

      return result;
    } finally {
      this.activeExecutionCount--;
    }
  }

  /**
   * Internal agent execution (to be implemented with actual agent calls)
   */
  private async executeAgentInternal(
    deal: Deal,
    agentType: AgentType,
    timeout: number
  ): Promise<AgentOutput> {
    // TODO: This is a placeholder. In production, this will:
    // 1. Call the appropriate managed agent via Anthropic Agent SDK
    // 2. Pass deal context and required tools
    // 3. Wait for agent completion with timeout
    // 4. Return agent output

    // Simulate agent execution
    const startMs = Date.now();
    await new Promise(resolve => setTimeout(resolve, 100));

    return {
      dealId: deal.id,
      success: true,
      nextStage: this.getNextStageForAgent(agentType),
      requiresApproval: false,
      durationMs: Date.now() - startMs,
      metadata: {
        agentType,
        executionId: `${deal.id}-${agentType}-${Date.now()}`,
        startedAt: new Date(),
        completedAt: new Date(),
        duration: 100,
      },
    };
  }

  /**
   * Get next stage for agent type
   */
  private getNextStageForAgent(agentType: AgentType): DealStage {
    const agentToStage: Record<AgentType, DealStage> = {
      [AgentType.INGESTION]: DealStage.ENRICHMENT,
      [AgentType.ENRICHMENT]: DealStage.SCOPING,
      [AgentType.SCOPING]: DealStage.PROPOSAL,
      [AgentType.PROPOSAL]: DealStage.CRM_SYNC,
      [AgentType.CRM_SYNC]: DealStage.COMPLETED,
      [AgentType.ORCHESTRATOR]: DealStage.COMPLETED,
    };

    return agentToStage[agentType];
  }

  /**
   * Wait for available worker slot
   */
  private async waitForWorkerSlot(): Promise<void> {
    while (this.activeExecutionCount >= this.maxConcurrent) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Create agent handoff
   */
  createHandoff(
    fromAgent: AgentType,
    toAgent: AgentType,
    dealId: string,
    reason: string,
    context: unknown
  ): AgentHandoff {
    return {
      fromAgent,
      toAgent,
      dealId,
      reason,
      context,
      timestamp: new Date(),
    };
  }

  /**
   * Dispatch multiple agents concurrently
   */
  async dispatchAgents(
    deals: Deal[],
    stage: DealStage
  ): Promise<AgentExecutionResult[]> {
    const promises = deals.map(deal => this.executeAgent(deal, stage));
    return Promise.all(promises);
  }

  /**
   * Get active execution count
   */
  getActiveExecutionCount(): number {
    return this.activeExecutionCount;
  }

  /**
   * Check if dispatcher can accept more work
   */
  canAcceptMoreWork(): boolean {
    return this.activeExecutionCount < this.maxConcurrent;
  }

  /**
   * Get agent configuration
   */
  getAgentConfig(agentType: AgentType): AgentConfig | undefined {
    return this.agentConfigs.get(agentType);
  }

  /**
   * Update agent configuration
   */
  updateAgentConfig(agentType: AgentType, config: Partial<AgentConfig>): void {
    const existing = this.agentConfigs.get(agentType);
    if (existing) {
      this.agentConfigs.set(agentType, { ...existing, ...config });
    }
  }

  /**
   * Shutdown dispatcher and wait for active executions
   */
  async shutdown(timeout = 30000): Promise<void> {
    const startTime = Date.now();

    while (this.activeExecutionCount > 0) {
      if (Date.now() - startTime > timeout) {
        throw new Error('Timeout waiting for active executions to complete');
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}
