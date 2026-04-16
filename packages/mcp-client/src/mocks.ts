import type {
  Deal,
  DealInput,
  DealStage,
  EmailMessage,
  Thread,
  CalendarEvent,
  DocumentTemplate,
  GeneratedDocument,
} from '@closepilot/core';

/**
 * Mock DealStoreClient for testing
 * Used by Jules agents to test without connecting to real MCP server
 */
export class MockDealStoreClient {
  private connected = false;
  private deals = new Map<string, Deal>();
  private dealCounter = 1;

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async listTools(): Promise<any[]> {
    return [];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<any> {
    // Simulate deal creation
    if (name === 'create_deal') {
      const input = args.input as DealInput;
      const deal: Deal = {
        id: `deal-${this.dealCounter++}`,
        stage: 'ingestion' as DealStage,
        createdAt: new Date(),
        updatedAt: new Date(),
        leadEmail: input.leadEmail,
        leadName: input.leadName,
        leadCompany: input.leadCompany,
        leadTitle: input.leadTitle,
        threadId: input.threadId,
        initialEmailId: input.initialEmailId,
        source: input.source,
      };
      this.deals.set(deal.id, deal);
      return { content: deal };
    }

    // Simulate getting a deal
    if (name === 'get_deal') {
      const dealId = args.dealId as string;
      const deal = this.deals.get(dealId);
      return { content: deal || null };
    }

    if (name === 'update_deal') {
      const dealId = args.dealId as string;
      const updates = args.updates as Partial<Deal>;
      const deal = this.deals.get(dealId);
      if (deal) {
        const updatedDeal = { ...deal, ...updates, updatedAt: new Date() };
        this.deals.set(dealId, updatedDeal);
        return { content: updatedDeal };
      }
      return { content: null };
    }

    // Simulate updating deal stage
    if (name === 'update_deal_stage') {
      const dealId = args.dealId as string;
      const stage = args.stage as DealStage;
      const deal = this.deals.get(dealId);
      if (deal) {
        deal.stage = stage;
        deal.updatedAt = new Date();
        this.deals.set(dealId, deal);
        return { content: deal };
      }
      return { content: null };
    }

    if (name === 'query_deals_by_stage') {
      const stage = args.stage as DealStage;
      const dealsList = Array.from(this.deals.values()).filter(d => d.stage === stage);
      return { content: dealsList };
    }

    if (name === 'query_deals_by_date_range') {
      const start = new Date(args.startDate as string);
      const end = new Date(args.endDate as string);
      const dealsList = Array.from(this.deals.values()).filter(
        d => d.createdAt >= start && d.createdAt <= end
      );
      return { content: dealsList };
    }

    if (name === 'get_pending_approvals') {
      const dealsList = Array.from(this.deals.values()).filter(d => d.approvalStatus === 'pending');
      return { content: dealsList };
    }

    if (name === 'approve_deal') {
      const dealId = args.dealId as string;
      const deal = this.deals.get(dealId);
      if (deal) {
        deal.approvalStatus = 'approved';
        deal.updatedAt = new Date();
        this.deals.set(dealId, deal);
        return { content: deal };
      }
      return { content: null };
    }

    if (name === 'reject_deal') {
      const dealId = args.dealId as string;
      const deal = this.deals.get(dealId);
      if (deal) {
        deal.approvalStatus = 'rejected';
        deal.updatedAt = new Date();
        this.deals.set(dealId, deal);
        return { content: deal };
      }
      return { content: null };
    }

    if (name === 'search_similar_deals') {
      const query = (args.query as string).toLowerCase();
      const limit = args.limit as number || 5;
      const dealsList = Array.from(this.deals.values()).filter(d =>
        (d.leadCompany && d.leadCompany.toLowerCase().includes(query)) ||
        (d.leadName && d.leadName.toLowerCase().includes(query))
      ).slice(0, limit);
      return { content: dealsList };
    }

    // Default mock response
    return { content: null };
  }

  /**
   * Helper method to get a deal directly (for testing)
   */
  getDeal(id: string): Deal | undefined {
    return this.deals.get(id);
  }

  /**
   * Helper method to add a deal (for testing)
   */
  addDeal(deal: Deal): void {
    this.deals.set(deal.id, deal);
  }
}

/**
 * Create a mock client for testing
 */
export async function createMockDealStoreClient(): Promise<MockDealStoreClient> {
  const client = new MockDealStoreClient();
  await client.connect();
  return client;
}
