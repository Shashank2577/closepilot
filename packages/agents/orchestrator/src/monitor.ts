import { Deal, DealStage, AgentType } from '@closepilot/core';

export interface DealMetric {
  dealId: string;
  stage: DealStage;
  startTime: number;
  lastUpdated: number;
}

export interface AgentMetric {
  executionId: string;
  agentType: AgentType;
  dealId: string;
  durationMs: number;
  success: boolean;
  timestamp: number;
}

export class Monitor {
  private activeDeals: Map<string, DealMetric> = new Map();
  private agentMetrics: AgentMetric[] = [];
  private dealCompletionTimes: number[] = [];

  public trackDealStart(deal: Deal): void {
    this.activeDeals.set(deal.id, {
      dealId: deal.id,
      stage: deal.stage,
      startTime: Date.now(),
      lastUpdated: Date.now()
    });
  }

  public trackDealUpdate(deal: Deal): void {
    const metric = this.activeDeals.get(deal.id);
    if (metric) {
      metric.stage = deal.stage;
      metric.lastUpdated = Date.now();
    } else {
      this.trackDealStart(deal);
    }
  }

  public trackDealCompletion(dealId: string): void {
    const metric = this.activeDeals.get(dealId);
    if (metric) {
      const duration = Date.now() - metric.startTime;
      this.dealCompletionTimes.push(duration);
      this.activeDeals.delete(dealId);
    }
  }

  public trackAgentExecution(
    agentType: AgentType,
    dealId: string,
    durationMs: number,
    success: boolean
  ): void {
    this.agentMetrics.push({
      executionId: Math.random().toString(36).substring(7),
      agentType,
      dealId,
      durationMs,
      success,
      timestamp: Date.now()
    });
  }

  public getActiveDealsCount(): number {
    return this.activeDeals.size;
  }

  public getAverageDealCompletionTime(): number {
    if (this.dealCompletionTimes.length === 0) return 0;
    const sum = this.dealCompletionTimes.reduce((acc, curr) => acc + curr, 0);
    return sum / this.dealCompletionTimes.length;
  }

  public getAgentMetrics(): AgentMetric[] {
    return [...this.agentMetrics];
  }
}
