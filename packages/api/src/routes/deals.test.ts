import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { dealsRoutes } from './deals';
import { DealStage } from '@closepilot/core';

// Mock DB queries
vi.mock('@closepilot/db', () => {
  return {
    getDeals: vi.fn(),
    getDealStats: vi.fn(),
    getDeal: vi.fn(),
    createDeal: vi.fn(),
    updateDeal: vi.fn(),
    updateDealStage: vi.fn(),
    searchSimilarDeals: vi.fn(),
    queryDealsByStage: vi.fn()
  };
});

import {
  getDeals,
  getDealStats,
  getDeal,
  createDeal,
  updateDeal,
  updateDealStage,
  searchSimilarDeals,
  queryDealsByStage
} from '@closepilot/db';

const app = new Hono();
app.route('/api/deals', dealsRoutes);

describe('Deals Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET Endpoints', () => {
    it('GET /api/deals should return list of deals', async () => {
      const mockDeals = [{ id: '1', title: 'Deal 1' }];
      vi.mocked(getDeals).mockResolvedValue(mockDeals as any);

      const req = new Request('http://localhost/api/deals?limit=10&offset=0');
      const res = await app.request(req);

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(mockDeals);
    });

    it('GET /api/deals/stats should return stats', async () => {
      const mockStats = { ingestion: 5 };
      vi.mocked(getDealStats).mockResolvedValue(mockStats);

      const req = new Request('http://localhost/api/deals/stats');
      const res = await app.request(req);

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(mockStats);
    });

    it('GET /api/deals/search/similar should return similar deals', async () => {
      const mockDeals = [{ id: '1' }];
      vi.mocked(searchSimilarDeals).mockResolvedValue(mockDeals as any);

      const req = new Request('http://localhost/api/deals/search/similar?q=test&limit=5');
      const res = await app.request(req);

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(mockDeals);
    });

    it('GET /api/deals/search/similar without query should fail', async () => {
      const req = new Request('http://localhost/api/deals/search/similar');
      const res = await app.request(req);
      expect(res.status).toBe(400);
    });

    it('GET /api/deals/stage/:stage should return deals by stage', async () => {
      const mockDeals = [{ id: '1' }];
      vi.mocked(queryDealsByStage).mockResolvedValue(mockDeals as any);

      const req = new Request('http://localhost/api/deals/stage/ingestion');
      const res = await app.request(req);

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(mockDeals);
    });

    it('GET /api/deals/stage/:stage with invalid stage should fail', async () => {
      const req = new Request('http://localhost/api/deals/stage/invalid_stage');
      const res = await app.request(req);
      expect(res.status).toBe(400);
    });

    it('GET /api/deals/:id should return specific deal', async () => {
      const mockDeal = { id: '1' };
      vi.mocked(getDeal).mockResolvedValue(mockDeal as any);

      const req = new Request('http://localhost/api/deals/1');
      const res = await app.request(req);

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(mockDeal);
    });

    it('GET /api/deals/:id should return 404 if not found', async () => {
      vi.mocked(getDeal).mockResolvedValue(null);

      const req = new Request('http://localhost/api/deals/999');
      const res = await app.request(req);
      expect(res.status).toBe(404);
    });
  });

  describe('Mutation Endpoints', () => {
    it('POST /api/deals should create a deal', async () => {
      const input = {
        leadEmail: 'test@example.com',
        leadName: 'Test User',
        source: 'manual'
      };
      const mockDeal = { id: '1', ...input };
      vi.mocked(createDeal).mockResolvedValue(mockDeal as any);

      const req = new Request('http://localhost/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
      const res = await app.request(req);

      expect(res.status).toBe(201);
      expect(await res.json()).toEqual(mockDeal);
    });

    it('POST /api/deals should validate input', async () => {
      const input = { leadName: 'Test User' }; // Missing email and source
      const req = new Request('http://localhost/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
      const res = await app.request(req);

      expect(res.status).toBe(400);
    });

    it('PUT /api/deals/:id should update a deal', async () => {
      const updates = { leadName: 'Updated Name' };
      const mockDeal = { id: '1', ...updates };
      vi.mocked(updateDeal).mockResolvedValue(mockDeal as any);

      const req = new Request('http://localhost/api/deals/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const res = await app.request(req);

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(mockDeal);
    });

    it('PUT /api/deals/:id should validate updates', async () => {
      const updates = { leadEmail: 'invalid-email' };
      const req = new Request('http://localhost/api/deals/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const res = await app.request(req);

      expect(res.status).toBe(400);
    });

    it('PATCH /api/deals/:id/stage should update deal stage', async () => {
      const input = { stage: 'scoping', reason: 'Ready to scope' };
      const mockDeal = { id: '1', stage: 'scoping' };
      vi.mocked(updateDealStage).mockResolvedValue(mockDeal as any);

      const req = new Request('http://localhost/api/deals/1/stage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
      const res = await app.request(req);

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(mockDeal);
    });

    it('PATCH /api/deals/:id/stage should validate stage', async () => {
      const input = { stage: 'invalid_stage' };
      const req = new Request('http://localhost/api/deals/1/stage', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
      const res = await app.request(req);

      expect(res.status).toBe(400);
    });

    it('DELETE /api/deals/:id should soft delete a deal to failed stage', async () => {
      const mockDeal = { id: '1', stage: 'failed' };
      vi.mocked(updateDealStage).mockResolvedValue(mockDeal as any);

      const req = new Request('http://localhost/api/deals/1', {
        method: 'DELETE'
      });
      const res = await app.request(req);

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual(mockDeal);
    });
  });
});
