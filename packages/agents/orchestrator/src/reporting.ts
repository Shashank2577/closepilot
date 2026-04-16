import { DealStage, AgentType, Deal } from '@closepilot/core';
import { AgentHealthMonitor, SystemHealthReport } from './monitor.js';
import { AuditLog } from './audit-log.js';
import { ApprovalQueueManager } from './approval-queue.js';

/**
 * Deal throughput metrics
 */
export interface ThroughputMetrics {
  totalDeals: number;
  completedDeals: number;
  failedDeals: number;
  pendingDeals: number;
  averageCompletionTime: number;
  throughputPerDay: number;
  stageDistribution: Record<DealStage, number>;
}

/**
 * Agent performance statistics
 */
export interface AgentPerformanceStats {
  agentType: AgentType;
  executionCount: number;
  successRate: number;
  averageDuration: number;
  totalDuration: number;
  failureCount: number;
  lastExecutionTime: Date;
}

/**
 * Performance report
 */
export interface PerformanceReport {
  reportId: string;
  generatedAt: Date;
  period: {
    startDate: Date;
    endDate: Date;
  };
  throughput: ThroughputMetrics;
  agentPerformance: Map<AgentType, AgentPerformanceStats>;
  systemHealth: SystemHealthReport;
  approvalQueue: {
    totalApprovals: number;
    pendingApprovals: number;
    averageApprovalTime: number;
    approvalRate: number;
  };
  errors: {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsByAgent: Record<AgentType, number>;
  };
}

/**
 * Summary report
 */
export interface SummaryReport {
  reportId: string;
  generatedAt: Date;
  summary: {
    totalDeals: number;
    completionRate: number;
    averageDealDuration: number;
    activeAgents: number;
    systemHealth: string;
  };
  highlights: string[];
  concerns: string[];
  recommendations: string[];
}

/**
 * Report export format
 */
export enum ReportFormat {
  JSON = 'json',
  CSV = 'csv',
  MARKDOWN = 'markdown',
}

/**
 * Performance Reporting
 *
 * Generates performance reports, tracks metrics,
 * and exports reports in various formats.
 */
export class PerformanceReporter {
  private healthMonitor: AgentHealthMonitor;
  private auditLog: AuditLog;
  private approvalQueue: ApprovalQueueManager;

  constructor(
    healthMonitor: AgentHealthMonitor,
    auditLog: AuditLog,
    approvalQueue: ApprovalQueueManager
  ) {
    this.healthMonitor = healthMonitor;
    this.auditLog = auditLog;
    this.approvalQueue = approvalQueue;
  }

  /**
   * Generate performance report for a time period
   */
  async generatePerformanceReport(
    startDate: Date,
    endDate: Date,
    deals: Deal[]
  ): Promise<PerformanceReport> {
    const reportId = this.generateReportId();

    // Calculate throughput metrics
    const throughput = this.calculateThroughput(deals, startDate, endDate);

    // Get agent performance
    const agentPerformance = this.getAgentPerformanceStats();

    // Get system health
    const systemHealth = this.healthMonitor.generateHealthReport();

    // Get approval queue metrics
    const approvalQueue = this.getApprovalQueueMetrics(startDate, endDate);

    // Get error metrics
    const errors = this.getErrorMetrics(startDate, endDate);

    return {
      reportId,
      generatedAt: new Date(),
      period: { startDate, endDate },
      throughput,
      agentPerformance,
      systemHealth,
      approvalQueue,
      errors,
    };
  }

  /**
   * Generate summary report
   */
  async generateSummaryReport(
    startDate: Date,
    endDate: Date,
    deals: Deal[]
  ): Promise<SummaryReport> {
    const performanceReport = await this.generatePerformanceReport(
      startDate,
      endDate,
      deals
    );

    const completionRate =
      performanceReport.throughput.totalDeals > 0
        ? (performanceReport.throughput.completedDeals /
            performanceReport.throughput.totalDeals) *
          100
        : 0;

    const highlights: string[] = [];
    const concerns: string[] = [];
    const recommendations: string[] = [];

    // Generate highlights
    if (completionRate > 90) {
      highlights.push(
        `High completion rate: ${completionRate.toFixed(1)}% of deals completed`
      );
    }

    if (
      performanceReport.approvalQueue.approvalRate > 0.8 &&
      performanceReport.approvalQueue.totalApprovals > 0
    ) {
      highlights.push(
        `Strong approval rate: ${(performanceReport.approvalQueue.approvalRate * 100).toFixed(1)}%`
      );
    }

    const healthyAgents =
      performanceReport.systemHealth.summary.healthyAgents;
    if (healthyAgents === performanceReport.systemHealth.summary.totalAgents) {
      highlights.push('All agents operating normally');
    }

    // Generate concerns
    if (completionRate < 70) {
      concerns.push(
        `Low completion rate: ${completionRate.toFixed(1)}% of deals completed`
      );
    }

    if (performanceReport.errors.totalErrors > 10) {
      concerns.push(
        `High error count: ${performanceReport.errors.totalErrors} errors in period`
      );
    }

    if (
      performanceReport.systemHealth.summary.circuitOpenAgents > 0
    ) {
      concerns.push(
        `${performanceReport.systemHealth.summary.circuitOpenAgents} agent(s) with open circuit breakers`
      );
    }

    // Generate recommendations
    if (completionRate < 80) {
      recommendations.push('Review failed deals and adjust agent configurations');
    }

    if (
      performanceReport.approvalQueue.pendingApprovals > 5
    ) {
      recommendations.push('Process pending approvals to prevent deal delays');
    }

    if (
      performanceReport.throughput.averageCompletionTime > 86400000
    ) {
      recommendations.push(
        'Investigate slow deal processing (average > 24 hours)'
      );
    }

    return {
      reportId: performanceReport.reportId,
      generatedAt: performanceReport.generatedAt,
      summary: {
        totalDeals: performanceReport.throughput.totalDeals,
        completionRate,
        averageDealDuration: performanceReport.throughput.averageCompletionTime,
        activeAgents: performanceReport.systemHealth.summary.totalAgents,
        systemHealth: performanceReport.systemHealth.overallStatus,
      },
      highlights,
      concerns,
      recommendations,
    };
  }

