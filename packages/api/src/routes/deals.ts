import { Hono } from 'hono';
import { DealStage } from '@closepilot/core';
import type { Deal, DealInput } from '@closepilot/core';
import { z } from 'zod';
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

/**
 * Deal CRUD endpoints
 * These are stub implementations - will be completed by Jules session J-111
 */

// Validation Schemas
export const dealInputSchema = z.object({
  leadEmail: z.string().email(),
  leadName: z.string().min(1),
  leadCompany: z.string().optional(),
  leadTitle: z.string().optional(),
  threadId: z.string().optional(),
  initialEmailId: z.string().optional(),
  source: z.enum(['gmail', 'manual', 'other'])
});

export const updateDealSchema = dealInputSchema.partial().extend({
  assignedAgent: z.string().optional(),
  approvalStatus: z.enum(['pending', 'approved', 'rejected']).optional()
});

export const updateStageSchema = z.object({
  stage: z.nativeEnum(DealStage),
  reason: z.string().optional()
});

export const dealsRoutes = new Hono();

// Get all deals
dealsRoutes.get('/', async (c) => {
  try {
    const stage = c.req.query('stage');
    const source = c.req.query('source');
    const limit = parseInt(c.req.query('limit') || '10');
    const offset = parseInt(c.req.query('offset') || '0');
    const sort = c.req.query('sort') || 'createdAt';
    const order = c.req.query('order') || 'desc';

    const filters = { stage, source };
    const pagination = { limit, offset };
    const sorting = { sort, order };

    const deals = await getDeals(filters, pagination, sorting);
    return c.json(deals);
  } catch (error) {
    return c.json({ error: 'Failed to fetch deals' }, 500);
  }
});

// Get deals stats
dealsRoutes.get('/stats', async (c) => {
  try {
    const stats = await getDealStats();
    return c.json(stats);
  } catch (error) {
    return c.json({ error: 'Failed to fetch deal stats' }, 500);
  }
});

// Search similar deals
dealsRoutes.get('/search/similar', async (c) => {
  try {
    const query = c.req.query('q');
    if (!query) {
      return c.json({ error: 'Query parameter "q" is required' }, 400);
    }
    const limit = parseInt(c.req.query('limit') || '5');

    const deals = await searchSimilarDeals(query, limit);
    return c.json(deals);
  } catch (error) {
    return c.json({ error: 'Failed to search deals' }, 500);
  }
});

// Get deals by stage
dealsRoutes.get('/stage/:stage', async (c) => {
  try {
    const stageParam = c.req.param('stage');
    // Ensure it's a valid stage before passing (though DB function might also validate)
    if (!Object.values(DealStage).includes(stageParam as DealStage)) {
       return c.json({ error: 'Invalid stage parameter' }, 400);
    }
    const stage = stageParam as DealStage;
    const deals = await queryDealsByStage(stage);
    return c.json(deals);
  } catch (error) {
    return c.json({ error: 'Failed to fetch deals by stage' }, 500);
  }
});

// Get a specific deal
dealsRoutes.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const deal = await getDeal(id);
    if (!deal) {
      return c.json({ error: 'Deal not found' }, 404);
    }
    return c.json(deal);
  } catch (error) {
    return c.json({ error: 'Failed to fetch deal' }, 500);
  }
});

// Create a new deal
dealsRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const result = dealInputSchema.safeParse(body);

    if (!result.success) {
      return c.json({ error: 'Validation failed', details: result.error.format() }, 400);
    }

    const newDeal = await createDeal(result.data as any);
    return c.json(newDeal, 201);
  } catch (error) {
    return c.json({ error: 'Failed to create deal' }, 500);
  }
});

// Update a deal
dealsRoutes.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const result = updateDealSchema.safeParse(body);

    if (!result.success) {
      return c.json({ error: 'Validation failed', details: result.error.format() }, 400);
    }

    const updatedDeal = await updateDeal(id, result.data);
    return c.json(updatedDeal);
  } catch (error) {
    return c.json({ error: 'Failed to update deal' }, 500);
  }
});

// Update deal stage
dealsRoutes.patch('/:id/stage', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const result = updateStageSchema.safeParse(body);

    if (!result.success) {
      return c.json({ error: 'Validation failed', details: result.error.format() }, 400);
    }

    const { stage, reason } = result.data;
    const updatedDeal = await updateDealStage(id, stage, reason);
    return c.json(updatedDeal);
  } catch (error) {
    return c.json({ error: 'Failed to update deal stage' }, 500);
  }
});

// Delete a deal (soft delete to failed)
dealsRoutes.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const updatedDeal = await updateDealStage(id, DealStage.FAILED, 'Soft deleted');
    return c.json(updatedDeal);
  } catch (error) {
    return c.json({ error: 'Failed to delete deal' }, 500);
  }
});
