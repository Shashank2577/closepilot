import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { analyticsRoutes } from './analytics.js';
import * as db from '@closepilot/db';
import { DealStage } from '@closepilot/core';

vi.mock('@closepilot/db', () => ({
  getDealVelocity: vi.fn(),
  getConversionStats: vi.fn(),
}));

describe('Analytics Routes', () => {
  let app: Hono;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono();
    app.route('/api/analytics', analyticsRoutes);
  });

  describe('GET /api/analytics/velocity', () => {
    it('should return 200 and deal velocity data', async () => {
      const mockData = [
        { stage: DealStage.INGESTION, avgDurationMs: 1000, count: 5 },
      ];
      vi.mocked(db.getDealVelocity).mockResolvedValue(mockData);

      const res = await app.request('/api/analytics/velocity');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toEqual(mockData);
      expect(db.getDealVelocity).toHaveBeenCalledTimes(1);
    });

    it('should return 500 on db error', async () => {
      vi.mocked(db.getDealVelocity).mockRejectedValue(new Error('DB error'));

      const res = await app.request('/api/analytics/velocity');
      expect(res.status).toBe(500);

      const data = await res.json();
      expect(data).toHaveProperty('error');
    });
  });

  describe('GET /api/analytics/conversion', () => {
    it('should return 200 and conversion stats data', async () => {
      const mockData = {
        totalDeals: 10,
        completed: 5,
        failed: 3,
        inProgress: 2,
        winRate: 0.625,
      };
      vi.mocked(db.getConversionStats).mockResolvedValue(mockData);

      const res = await app.request('/api/analytics/conversion');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toEqual(mockData);
      expect(db.getConversionStats).toHaveBeenCalledTimes(1);
    });

    it('should return 500 on db error', async () => {
      vi.mocked(db.getConversionStats).mockRejectedValue(new Error('DB error'));

      const res = await app.request('/api/analytics/conversion');
      expect(res.status).toBe(500);

      const data = await res.json();
      expect(data).toHaveProperty('error');
    });
  });
});
