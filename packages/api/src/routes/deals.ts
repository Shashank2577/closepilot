import { Hono } from 'hono';
import { z } from 'zod';
import type { Deal } from '@closepilot/core';
import { DealStage } from '@closepilot/core';
import {
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

export const dealsRoutes = new Hono();

// Validation schemas
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
  stage: z.enum(['ingestion', 'enrichment', 'scoping', 'proposal', 'crm_sync', 'completed', 'failed'], {
    errorMap: () => ({ message: 'Invalid deal stage' }),
  }),
  reason: z.string().optional(),
});

const listDealsQuerySchema = z.object({
  stage: z.enum(['ingestion', 'enrichment', 'scoping', 'proposal', 'crm_sync', 'completed', 'failed'], {
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

// Error response helper
function errorResponse(message: string, status = 500, details?: unknown) {
  const response: Record<string, unknown> = { error: message };
  if (details) {
    response.details = details;
  }
  return response;
}

// GET /api/deals - List deals with filters
dealsRoutes.get('/', async (c) => {
  try {
    const queryResult = listDealsQuerySchema.safeParse(c.req.query());

    if (!queryResult.success) {
      return c.json(errorResponse('Invalid query parameters', 400, queryResult.error.errors), 400);
    }

    const { stage, limit = 50, offset = 0, sortBy = 'createdAt', sortOrder = 'desc' } = queryResult.data;

    // If stage is specified, use stage query
    if (stage) {
      const deals = await queryDealsByStage(stage as DealStage);

      // Apply pagination and sorting in-memory (for now - query functions will be enhanced later)
      const sorted = deals.sort((a, b) => {
        const aVal = a[sortBy as keyof Deal];
        const bVal = b[sortBy as keyof Deal];
        if (!aVal || !bVal) return 0;
        if (sortOrder === 'asc') return aVal > bVal ? 1 : -1;
        return aVal < bVal ? 1 : -1;
      });

      const paginated = sorted.slice(offset, offset + limit);

      return c.json({
        deals: paginated,
        total: deals.length,
        limit,
        offset,
      });
    }

    // If no stage filter, return empty for now (queryDeals function will be added later)
    return c.json({
      deals: [],
      total: 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error listing deals:', error);
    return c.json(errorResponse('Failed to list deals', 500, error instanceof Error ? error.message : String(error)), 500);
  }
});

// GET /api/deals/stats - Get deal statistics
dealsRoutes.get('/stats', async (c) => {
  try {
    // Get counts by stage
    const stages: DealStage[] = [
      DealStage.INGESTION,
      DealStage.ENRICHMENT,
      DealStage.SCOPING,
      DealStage.PROPOSAL,
      DealStage.CRM_SYNC,
      DealStage.COMPLETED,
      DealStage.FAILED,
    ];

    const stats = await Promise.all(
      stages.map(async (stage) => {
        try {
          const deals = await queryDealsByStage(stage);
          return { stage, count: deals.length };
        } catch {
          return { stage, count: 0 };
        }
      })
    );

    const total = stats.reduce((sum, s) => sum + s.count, 0);

    return c.json({
      total,
      byStage: stats,
    });
  } catch (error) {
    console.error('Error getting deal stats:', error);
    return c.json(errorResponse('Failed to get deal statistics', 500, error instanceof Error ? error.message : String(error)), 500);
  }
});

// GET /api/deals/search/similar - Search similar deals
dealsRoutes.get('/search/similar', async (c) => {
  try {
    const queryResult = searchSimilarDealsSchema.safeParse(c.req.query());

    if (!queryResult.success) {
      return c.json(errorResponse('Invalid search parameters', 400, queryResult.error.errors), 400);
    }

    const { q, limit = 5 } = queryResult.data;

    const similarDeals = await searchSimilarDeals(q, limit);

    return c.json({
      query: q,
      deals: similarDeals,
      count: similarDeals.length,
    });
  } catch (error) {
    console.error('Error searching similar deals:', error);
    return c.json(errorResponse('Failed to search similar deals', 500, error instanceof Error ? error.message : String(error)), 500);
  }
});

// GET /api/deals/:id - Get a specific deal
dealsRoutes.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');

    if (!id || isNaN(parseInt(id, 10))) {
      return c.json(errorResponse('Invalid deal ID', 400), 400);
    }

    const deal = await getDeal(id);

    if (!deal) {
      return c.json(errorResponse('Deal not found', 404), 404);
    }

    return c.json(deal);
  } catch (error) {
    console.error('Error getting deal:', error);
    return c.json(errorResponse('Failed to get deal', 500, error instanceof Error ? error.message : String(error)), 500);
  }
});

// POST /api/deals - Create a new deal
dealsRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const validationResult = dealInputSchema.safeParse(body);

    if (!validationResult.success) {
      return c.json(errorResponse('Invalid deal data', 400, validationResult.error.errors), 400);
    }

    const dealData = validationResult.data;
    const newDeal = await createDeal(dealData);

    return c.json(newDeal, 201);
  } catch (error) {
    console.error('Error creating deal:', error);
    return c.json(errorResponse('Failed to create deal', 500, error instanceof Error ? error.message : String(error)), 500);
  }
});