  /**
   * Calculate throughput metrics
   */
  private calculateThroughput(
    deals: Deal[],
    startDate: Date,
    endDate: Date
  ): ThroughputMetrics {
    const periodDeals = deals.filter(
      deal => deal.createdAt >= startDate && deal.createdAt <= endDate
    );

    const completedDeals = periodDeals.filter(
      deal => deal.stage === DealStage.COMPLETED
    );
    const failedDeals = periodDeals.filter(
      deal => deal.stage === DealStage.FAILED
    );
    const pendingDeals = periodDeals.filter(
      deal =>
        deal.stage !== DealStage.COMPLETED && deal.stage !== DealStage.FAILED
    );

    // Calculate average completion time
    const completionTimes = completedDeals
      .map(deal => {
        if (deal.updatedAt && deal.createdAt) {
          return deal.updatedAt.getTime() - deal.createdAt.getTime();
        }
        return 0;
      })
      .filter(time => time > 0);

    const averageCompletionTime =
      completionTimes.length > 0
        ? completionTimes.reduce((sum, time) => sum + time, 0) /
          completionTimes.length
        : 0;

    // Calculate throughput per day
    const daysInPeriod =
      Math.max(1, (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    const throughputPerDay = completedDeals.length / daysInPeriod;

    // Calculate stage distribution
    const stageDistribution: Record<DealStage, number> = {
      [DealStage.INGESTION]: 0,
      [DealStage.ENRICHMENT]: 0,
      [DealStage.SCOPING]: 0,
      [DealStage.PROPOSAL]: 0,
      [DealStage.CRM_SYNC]: 0,
      [DealStage.COMPLETED]: 0,
      [DealStage.FAILED]: 0,
    };

    periodDeals.forEach(deal => {
      stageDistribution[deal.stage]++;
    });

    return {
      totalDeals: periodDeals.length,
      completedDeals: completedDeals.length,
      failedDeals: failedDeals.length,
      pendingDeals: pendingDeals.length,
      averageCompletionTime,
      throughputPerDay,
      stageDistribution,
    };
  }

  /**
   * Get agent performance statistics
   */
  private getAgentPerformanceStats(): Map<AgentType, AgentPerformanceStats> {
    const stats = new Map<AgentType, AgentPerformanceStats>();

    const allMetrics = this.healthMonitor.getAllMetrics();

    for (const [agentType, metric] of allMetrics.entries()) {
      stats.set(agentType, {
        agentType: metric.agentType,
        executionCount: metric.executionCount,
        successRate: metric.successRate,
        averageDuration: metric.averageDuration,
        totalDuration: metric.averageDuration * metric.executionCount,
        failureCount: metric.failureCount,
        lastExecutionTime: metric.lastExecutionTime,
      });
    }

    return stats;
  }

  /**
   * Get approval queue metrics
   */
  private getApprovalQueueMetrics(
    startDate: Date,
    endDate: Date
  ): {
    totalApprovals: number;
    pendingApprovals: number;
    averageApprovalTime: number;
    approvalRate: number;
  } {
    const stats = this.approvalQueue.getQueueStats();
    const approvals = this.approvalQueue
      .exportApprovalData()
      .filter(
        approval =>
          approval.requestedAt >= startDate && approval.requestedAt <= endDate
      );

    const approved = approvals.filter(
      approval => approval.status === 'approved'
    );
    const approvalRate =
      approvals.length > 0 ? approved.length / approvals.length : 0;

    // Calculate average approval time
    const approvalTimes = approved
      .filter(approval => approval.reviewedAt)
      .map(approval => {
        return (
          approval.reviewedAt!.getTime() - approval.requestedAt.getTime()
        );
      });

    const averageApprovalTime =
      approvalTimes.length > 0
        ? approvalTimes.reduce((sum, time) => sum + time, 0) /
          approvalTimes.length
        : 0;

    return {
      totalApprovals: approvals.length,
      pendingApprovals: stats.pending,
      averageApprovalTime,
      approvalRate,
    };
  }

  /**
   * Get error metrics
   */
  private getErrorMetrics(
    startDate: Date,
    endDate: Date
  ): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsByAgent: Record<AgentType, number>;
  } {
    const errorEntries = this.auditLog.query({
      eventType: 'error_occurred' as any,
      startDate,
      endDate,
    });

    const errorsByType: Record<string, number> = {};
    const errorsByAgent: Record<AgentType, number> = {
      [AgentType.INGESTION]: 0,
      [AgentType.ENRICHMENT]: 0,
      [AgentType.SCOPING]: 0,
      [AgentType.PROPOSAL]: 0,
      [AgentType.CRM_SYNC]: 0,
      [AgentType.ORCHESTRATOR]: 0,
    };

    errorEntries.forEach(entry => {
      const errorCode = entry.details.errorCode as string | undefined;
      if (errorCode) {
        errorsByType[errorCode] = (errorsByType[errorCode] || 0) + 1;
      }

      const agentType = entry.details.agentType as AgentType | undefined;
      if (agentType) {
        errorsByAgent[agentType]++;
      }
    });

    return {
      totalErrors: errorEntries.length,
      errorsByType,
      errorsByAgent,
    };
  }

  /**
   * Export report to specified format
   */
  exportReport(
    report: PerformanceReport | SummaryReport,
    format: ReportFormat
  ): string {
    switch (format) {
      case ReportFormat.JSON:
        return JSON.stringify(report, null, 2);

      case ReportFormat.CSV:
        return this.exportToCSV(report);

      case ReportFormat.MARKDOWN:
        return this.exportToMarkdown(report);

      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Export to CSV format
   */
  private exportToCSV(report: PerformanceReport | SummaryReport): string {
    // For simplicity, export basic metrics as CSV
    const lines: string[] = [];

    if ('throughput' in report) {
      const perfReport = report as PerformanceReport;
      lines.push('Metric,Value');
      lines.push(`Total Deals,${perfReport.throughput.totalDeals}`);
      lines.push(`Completed Deals,${perfReport.throughput.completedDeals}`);
      lines.push(`Failed Deals,${perfReport.throughput.failedDeals}`);
      lines.push(`Completion Rate,${(perfReport.throughput.completedDeals / perfReport.throughput.totalDeals * 100).toFixed(2)}%`);
    } else {
      const summary = report as SummaryReport;
      lines.push('Metric,Value');
      lines.push(`Total Deals,${summary.summary.totalDeals}`);
      lines.push(`Completion Rate,${summary.summary.completionRate.toFixed(2)}%`);
      lines.push(`Active Agents,${summary.summary.activeAgents}`);
    }

    return lines.join('\n');
  }

  /**
   * Export to Markdown format
   */
  private exportToMarkdown(report: PerformanceReport | SummaryReport): string {
    const lines: string[] = [];

    if ('throughput' in report) {
      const perfReport = report as PerformanceReport;
      lines.push(`# Performance Report`);
      lines.push(`Generated: ${perfReport.generatedAt.toISOString()}`);
      lines.push('');
      lines.push('## Throughput');
      lines.push(`- Total Deals: ${perfReport.throughput.totalDeals}`);
      lines.push(`- Completed: ${perfReport.throughput.completedDeals}`);
      lines.push(`- Failed: ${perfReport.throughput.failedDeals}`);
      lines.push(`- Avg Completion Time: ${Math.round(perfReport.throughput.averageCompletionTime / 1000 / 60)} minutes`);
    } else {
      const summary = report as SummaryReport;
      lines.push(`# Summary Report`);
      lines.push(`Generated: ${summary.generatedAt.toISOString()}`);
      lines.push('');
      lines.push('## Summary');
      lines.push(`- Total Deals: ${summary.summary.totalDeals}`);
      lines.push(`- Completion Rate: ${summary.summary.completionRate.toFixed(1)}%`);
      lines.push(`- Active Agents: ${summary.summary.activeAgents}`);
      lines.push('');
      lines.push('## Highlights');
      summary.highlights.forEach(h => lines.push(`- ${h}`));
      lines.push('');
      lines.push('## Concerns');
      summary.concerns.forEach(c => lines.push(`- ${c}`));
      lines.push('');
      lines.push('## Recommendations');
      summary.recommendations.forEach(r => lines.push(`- ${r}`));
    }

    return lines.join('\n');
  }

  /**
   * Generate unique report ID
   */
  private generateReportId(): string {
    return `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
