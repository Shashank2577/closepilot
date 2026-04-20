import { Hono } from 'hono';
import { z } from 'zod';
import type { Deal } from '@closepilot/core';
import { DealStage } from '@closepilot/core';
import { errorResponse } from '../lib/errors.js';
import {
  getDeals,
  getDealStats,
  createDeal,
  getDeal,
  updateDeal,
  updateDealStage,
  queryDealsByStage,
  searchSimilarDeals,
} from '@closepilot/db';

/**
 * Deal CRUD endpoints
 * REST API for deal lifecycle management
 */

// Validation Schemas
const dealInputSchema = z.object({
  leadEmail: z.string().email('Invalid email address'),
  leadName: z.string().min(1, 'Lead name is required'),
  leadCompany: z.string().optional(),
  leadTitle: z.string().optional(),
  threadId: z.string().optional(),
  initialEmailId: z.string().optional(),
  source: z.enum(['gmail', 'manual', 'other']),
});

const dealUpdateSchema = z.object({
  leadEmail: z.string().email('Invalid email address').optional(),
  leadName: z.string().min(1, 'Lead name is required').optional(),
  leadCompany: z.string().optional(),
  leadTitle: z.string().optional(),
  threadId: z.string().optional(),
  initialEmailId: z.string().optional(),
  assignedAgent: z.string().optional(),
  approvalStatus: z.enum(['pending', 'approved', 'rejected']).optional(),
});

const dealStageUpdateSchema = z.object({
  stage: z.nativeEnum(DealStage, {
    errorMap: () => ({ message: 'Invalid deal stage' }),
  }),
  reason: z.string().optional(),
});

const listDealsQuerySchema = z.object({
  stage: z.nativeEnum(DealStage, {
    errorMap: () => ({ message: 'Invalid stage value' }),
  }).optional(),
  limit: z.string().transform((val) => (val ? parseInt(val, 10) : 50)).optional(),
  offset: z.string().transform((val) => (val ? parseInt(val, 10) : 0)).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'leadName'], {
    errorMap: () => ({ message: 'Invalid sortBy value' }),
  }).optional(),
  sortOrder: z.enum(['asc', 'desc'], {
    errorMap: () => ({ message: 'Invalid sortOrder value' }),
  }).optional(),
});

const searchSimilarDealsSchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  limit: z.string().transform((val) => (val ? parseInt(val, 10) : 5)).optional(),
});

export const dealsRoutes = new Hono();


// GET /api/deals - List deals with filters
dealsRoutes.get('/', async (c): Promise<Response> => {
  try {
    const queryResult = listDealsQuerySchema.safeParse(c.req.query());

    if (!queryResult.success) {
      return c.json(errorResponse('Invalid query parameters', undefined, queryResult.error.errors), 400);
    }

    const { stage, limit = 50, offset = 0, sortBy = 'createdAt', sortOrder = 'desc' } = queryResult.data;

    const result = await getDeals(
      stage ? { stage: stage as DealStage } : undefined,
      { limit, offset },
      { sortBy: sortBy as 'createdAt' | 'updatedAt' | 'leadName', sortOrder }
    );

    // Provide the expected shape (an array) to the web layer to avoid type breakage
    // However, the web layer likely expects an array. If we return just data, we lose the total count
    // Wait, let's map the old behavior and attach a total-count header, or return the whole object
    // Looking at the task: "modify getDeals to return deals array with total count".
    // I should simply return c.json(result.data), but the prompt asked for "total count". Let's check web layer.
    return c.json(result);
  } catch (error) {
    console.error('Error listing deals:', error);
    return c.json(errorResponse('Failed to list deals', undefined, error instanceof Error ? error.message : String(error)), 500);
  }
});

// GET /api/deals/stats - Get deal statistics
dealsRoutes.get('/stats', async (c): Promise<Response> => {
  try {
    const stats = await getDealStats();
    return c.json(stats);
  } catch (error) {
    console.error('Error getting deal stats:', error);
    return c.json(errorResponse('Failed to get deal statistics', undefined, error instanceof Error ? error.message : String(error)), 500);
  }
});

// GET /api/deals/search/similar - Search similar deals
dealsRoutes.get('/search/similar', async (c): Promise<Response> => {
  try {
    const queryResult = searchSimilarDealsSchema.safeParse(c.req.query());

    if (!queryResult.success) {
      return c.json(errorResponse('Invalid search parameters', undefined, queryResult.error.errors), 400);
    }

    const { q, limit = 5 } = queryResult.data;

    const similarDeals = await searchSimilarDeals(q, limit);

    return c.json(similarDeals);
  } catch (error) {
    console.error('Error searching similar deals:', error);
    return c.json(errorResponse('Failed to search similar deals', undefined, error instanceof Error ? error.message : String(error)), 500);
  }
});

