import { Deal, DealStage, AgentType, AgentHandoff } from '@closepilot/core';

/**
 * Audit log entry types
 */
export enum AuditEventType {
  DEAL_CREATED = 'deal_created',
  STAGE_TRANSITION = 'stage_transition',
  AGENT_EXECUTION = 'agent_execution',
  AGENT_HANDOFF = 'agent_handoff',
  APPROVAL_REQUESTED = 'approval_requested',
  APPROVAL_DECISION = 'approval_decision',
  ERROR_OCCURRED = 'error_occurred',
  RETRY_ATTEMPT = 'retry_attempt',
  SYSTEM_EVENT = 'system_event',
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  eventType: AuditEventType;
  dealId: string;
  actor: string;
  details: Record<string, unknown>;
  metadata?: {
    executionId?: string;
    duration?: number;
    success?: boolean;
    errorCode?: string;
  };
}

/**
 * State transition audit data
 */
export interface StateTransitionAudit {
  fromStage: DealStage;
  toStage: DealStage;
  reason: string;
  requiresApproval: boolean;
  retryCount?: number;
}

/**
 * Agent execution audit data
 */
export interface AgentExecutionAudit {
  agentType: AgentType;
  executionId: string;
  success: boolean;
  duration: number;
  error?: string;
  output?: unknown;
}

/**
 * Query filters for audit log
 */
export interface AuditLogQuery {
  dealId?: string;
  eventType?: AuditEventType;
  startDate?: Date;
  endDate?: Date;
  agentType?: AgentType;
  limit?: number;
  offset?: number;
}

/**
 * Audit Log
 *
 * Provides immutable audit trail for all orchestrator actions,
 * state transitions, and agent executions.
 */
export class AuditLog {
  private entries: AuditLogEntry[];
  private entriesByDeal: Map<string, string[]>;

  constructor() {
    this.entries = [];
    this.entriesByDeal = new Map();
  }

  /**
   * Log deal creation
   */
  logDealCreation(deal: Deal, actor: string): AuditLogEntry {
    return this.createEntry({
      eventType: AuditEventType.DEAL_CREATED,
      dealId: deal.id,
      actor,
      details: {
        stage: deal.stage,
        leadEmail: deal.leadEmail,
        leadName: deal.leadName,
        leadCompany: deal.leadCompany,
        source: deal.source,
      },
    });
  }

  /**
   * Log state transition
   */
  logStateTransition(
    dealId: string,
    transition: StateTransitionAudit,
    actor: string
  ): AuditLogEntry {
    return this.createEntry({
      eventType: AuditEventType.STAGE_TRANSITION,
      dealId,
      actor,
      details: {
        fromStage: transition.fromStage,
        toStage: transition.toStage,
        reason: transition.reason,
        requiresApproval: transition.requiresApproval,
        retryCount: transition.retryCount,
      },
    });
  }

  /**
   * Log agent execution
   */
  logAgentExecution(
    dealId: string,
    execution: AgentExecutionAudit,
    actor: string
  ): AuditLogEntry {
    return this.createEntry({
      eventType: AuditEventType.AGENT_EXECUTION,
      dealId,
      actor,
      details: {
        agentType: execution.agentType,
        executionId: execution.executionId,
        success: execution.success,
        error: execution.error,
        output: execution.output,
      },
      metadata: {
        executionId: execution.executionId,
        duration: execution.duration,
        success: execution.success,
      },
    });
  }

  /**
   * Log agent handoff
   */
  logAgentHandoff(dealId: string, handoff: AgentHandoff, actor: string): AuditLogEntry {
    return this.createEntry({
      eventType: AuditEventType.AGENT_HANDOFF,
      dealId,
      actor,
      details: {
        fromAgent: handoff.fromAgent,
        toAgent: handoff.toAgent,
        reason: handoff.reason,
        context: handoff.context,
      },
    });
  }

  /**
   * Log approval request
   */
  logApprovalRequest(
    dealId: string,
    approvalId: string,
    reason: string,
    actor: string
  ): AuditLogEntry {
    return this.createEntry({
      eventType: AuditEventType.APPROVAL_REQUESTED,
      dealId,
      actor,
      details: {
        approvalId,
        reason,
      },
    });
  }

  /**
   * Log approval decision
   */
  logApprovalDecision(
    dealId: string,
    approvalId: string,
    approved: boolean,
    reviewer: string,
    comment?: string
  ): AuditLogEntry {
    return this.createEntry({
      eventType: AuditEventType.APPROVAL_DECISION,
      dealId,
      actor: reviewer,
      details: {
        approvalId,
        approved,
        comment,
      },
    });
  }

  /**
   * Log error
   */
  logError(
    dealId: string,
    errorCode: string,
    message: string,
    actor: string,
    context?: Record<string, unknown>
  ): AuditLogEntry {
    return this.createEntry({
      eventType: AuditEventType.ERROR_OCCURRED,
      dealId,
      actor,
      details: {
        errorCode,
        message,
        context,
      },
      metadata: {
        errorCode,
        success: false,
      },
    });
  }

