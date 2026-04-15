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