// PUT /api/deals/:id - Update a deal
dealsRoutes.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');

    if (!id || isNaN(parseInt(id, 10))) {
      return c.json(errorResponse('Invalid deal ID', 400), 400);
    }

    const body = await c.req.json();
    const validationResult = dealUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return c.json(errorResponse('Invalid update data', 400, validationResult.error.errors), 400);
    }

    // Check if deal exists
    const existingDeal = await getDeal(id);
    if (!existingDeal) {
      return c.json(errorResponse('Deal not found', 404), 404);
    }

    const updates = validationResult.data;
    const updatedDeal = await updateDeal(id, updates);

    return c.json(updatedDeal);
  } catch (error) {
    console.error('Error updating deal:', error);
    return c.json(errorResponse('Failed to update deal', 500, error instanceof Error ? error.message : String(error)), 500);
  }
});

// PATCH /api/deals/:id/stage - Update deal stage
dealsRoutes.patch('/:id/stage', async (c) => {
  try {
    const id = c.req.param('id');

    if (!id || isNaN(parseInt(id, 10))) {
      return c.json(errorResponse('Invalid deal ID', 400), 400);
    }

    const body = await c.req.json();
    const validationResult = dealStageUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return c.json(errorResponse('Invalid stage update data', 400, validationResult.error.errors), 400);
    }

    // Check if deal exists
    const existingDeal = await getDeal(id);
    if (!existingDeal) {
      return c.json(errorResponse('Deal not found', 404), 404);
    }

    const { stage, reason } = validationResult.data;
    const updatedDeal = await updateDealStage(id, stage as DealStage, reason);

    return c.json(updatedDeal);
  } catch (error) {
    console.error('Error updating deal stage:', error);
    return c.json(errorResponse('Failed to update deal stage', 500, error instanceof Error ? error.message : String(error)), 500);
  }
});

// DELETE /api/deals/:id - Soft delete a deal (set stage to 'failed')
dealsRoutes.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');

    if (!id || isNaN(parseInt(id, 10))) {
      return c.json(errorResponse('Invalid deal ID', 400), 400);
    }

    // Check if deal exists
    const existingDeal = await getDeal(id);
    if (!existingDeal) {
      return c.json(errorResponse('Deal not found', 404), 404);
    }

    // Soft delete by setting stage to 'failed'
    const deletedDeal = await updateDealStage(id, DealStage.FAILED, 'Deleted via API');

    return c.json({
      message: 'Deal deleted successfully',
      deal: deletedDeal,
    });
  } catch (error) {
    console.error('Error deleting deal:', error);
    return c.json(errorResponse('Failed to delete deal', 500, error instanceof Error ? error.message : String(error)), 500);
  }
});