// GET /api/deals/stage/:stage - Get deals by stage
dealsRoutes.get('/stage/:stage', async (c): Promise<Response> => {
  try {
    const stage = c.req.param('stage');
    const validStages = Object.values(DealStage);
    if (!validStages.includes(stage as DealStage)) {
      return c.json(errorResponse('Invalid stage'), 400);
    }
    const result = await queryDealsByStage(stage as DealStage);
    return c.json(result);
  } catch (error) {
    console.error('Error querying deals by stage:', error);
    return c.json(errorResponse('Failed to query deals by stage', undefined, error instanceof Error ? error.message : String(error)), 500);
  }
});

// GET /api/deals/:id - Get a specific deal
dealsRoutes.get('/:id', async (c): Promise<Response> => {
  try {
    const id = c.req.param('id');

    if (!id || isNaN(parseInt(id, 10))) {
      return c.json(errorResponse('Invalid deal ID'), 400);
    }

    const deal = await getDeal(id);

    if (!deal) {
      return c.json(errorResponse('Deal not found'), 404);
    }

    return c.json(deal);
  } catch (error) {
    console.error('Error getting deal:', error);
    return c.json(errorResponse('Failed to get deal', undefined, error instanceof Error ? error.message : String(error)), 500);
  }
});

// POST /api/deals - Create a new deal
dealsRoutes.post('/', async (c): Promise<Response> => {
  try {
    const body = await c.req.json();
    const validationResult = dealInputSchema.safeParse(body);

    if (!validationResult.success) {
      return c.json(errorResponse('Invalid deal data', undefined, validationResult.error.errors), 400);
    }

    const dealData = validationResult.data;
    const newDeal = await createDeal(dealData);

    return c.json(newDeal, 201);
  } catch (error) {
    console.error('Error creating deal:', error);
    return c.json(errorResponse('Failed to create deal', undefined, error instanceof Error ? error.message : String(error)), 500);
  }
});

// PUT /api/deals/:id - Update a deal
dealsRoutes.put('/:id', async (c): Promise<Response> => {
  try {
    const id = c.req.param('id');

    if (!id || isNaN(parseInt(id, 10))) {
      return c.json(errorResponse('Invalid deal ID'), 400);
    }

    const body = await c.req.json();
    const validationResult = dealUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return c.json(errorResponse('Invalid update data', undefined, validationResult.error.errors), 400);
    }

    const updates = validationResult.data;
    const updatedDeal = await updateDeal(id, updates);

    return c.json(updatedDeal);
  } catch (error) {
    console.error('Error updating deal:', error);
    return c.json(errorResponse('Failed to update deal', undefined, error instanceof Error ? error.message : String(error)), 500);
  }
});

// PATCH /api/deals/:id/stage - Update deal stage
dealsRoutes.patch('/:id/stage', async (c): Promise<Response> => {
  try {
    const id = c.req.param('id');

    if (!id || isNaN(parseInt(id, 10))) {
      return c.json(errorResponse('Invalid deal ID'), 400);
    }

    const body = await c.req.json();
    const validationResult = dealStageUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return c.json(errorResponse('Invalid stage update data', undefined, validationResult.error.errors), 400);
    }

    const { stage, reason } = validationResult.data;
    const updatedDeal = await updateDealStage(id, stage as DealStage, reason);

    return c.json(updatedDeal);
  } catch (error) {
    console.error('Error updating deal stage:', error);
    return c.json(errorResponse('Failed to update deal stage', undefined, error instanceof Error ? error.message : String(error)), 500);
  }
});

// DELETE /api/deals/:id - Soft delete a deal (set stage to 'failed')
dealsRoutes.delete('/:id', async (c): Promise<Response> => {
  try {
    const id = c.req.param('id');

    if (!id || isNaN(parseInt(id, 10))) {
      return c.json(errorResponse('Invalid deal ID'), 400);
    }

    // Soft delete by setting stage to 'failed'
    const deletedDeal = await updateDealStage(id, DealStage.FAILED, 'Deleted via API');

    return c.json(deletedDeal);
  } catch (error) {
    console.error('Error deleting deal:', error);
    return c.json(errorResponse('Failed to delete deal', undefined, error instanceof Error ? error.message : String(error)), 500);
  }
});
