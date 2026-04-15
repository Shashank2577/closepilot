/**
 * Activity Logger
 *
 * Logs enrichment agent activities for debugging and audit trail.
 * Stores activity logs in deal metadata or separate log storage.
 */

import { DealStoreTools } from '@closepilot/mcp-client';

export interface ActivityLoggerConfig {
  dealStoreTools: DealStoreTools;
}

export interface ActivityLog {
  dealId: string;
  executionId: string;
  timestamp: Date;
  activityType:
    | 'start'
    | 'complete'
    | 'company_research'
    | 'prospect_research'
    | 'deal_update'
    | 'stage_transition'
    | 'error';
  status: 'started' | 'completed' | 'failed';
  data?: Record<string, unknown>;
  error?: string;
}

export class ActivityLogger {
  private dealStoreTools: DealStoreTools;
  private activityLogs: ActivityLog[] = [];

  constructor(config: ActivityLoggerConfig) {
    this.dealStoreTools = config.dealStoreTools;
  }

  /**
   * Log agent execution start
   */
  async logStart(
    dealId: string,
    executionId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const log: ActivityLog = {
      dealId,
      executionId,
      timestamp: new Date(),
      activityType: 'start',
      status: 'started',
      data,
    };

    this.activityLogs.push(log);
    await this.persistLog(dealId, log);
  }

  /**
   * Log agent execution complete
   */
  async logComplete(
    dealId: string,
    executionId: string,
    data: {
      duration: number;
      success: boolean;
      nextStage?: string;
      error?: string;
    }
  ): Promise<void> {
    const log: ActivityLog = {
      dealId,
      executionId,
      timestamp: new Date(),
      activityType: 'complete',
      status: data.success ? 'completed' : 'failed',
      data: {
        duration: data.duration,
        nextStage: data.nextStage,
      },
      error: data.error,
    };

    this.activityLogs.push(log);
    await this.persistLog(dealId, log);
  }

  /**
   * Log activity
   */
  async logActivity(
    dealId: string,
    activityType: ActivityLog['activityType'],
    status: ActivityLog['status'],
    data?: Record<string, unknown>
  ): Promise<void> {
    const executionId = this.getCurrentExecutionId();

    const log: ActivityLog = {
      dealId,
      executionId,
      timestamp: new Date(),
      activityType,
      status,
      data,
    };

    this.activityLogs.push(log);
    await this.persistLog(dealId, log);
  }

  /**
   * Get current execution ID (most recent start log)
   */
  private getCurrentExecutionId(): string {
    const startLogs = this.activityLogs
      .filter((log) => log.activityType === 'start')
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return startLogs[0]?.executionId || 'unknown';
  }

  /**
   * Persist log to storage
   * In production, this would write to a database or logging service
   * For now, we'll store in deal metadata
   */
  private async persistLog(dealId: string, log: ActivityLog): Promise<void> {
    try {
      // For now, just log to console
      console.log(`[Enrichment Agent] ${JSON.stringify(log, null, 2)}`);

      // In production, you would:
      // 1. Write to a separate activity_logs table
      // 2. Or append to deal metadata
      // 3. Or send to a logging service (e.g., Datadog, Sentry)

      // Example: Update deal with activity log in metadata
      // await this.dealStoreTools.updateDeal(dealId, {
      //   metadata: {
      //     activityLogs: [...existingLogs, log]
      //   }
      // });
    } catch (error) {
      console.error('Error persisting activity log:', error);
    }
  }

  /**
   * Get all activity logs for a deal
   */
  getLogsForDeal(dealId: string): ActivityLog[] {
    return this.activityLogs.filter((log) => log.dealId === dealId);
  }

  /**
   * Get all activity logs for an execution
   */
  getLogsForExecution(executionId: string): ActivityLog[] {
    return this.activityLogs.filter((log) => log.executionId === executionId);
  }

  /**
   * Clear old logs (memory management)
   */
  clearLogsOlderThan(daysOld: number): void {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);

    this.activityLogs = this.activityLogs.filter(
      (log) => log.timestamp >= cutoff
    );
  }

  /**
   * Get summary statistics
   */
  getStats(): {
    totalLogs: number;
    byActivityType: Record<string, number>;
    byStatus: Record<string, number>;
  } {
    const byActivityType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    for (const log of this.activityLogs) {
      byActivityType[log.activityType] =
        (byActivityType[log.activityType] || 0) + 1;
      byStatus[log.status] = (byStatus[log.status] || 0) + 1;
    }

    return {
      totalLogs: this.activityLogs.length,
      byActivityType,
      byStatus,
    };
  }
}
