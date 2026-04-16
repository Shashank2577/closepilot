import { DealStage, AgentType } from '@closepilot/core';

export interface AuditEntry {
  id: string;
  dealId: string;
  timestamp: number;
  type: 'STAGE_CHANGE' | 'AGENT_EXECUTION' | 'APPROVAL_STATUS_CHANGE';
  details: Record<string, any>;
}

export class AuditLog {
  private logs: AuditEntry[] = [];

  public logStageChange(dealId: string, fromStage: DealStage, toStage: DealStage): void {
    this.logs.push({
      id: Math.random().toString(36).substring(7),
      dealId,
      timestamp: Date.now(),
      type: 'STAGE_CHANGE',
      details: { fromStage, toStage }
    });
  }

  public logAgentExecution(dealId: string, agentType: AgentType, success: boolean, durationMs: number): void {
    this.logs.push({
      id: Math.random().toString(36).substring(7),
      dealId,
      timestamp: Date.now(),
      type: 'AGENT_EXECUTION',
      details: { agentType, success, durationMs }
    });
  }

  public logApprovalStatus(dealId: string, status: 'pending' | 'approved' | 'rejected', amount: number): void {
    this.logs.push({
      id: Math.random().toString(36).substring(7),
      dealId,
      timestamp: Date.now(),
      type: 'APPROVAL_STATUS_CHANGE',
      details: { status, amount }
    });
  }

  public getLogsForDeal(dealId: string): AuditEntry[] {
    return this.logs.filter(log => log.dealId === dealId);
  }

  public getAllLogs(): AuditEntry[] {
    return [...this.logs];
  }
}
