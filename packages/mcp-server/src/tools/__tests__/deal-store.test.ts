import { describe, it, expect, beforeEach } from 'vitest';
import { MockDealStoreClient } from '@closepilot/mcp-client/src/mocks';
import { DealStage } from '@closepilot/core';

describe('Deal Store Tools', () => {
  let client: MockDealStoreClient;

  beforeEach(() => {
    client = new MockDealStoreClient();
  });

  it('should create a deal', async () => {
    const result = await client.callTool('create_deal', {
      input: {
        leadEmail: 'test@example.com',
        leadName: 'Test User',
        source: 'manual'
      }
    });

    expect(result.content).toBeDefined();
    expect(result.content.leadEmail).toBe('test@example.com');
  });

  it('should get a deal', async () => {
    const created = await client.callTool('create_deal', {
      input: {
        leadEmail: 'test2@example.com',
        leadName: 'Test User 2',
        source: 'manual'
      }
    });

    const result = await client.callTool('get_deal', {
      dealId: created.content.id
    });

    expect(result.content).toBeDefined();
    expect(result.content.id).toBe(created.content.id);
  });

  it('should update a deal', async () => {
    const created = await client.callTool('create_deal', {
      input: {
        leadEmail: 'test@example.com',
        leadName: 'Test User',
        source: 'manual'
      }
    });

    const result = await client.callTool('update_deal', {
      dealId: created.content.id,
      updates: {
        leadCompany: 'Test Co'
      }
    });

    expect(result.content).toBeDefined();
    expect(result.content.leadCompany).toBe('Test Co');
  });

  it('should update deal stage', async () => {
    const created = await client.callTool('create_deal', {
      input: {
        leadEmail: 'test@example.com',
        leadName: 'Test User',
        source: 'manual'
      }
    });

    const result = await client.callTool('update_deal_stage', {
      dealId: created.content.id,
      stage: DealStage.ENRICHMENT
    });

    expect(result.content).toBeDefined();
    expect(result.content.stage).toBe(DealStage.ENRICHMENT);
  });

  it('should query deals by stage', async () => {
    await client.callTool('create_deal', {
      input: { leadEmail: '1@ex.com', leadName: 'U1', source: 'manual' }
    });

    const result = await client.callTool('query_deals_by_stage', {
      stage: DealStage.INGESTION
    });

    expect(result.content.length).toBeGreaterThan(0);
    expect(result.content[0].stage).toBe(DealStage.INGESTION);
  });

  it('should query deals by date range', async () => {
    await client.callTool('create_deal', {
      input: { leadEmail: '1@ex.com', leadName: 'U1', source: 'manual' }
    });

    const start = new Date();
    start.setDate(start.getDate() - 1);
    const end = new Date();
    end.setDate(end.getDate() + 1);

    const result = await client.callTool('query_deals_by_date_range', {
      startDate: start.toISOString(),
      endDate: end.toISOString()
    });

    expect(result.content.length).toBeGreaterThan(0);
  });

  it('should get pending approvals', async () => {
    const created = await client.callTool('create_deal', {
      input: { leadEmail: '1@ex.com', leadName: 'U1', source: 'manual' }
    });

    await client.callTool('update_deal', {
      dealId: created.content.id,
      updates: { approvalStatus: 'pending' }
    });

    const result = await client.callTool('get_pending_approvals', {});

    expect(result.content.length).toBe(1);
    expect(result.content[0].approvalStatus).toBe('pending');
  });

  it('should approve a deal', async () => {
    const created = await client.callTool('create_deal', {
      input: { leadEmail: '1@ex.com', leadName: 'U1', source: 'manual' }
    });

    const result = await client.callTool('approve_deal', {
      dealId: created.content.id,
      approverComment: 'Looks good'
    });

    expect(result.content.approvalStatus).toBe('approved');
  });

  it('should reject a deal', async () => {
    const created = await client.callTool('create_deal', {
      input: { leadEmail: '1@ex.com', leadName: 'U1', source: 'manual' }
    });

    const result = await client.callTool('reject_deal', {
      dealId: created.content.id,
      reason: 'Missing data'
    });

    expect(result.content.approvalStatus).toBe('rejected');
  });

  it('should search similar deals', async () => {
    await client.callTool('create_deal', {
      input: { leadEmail: '1@ex.com', leadName: 'U1', leadCompany: 'OpenAI', source: 'manual' }
    });

    const result = await client.callTool('search_similar_deals', {
      query: 'openai',
      limit: 5
    });

    expect(result.content.length).toBe(1);
    expect(result.content[0].leadCompany).toBe('OpenAI');
  });
});
