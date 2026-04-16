import { Deal, DealStage } from '@closepilot/core';

/**
 * Approval status
 */
export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

/**
 * Approval request
 */
export interface ApprovalRequest {
  id: string;
  dealId: string;
  deal: Deal;
  reason: string;
  proposalAmount: number;
  requestedAt: Date;
  requestedBy: string;
  status: ApprovalStatus;
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewComment?: string;
}

/**
 * Approval decision
 */
export interface ApprovalDecision {
  approvalId: string;
  approved: boolean;
  reviewer: string;
  comment?: string;
  reviewedAt: Date;
}

/**
 * Approval queue statistics
 */
export interface ApprovalQueueStats {
  pending: number;
  approved: number;
  rejected: number;
  averageWaitTime: number;
  oldestPending?: Date;
}

/**
 * Approval Queue Manager
 *
 * Manages approval queue for high-value proposals,
 * processes approval decisions, and tracks approval history.
 */
export class ApprovalQueueManager {
  private queue: Map<string, ApprovalRequest>;
  private approvalsByDeal: Map<string, string>;

  constructor() {
    this.queue = new Map();
    this.approvalsByDeal = new Map();
  }

  /**
   * Add deal to approval queue
   */
  async addToQueue(
    deal: Deal,
    reason: string,
    requestedBy: string
  ): Promise<ApprovalRequest> {
    // Check if deal already has a pending approval
    const existingApprovalId = this.approvalsByDeal.get(deal.id);
    if (existingApprovalId) {
      const existing = this.queue.get(existingApprovalId);
      if (existing && existing.status === ApprovalStatus.PENDING) {
        throw new Error(`Deal ${deal.id} already has a pending approval request`);
      }
    }

    const approvalId = this.generateApprovalId(deal.id);

    const request: ApprovalRequest = {
      id: approvalId,
      dealId: deal.id,
      deal,
      reason,
      proposalAmount: deal.proposal?.pricing.total || 0,
      requestedAt: new Date(),
      requestedBy,
      status: ApprovalStatus.PENDING,
    };

    this.queue.set(approvalId, request);
    this.approvalsByDeal.set(deal.id, approvalId);

    return request;
  }

  /**
   * Get approval request by ID
   */
  getApproval(approvalId: string): ApprovalRequest | undefined {
    return this.queue.get(approvalId);
  }

  /**
   * Get approval request by deal ID
   */
  getApprovalByDeal(dealId: string): ApprovalRequest | undefined {
    const approvalId = this.approvalsByDeal.get(dealId);
    if (approvalId) {
      return this.queue.get(approvalId);
    }
    return undefined;
  }

  /**
   * Process approval decision
   */
  async processApproval(decision: ApprovalDecision): Promise<ApprovalRequest> {
    const request = this.queue.get(decision.approvalId);
    if (!request) {
      throw new Error(`Approval request ${decision.approvalId} not found`);
    }

    if (request.status !== ApprovalStatus.PENDING) {
      throw new Error(
        `Approval request ${decision.approvalId} is not pending (current status: ${request.status})`
      );
    }

    // Update request with decision
    request.status = decision.approved
      ? ApprovalStatus.APPROVED
      : ApprovalStatus.REJECTED;
    request.reviewedAt = decision.reviewedAt;
    request.reviewedBy = decision.reviewer;
    request.reviewComment = decision.comment;

    this.queue.set(decision.approvalId, request);

    // TODO: Notify relevant agents of approval decision
    await this.notifyApprovalDecision(request);

    return request;
  }

  /**
   * Get all pending approvals
   */
  getPendingApprovals(): ApprovalRequest[] {
    return Array.from(this.queue.values()).filter(
      req => req.status === ApprovalStatus.PENDING
    );
  }

  /**
   * Get approvals by status
   */
  getApprovalsByStatus(status: ApprovalStatus): ApprovalRequest[] {
    return Array.from(this.queue.values()).filter(req => req.status === status);
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): ApprovalQueueStats {
    const approvals = Array.from(this.queue.values());
    const pending = approvals.filter(a => a.status === ApprovalStatus.PENDING);
    const approved = approvals.filter(a => a.status === ApprovalStatus.APPROVED);
    const rejected = approvals.filter(a => a.status === ApprovalStatus.REJECTED);

    // Calculate average wait time for completed approvals
    const completed = [...approved, ...rejected];
    const averageWaitTime =
      completed.length > 0
        ? completed.reduce((sum, a) => {
            const waitTime = a.reviewedAt!.getTime() - a.requestedAt.getTime();
            return sum + waitTime;
          }, 0) / completed.length
        : 0;

    // Find oldest pending approval
    const oldestPending =
      pending.length > 0
        ? pending.reduce((oldest, current) =>
            current.requestedAt < oldest.requestedAt ? current : oldest
          ).requestedAt
        : undefined;

    return {
      pending: pending.length,
      approved: approved.length,
      rejected: rejected.length,
      averageWaitTime,
      oldestPending,
    };
  }

  /**
   * Check if deal requires approval
   */
  requiresApproval(deal: Deal): boolean {
    if (deal.stage === DealStage.PROPOSAL && deal.proposal) {
      const threshold = 50000;
      return deal.proposal.pricing.total >= threshold;
    }
    return false;
  }

  /**
   * Remove old completed approvals from queue
   */
  cleanup(olderThanDays = 30): number {
    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    let removed = 0;

    for (const [approvalId, request] of this.queue.entries()) {
      if (
        request.status !== ApprovalStatus.PENDING &&
        request.requestedAt.getTime() < cutoff
      ) {
        this.queue.delete(approvalId);
        this.approvalsByDeal.delete(request.dealId);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Get approval history for a deal
   */
  getDealApprovalHistory(dealId: string): ApprovalRequest[] {
    const approvals: ApprovalRequest[] = [];

    for (const request of this.queue.values()) {
      if (request.dealId === dealId) {
        approvals.push(request);
      }
    }

    return approvals.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
  }

  /**
   * Generate unique approval ID
   */
  private generateApprovalId(dealId: string): string {
    return `approval-${dealId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Notify agents of approval decision
   */
  private async notifyApprovalDecision(request: ApprovalRequest): Promise<void> {
    // TODO: Implement agent notification system
    // This will notify the orchestrator and relevant agents
    // of the approval decision so they can proceed or halt
  }

  /**
   * Export approval data for reporting
   */
  exportApprovalData(): ApprovalRequest[] {
    return Array.from(this.queue.values()).sort(
      (a, b) => b.requestedAt.getTime() - a.requestedAt.getTime()
    );
  }

  /**
   * Clear all approvals (useful for testing)
   */
  clear(): void {
    this.queue.clear();
    this.approvalsByDeal.clear();
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.size;
  }
}
