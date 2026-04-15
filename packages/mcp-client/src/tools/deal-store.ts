import type { Deal, DealInput, DealStage } from '@closepilot/core';
import { DealStoreClient } from '../client.js';

/**
 * Deal Store MCP Tools
 * Typed wrappers for deal database operations
 */
export class DealStoreTools {
  constructor(private client: DealStoreClient) {}

  /**
   * Create a new deal
   */
  async createDeal(input: DealInput): Promise<Deal> {
    const response = await this.client.callTool('create_deal', { input });
    return response.content as Deal;
  }

  /**
   * Get a deal by ID
   */
  async getDeal(dealId: string): Promise<Deal | null> {
    const response = await this.client.callTool('get_deal', { dealId });
    return response.content as Deal | null;
  }

  /**
   * Update deal stage
   */
  async updateDealStage(
    dealId: string,
    stage: DealStage,
    reason?: string
  ): Promise<Deal> {
    const response = await this.client.callTool('update_deal_stage', {
      dealId,
      stage,
      reason,
    });
    return response.content as Deal;
  }

  /**
   * Update deal data
   */
  async updateDeal(
    dealId: string,
    updates: Partial<Deal>
  ): Promise<Deal> {
    const response = await this.client.callTool('update_deal', {
      dealId,
      updates,
    });
    return response.content as Deal;
  }

  /**
   * Query deals by stage
   */
  async queryDealsByStage(stage: DealStage): Promise<Deal[]> {
    const response = await this.client.callTool('query_deals_by_stage', {
      stage,
    });
    return response.content as Deal[];
  }

  /**
   * Query deals by date range
   */
  async queryDealsByDateRange(startDate: Date, endDate: Date): Promise<Deal[]> {
    const response = await this.client.callTool('query_deals_by_date_range', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
    return response.content as Deal[];
  }

  /**
   * Get deals pending approval
   */
  async getPendingApprovals(): Promise<Deal[]> {
    const response = await this.client.callTool('get_pending_approvals', {});
    return response.content as Deal[];
  }

  /**
   * Approve a deal
   */
  async approveDeal(dealId: string, approverComment?: string): Promise<Deal> {
    const response = await this.client.callTool('approve_deal', {
      dealId,
      approverComment,
    });
    return response.content as Deal;
  }

  /**
   * Reject a deal
   */
  async rejectDeal(dealId: string, reason: string): Promise<Deal> {
    const response = await this.client.callTool('reject_deal', {
      dealId,
      reason,
    });
    return response.content as Deal;
  }

  /**
   * Search deals by similarity (for finding similar past projects)
   */
  async searchSimilarDeals(query: string, limit = 5): Promise<Deal[]> {
    const response = await this.client.callTool('search_similar_deals', {
      query,
      limit,
    });
    return response.content as Deal[];
  }
}
