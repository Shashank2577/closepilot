import { Deal, DealStage, AgentType } from '@closepilot/core';
import { DealStateMachine } from './state-machine';
import { ApprovalQueue } from './approval-queue';
import { Monitor } from './monitor';
import { AuditLog } from './audit-log';
import { ReportingService, PerformanceReport } from './reporting';
import { AgentDispatcher } from './agent-dispatcher';

export class OrchestratorAgent {
  private stateMachine: DealStateMachine;
  private approvalQueue: ApprovalQueue;
  private monitor: Monitor;
  private auditLog: AuditLog;
  private reportingService: ReportingService;
  private dispatcher: AgentDispatcher;

  private activeTasks: Set<Promise<void>> = new Set();
  private MAX_CONCURRENCY = 10; // Handle 10+ deals

  constructor() {
    this.stateMachine = new DealStateMachine();
    this.approvalQueue = new ApprovalQueue();
    this.monitor = new Monitor();
    this.auditLog = new AuditLog();
    this.reportingService = new ReportingService(this.auditLog, this.monitor);
    this.dispatcher = new AgentDispatcher();
  }

  public async processDeal(deal: Deal): Promise<void> {
    // Implement simple backpressure / concurrency control
    while (this.activeTasks.size >= this.MAX_CONCURRENCY) {
      await Promise.race(this.activeTasks);
    }

    const task = this._processDealCycle(deal).finally(() => {
      this.activeTasks.delete(task);
    });
    this.activeTasks.add(task);
  }

  private async _processDealCycle(deal: Deal): Promise<void> {
    this.monitor.trackDealStart(deal);

    let isProcessing = true;
    while (isProcessing) {
      // Check if it's in a terminal state
      if (deal.stage === DealStage.COMPLETED || deal.stage === DealStage.FAILED) {
        this.monitor.trackDealCompletion(deal.id);
        break;
      }

      // Determine next stage
      const nextExpectedStage = this.stateMachine.getNextExpectedStage(deal.stage);
      if (!nextExpectedStage) {
        isProcessing = false;
        break;
      }

      const agentType = this.mapStageToAgent(deal.stage);
      if (!agentType) {
        this._transitionDeal(deal, DealStage.FAILED, 'No suitable agent found for stage');
        break;
      }

      const startTime = Date.now();

      // Dispatch to external agent
      const result = await this.dispatcher.dispatch(agentType, deal);

      const durationMs = Date.now() - startTime;
      this.monitor.trackAgentExecution(agentType, deal.id, durationMs, result.success);
      this.auditLog.logAgentExecution(deal.id, agentType, result.success, durationMs);

      if (result.success && result.nextStage) {
        // If it was the proposal stage and requires approval
        if (result.requiresApproval || (deal.stage === DealStage.PROPOSAL && this.approvalQueue.requiresApproval(deal))) {
          this.approvalQueue.enqueue(deal);
          this.auditLog.logApprovalStatus(deal.id, 'pending', deal.proposal?.pricing?.total || 0);
          isProcessing = false; // Stop automatic progression, wait for manual approval
        } else {
          // Transition safely
          if (this.stateMachine.canTransition(deal.stage, result.nextStage)) {
             this._transitionDeal(deal, result.nextStage);
          } else {
             this._transitionDeal(deal, DealStage.FAILED, 'Invalid state transition requested by agent');
          }
        }
      } else {
        // Failed execution
        this._transitionDeal(deal, DealStage.FAILED, result.errors?.join(', '));
      }
    }
  }

  private _transitionDeal(deal: Deal, toStage: DealStage, reason?: string) {
    const fromStage = deal.stage;
    deal.stage = toStage;
    deal.updatedAt = new Date();

    this.auditLog.logStageChange(deal.id, fromStage, toStage);
    this.monitor.trackDealUpdate(deal);

    if (toStage === DealStage.COMPLETED || toStage === DealStage.FAILED) {
      this.monitor.trackDealCompletion(deal.id);
    }
  }

  public approveDeal(dealId: string): void {
    const request = this.approvalQueue.getRequest(dealId);
    if (!request) throw new Error('No pending approval request found');

    this.approvalQueue.approve(dealId);
    this.auditLog.logApprovalStatus(dealId, 'approved', request.amount);

    // After approval, automatically transition to CRM_SYNC
    if (this.stateMachine.canTransition(request.deal.stage, DealStage.CRM_SYNC)) {
      this._transitionDeal(request.deal, DealStage.CRM_SYNC);
      // Resume the pipeline
      this.processDeal(request.deal);
    }
  }

  public rejectDeal(dealId: string): void {
    const request = this.approvalQueue.getRequest(dealId);
    if (!request) throw new Error('No pending approval request found');

    this.approvalQueue.reject(dealId);
    this.auditLog.logApprovalStatus(dealId, 'rejected', request.amount);

    if (this.stateMachine.canTransition(request.deal.stage, DealStage.FAILED)) {
       this._transitionDeal(request.deal, DealStage.FAILED, 'Proposal rejected by approver');
    }
  }

  public getReport(): PerformanceReport {
    return this.reportingService.generateReport();
  }

  public async waitForAllDeals(): Promise<void> {
    while (this.activeTasks.size > 0) {
      await Promise.all(this.activeTasks);
    }
  }

  private mapStageToAgent(stage: DealStage): AgentType | null {
    switch (stage) {
      case DealStage.INGESTION: return AgentType.INGESTION;
      case DealStage.ENRICHMENT: return AgentType.ENRICHMENT;
      case DealStage.SCOPING: return AgentType.SCOPING;
      case DealStage.PROPOSAL: return AgentType.PROPOSAL;
      case DealStage.CRM_SYNC: return AgentType.CRM_SYNC;
      default: return null;
    }
  }
}

export * from './state-machine';
export * from './approval-queue';
export * from './monitor';
export * from './audit-log';
export * from './reporting';
export * from './agent-dispatcher';
