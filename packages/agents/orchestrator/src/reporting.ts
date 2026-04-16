import { AuditLog } from './audit-log';
import { Monitor } from './monitor';
import { DealStage, AgentType } from '@closepilot/core';

export interface PerformanceReport {
  totalDealsProcessed: number;
  averageCompletionTimeMs: number;
  agentSuccessRates: Record<string, number>;
  stageTransitionCounts: Record<string, number>;
}

export class ReportingService {
  constructor(private auditLog: AuditLog, private monitor: Monitor) {}

  public generateReport(): PerformanceReport {
    const logs = this.auditLog.getAllLogs();
    const metrics = this.monitor.getAgentMetrics();

    // 1. Total deals processed (deals that reached COMPLETED)
    const completedDeals = logs.filter(
      log => log.type === 'STAGE_CHANGE' && log.details.toStage === DealStage.COMPLETED
    );

    // 2. Average Completion Time
    const averageCompletionTimeMs = this.monitor.getAverageDealCompletionTime();

    // 3. Agent Success Rates
    const agentExecutions: Record<string, { total: number; success: number }> = {};
    metrics.forEach(metric => {
      if (!agentExecutions[metric.agentType]) {
        agentExecutions[metric.agentType] = { total: 0, success: 0 };
      }
      agentExecutions[metric.agentType].total++;
      if (metric.success) {
        agentExecutions[metric.agentType].success++;
      }
    });

    const agentSuccessRates: Record<string, number> = {};
    for (const [agentType, stats] of Object.entries(agentExecutions)) {
      agentSuccessRates[agentType] = stats.total > 0 ? stats.success / stats.total : 0;
    }

    // 4. Stage Transition Counts
    const stageTransitionCounts: Record<string, number> = {};
    logs.filter(log => log.type === 'STAGE_CHANGE').forEach(log => {
      const transition = `${log.details.fromStage}->${log.details.toStage}`;
      stageTransitionCounts[transition] = (stageTransitionCounts[transition] || 0) + 1;
    });

    return {
      totalDealsProcessed: completedDeals.length,
      averageCompletionTimeMs,
      agentSuccessRates,
      stageTransitionCounts
    };
  }
}
