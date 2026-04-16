import { Deal } from '@closepilot/core';

export interface ApprovalRequest {
  dealId: string;
  amount: number;
  requestedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  deal: Deal;
}

export class ApprovalQueue {
  private queue: Map<string, ApprovalRequest> = new Map();
  private readonly APPROVAL_THRESHOLD = 50000;

  public requiresApproval(deal: Deal): boolean {
    if (!deal.proposal?.pricing?.total) {
      return false;
    }
    return deal.proposal.pricing.total > this.APPROVAL_THRESHOLD;
  }

  public enqueue(deal: Deal): ApprovalRequest {
    if (!deal.proposal?.pricing?.total) {
      throw new Error('Deal does not have a proposal pricing total');
    }

    const request: ApprovalRequest = {
      dealId: deal.id,
      amount: deal.proposal.pricing.total,
      requestedAt: new Date(),
      status: 'pending',
      deal,
    };

    this.queue.set(deal.id, request);
    return request;
  }

  public getPendingRequests(): ApprovalRequest[] {
    return Array.from(this.queue.values()).filter(req => req.status === 'pending');
  }

  public approve(dealId: string): void {
    const request = this.queue.get(dealId);
    if (!request) {
      throw new Error(`Approval request for deal ${dealId} not found`);
    }
    request.status = 'approved';
  }

  public reject(dealId: string): void {
    const request = this.queue.get(dealId);
    if (!request) {
      throw new Error(`Approval request for deal ${dealId} not found`);
    }
    request.status = 'rejected';
  }

  public getRequest(dealId: string): ApprovalRequest | undefined {
    return this.queue.get(dealId);
  }
}
