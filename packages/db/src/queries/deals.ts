import type { Deal, DealStage } from '@closepilot/core';
import type { NewDeal } from '../schema';
import { deals } from '../schema';
import { getDb } from '../db';
import { eq, desc, and, gte, lte, or, like, sql } from 'drizzle-orm';

/**
 * Create a new deal in the database
 */
export async function createDeal(input: NewDeal): Promise<Deal> {
  const db = getDb();
  const [deal] = await db.insert(deals).values(input).returning();
  return deal;
}

/**
 * Get a deal by ID
 */
export async function getDeal(dealId: string): Promise<Deal | null> {
  const db = getDb();
  const [deal] = await db.select().from(deals).where(eq(deals.id, Number(dealId)));
  return deal || null;
}

/**
 * Update deal fields
 */
export async function updateDeal(
  dealId: string,
  updates: Partial<Deal>
): Promise<Deal> {
  const db = getDb();
  const [deal] = await db
    .update(deals)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(deals.id, Number(dealId)))
    .returning();
  return deal;
}

/**
 * Update deal stage with validation
 */
export async function updateDealStage(
  dealId: string,
  stage: DealStage,
  reason?: string
): Promise<Deal> {
  const db = getDb();

  // Validate stage transition
  const validStages: DealStage[] = [
    'ingestion',
    'enrichment',
    'scoping',
    'proposal',
    'crm_sync',
    'completed',
    'failed',
  ];

  if (!validStages.includes(stage)) {
    throw new Error(`Invalid stage: ${stage}`);
  }

  const [deal] = await db
    .update(deals)
    .set({
      stage,
      updatedAt: new Date(),
    })
    .where(eq(deals.id, Number(dealId)))
    .returning();

  return deal;
}

/**
 * Query deals by stage
 */
export async function queryDealsByStage(stage: DealStage): Promise<Deal[]> {
  const db = getDb();
  const results = await db
    .select()
    .from(deals)
    .where(eq(deals.stage, stage))
    .orderBy(desc(deals.createdAt));
  return results;
}

/**
 * Query deals by date range
 */
export async function queryDealsByDateRange(
  startDate: Date,
  endDate: Date
): Promise<Deal[]> {
  const db = getDb();
  const results = await db
    .select()
    .from(deals)
    .where(
      and(
        gte(deals.createdAt, startDate),
        lte(deals.createdAt, endDate)
      )
    )
    .orderBy(desc(deals.createdAt));
  return results;
}

/**
 * Get deals pending approval
 */
export async function getPendingApprovals(): Promise<Deal[]> {
  const db = getDb();
  const results = await db
    .select()
    .from(deals)
    .where(eq(deals.approvalStatus, 'pending'))
    .orderBy(desc(deals.createdAt));
  return results;
}

/**
 * Approve a deal
 */
export async function approveDeal(
  dealId: string,
  approverComment?: string
): Promise<Deal> {
  const db = getDb();
  const [deal] = await db
    .update(deals)
    .set({
      approvalStatus: 'approved',
      updatedAt: new Date(),
    })
    .where(eq(deals.id, Number(dealId)))
    .returning();
  return deal;
}

/**
 * Reject a deal
 */
export async function rejectDeal(
  dealId: string,
  reason: string
): Promise<Deal> {
  const db = getDb();
  const [deal] = await db
    .update(deals)
    .set({
      approvalStatus: 'rejected',
      updatedAt: new Date(),
    })
    .where(eq(deals.id, Number(dealId)))
    .returning();
  return deal;
}

/**
 * Search for similar deals using text search
 */
export async function searchSimilarDeals(
  query: string,
  limit = 5
): Promise<Deal[]> {
  const db = getDb();
  const searchTerm = `%${query}%`;

  const results = await db
    .select()
    .from(deals)
    .where(
      or(
        like(deals.leadCompany || '', searchTerm),
        like(deals.leadName || '', searchTerm)
      )
    )
    .limit(limit)
    .orderBy(desc(deals.createdAt));

  return results;
}
