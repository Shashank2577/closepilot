import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleDealStoreToolCall } from '../deal-store';

// Mock @closepilot/db
vi.mock('@closepilot/db', () => ({
  createDeal: vi.fn(),
  getDeal: vi.fn(),
  updateDeal: vi.fn(),
  updateDealStage: vi.fn(),
  queryDealsByStage: vi.fn(),
  queryDealsByDateRange: vi.fn(),
  getPendingApprovals: vi.fn(),
  approveDeal: vi.fn(),
  rejectDeal: vi.fn(),
  searchSimilarDeals: vi.fn(),
}));

import {
  createDeal,
  getDeal,
  updateDealStage,
  queryDealsByStage,
} from '@closepilot/db';

const mockDeal = {
  id: 1,
  leadEmail: 'test@example.com',
  leadName: 'Test User',
  source: 'manual',
  stage: 'ingestion',
  approvalStatus: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

describe('handleDealStoreToolCall', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create_deal', () => {
    it('should create a deal and return MCP content', async () => {
      vi.mocked(createDeal).mockResolvedValue(mockDeal as any);

      const result = await handleDealStoreToolCall('create_deal', {
        input: {
          leadEmail: 'test@example.com',
          leadName: 'Test User',
          source: 'manual',
        },
      });

      expect(result).not.toBeNull();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.leadEmail).toBe('test@example.com');
      expect(createDeal).toHaveBeenCalledWith({
        leadEmail: 'test@example.com',
        leadName: 'Test User',
        source: 'manual',
      });
    });
  });

  describe('get_deal', () => {
    it('should fetch a deal by ID and return MCP content', async () => {
      vi.mocked(getDeal).mockResolvedValue(mockDeal as any);

      const result = await handleDealStoreToolCall('get_deal', { dealId: '1' });

      expect(result).not.toBeNull();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.id).toBe(1);
      expect(getDeal).toHaveBeenCalledWith('1');
    });

    it('should return null content when deal not found', async () => {
      vi.mocked(getDeal).mockResolvedValue(null);

      const result = await handleDealStoreToolCall('get_deal', { dealId: '999' });

      expect(result).not.toBeNull();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toBeNull();
    });
  });

  describe('update_deal_stage', () => {
    it('should update deal stage and return updated deal', async () => {
      const updated = { ...mockDeal, stage: 'scoping' };
      vi.mocked(updateDealStage).mockResolvedValue(updated as any);

      const result = await handleDealStoreToolCall('update_deal_stage', {
        dealId: '1',
        stage: 'scoping',
        reason: 'Ready for scoping',
      });

      expect(result).not.toBeNull();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.stage).toBe('scoping');
      expect(updateDealStage).toHaveBeenCalledWith('1', 'scoping', 'Ready for scoping');
    });

    it('should update stage without reason', async () => {
      const updated = { ...mockDeal, stage: 'enrichment' };
      vi.mocked(updateDealStage).mockResolvedValue(updated as any);

      const result = await handleDealStoreToolCall('update_deal_stage', {
        dealId: '1',
        stage: 'enrichment',
      });

      expect(result).not.toBeNull();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.stage).toBe('enrichment');
    });
  });

  describe('query_deals_by_stage', () => {
    it('should return deals matching the stage', async () => {
      const deals = [mockDeal, { ...mockDeal, id: 2 }];
      vi.mocked(queryDealsByStage).mockResolvedValue(deals as any);

      const result = await handleDealStoreToolCall('query_deals_by_stage', {
        stage: 'ingestion',
      });

      expect(result).not.toBeNull();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].stage).toBe('ingestion');
      expect(queryDealsByStage).toHaveBeenCalledWith('ingestion');
    });

    it('should return empty array when no deals in stage', async () => {
      vi.mocked(queryDealsByStage).mockResolvedValue([]);

      const result = await handleDealStoreToolCall('query_deals_by_stage', {
        stage: 'completed',
      });

      expect(result).not.toBeNull();
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveLength(0);
    });
  });

  describe('unknown tool', () => {
    it('should return null for unknown tool names', async () => {
      const result = await handleDealStoreToolCall('nonexistent_tool', {});
      expect(result).toBeNull();
    });
  });
});