  /**
   * Log retry attempt
   */
  logRetryAttempt(
    dealId: string,
    attemptNumber: number,
    maxRetries: number,
    actor: string
  ): AuditLogEntry {
    return this.createEntry({
      eventType: AuditEventType.RETRY_ATTEMPT,
      dealId,
      actor,
      details: {
        attemptNumber,
        maxRetries,
      },
    });
  }

  /**
   * Log system event
   */
  logSystemEvent(
    dealId: string,
    event: string,
    actor: string,
    details?: Record<string, unknown>
  ): AuditLogEntry {
    return this.createEntry({
      eventType: AuditEventType.SYSTEM_EVENT,
      dealId,
      actor,
      details: {
        event,
        ...details,
      },
    });
  }

  /**
   * Create audit log entry
   */
  private createEntry(input: {
    eventType: AuditEventType;
    dealId: string;
    actor: string;
    details: Record<string, unknown>;
    metadata?: {
      executionId?: string;
      duration?: number;
      success?: boolean;
      errorCode?: string;
    };
  }): AuditLogEntry {
    const entry: AuditLogEntry = {
      id: this.generateEntryId(),
      timestamp: new Date(),
      eventType: input.eventType,
      dealId: input.dealId,
      actor: input.actor,
      details: input.details,
      metadata: input.metadata,
    };

    this.entries.push(entry);

    // Index by deal
    const dealEntries = this.entriesByDeal.get(input.dealId) || [];
    dealEntries.push(entry.id);
    this.entriesByDeal.set(input.dealId, dealEntries);

    return entry;
  }

  /**
   * Query audit log
   */
  query(query: AuditLogQuery): AuditLogEntry[] {
    let results = [...this.entries];

    // Filter by deal ID
    if (query.dealId) {
      const dealEntryIds = this.entriesByDeal.get(query.dealId) || [];
      results = results.filter(entry => dealEntryIds.includes(entry.id));
    }

    // Filter by event type
    if (query.eventType) {
      results = results.filter(entry => entry.eventType === query.eventType);
    }

    // Filter by agent type
    if (query.agentType) {
      results = results.filter(entry => {
        const agentType = entry.details.agentType as AgentType | undefined;
        return agentType === query.agentType;
      });
    }

    // Filter by date range
    if (query.startDate) {
      results = results.filter(entry => entry.timestamp >= query.startDate!);
    }
    if (query.endDate) {
      results = results.filter(entry => entry.timestamp <= query.endDate!);
    }

    // Sort by timestamp descending
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    if (query.offset) {
      results = results.slice(query.offset);
    }
    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * Get audit trail for a deal
   */
  getDealAuditTrail(dealId: string): AuditLogEntry[] {
    return this.query({ dealId });
  }

  /**
   * Get recent entries
   */
  getRecentEntries(limit = 100): AuditLogEntry[] {
    return this.query({ limit });
  }

  /**
   * Get entries by event type
   */
  getEntriesByType(eventType: AuditEventType, limit?: number): AuditLogEntry[] {
    return this.query({ eventType, limit });
  }

  /**
   * Export audit log
   */
  exportAuditLog(query?: AuditLogQuery): string {
    const entries = query ? this.query(query) : this.entries;
    return JSON.stringify(entries, null, 2);
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalEntries: number;
    entriesByType: Record<string, number>;
    entriesByDeal: number;
    dateRange: { oldest?: Date; newest?: Date };
  } {
    const entriesByType: Record<string, number> = {};

    this.entries.forEach(entry => {
      entriesByType[entry.eventType] = (entriesByType[entry.eventType] || 0) + 1;
    });

    const timestamps = this.entries.map(e => e.timestamp);
    const oldest = timestamps.length > 0 ? timestamps[0] : undefined;
    const newest =
      timestamps.length > 0 ? timestamps[timestamps.length - 1] : undefined;

    return {
      totalEntries: this.entries.length,
      entriesByType,
      entriesByDeal: this.entriesByDeal.size,
      dateRange: {
        oldest: this.entries.length > 0 ? this.entries[0].timestamp : undefined,
        newest:
          this.entries.length > 0
            ? this.entries[this.entries.length - 1].timestamp
            : undefined,
      },
    };
  }

  /**
   * Clear old entries
   */
  clearOldEntries(olderThanDays: number): number {
    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    const initialCount = this.entries.length;

    this.entries = this.entries.filter(entry => {
      const keep = entry.timestamp.getTime() > cutoff;
      if (!keep) {
        const dealEntries = this.entriesByDeal.get(entry.dealId);
        if (dealEntries) {
          const index = dealEntries.indexOf(entry.id);
          if (index > -1) {
            dealEntries.splice(index, 1);
          }
          if (dealEntries.length === 0) {
            this.entriesByDeal.delete(entry.dealId);
          }
        }
      }
      return keep;
    });

    return initialCount - this.entries.length;
  }

  /**
   * Generate unique entry ID
   */
  private generateEntryId(): string {
    return `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get total entry count
   */
  size(): number {
    return this.entries.length;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries = [];
    this.entriesByDeal.clear();
  }
}
