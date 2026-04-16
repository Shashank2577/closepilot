import type { DealStage } from '@closepilot/core';
import type { NewDeal, Deal } from '../schema';
import { deals } from '../schema';
import { getDb } from '../db';
import { eq, desc, and, gte, lte, or, ilike } from 'drizzle-orm';

/**
 * Deal operations implementation
 */

export async function createDeal(input: NewDeal): Promise<Deal> {
  const db = getDb();
  const [deal] = await db.insert(deals).values(input).returning();
  return deal as Deal;
}

export async function getDeal(dealId: string): Promise<Deal | null> {
  const db = getDb();
  const [deal] = await db
    .select()
    .from(deals)
    .where(eq(deals.id, parseInt(dealId, 10)))
    .limit(1);
  return (deal as Deal) || null;
}

export async function updateDeal(
  dealId: string,
  updates: Partial<Deal>
): Promise<Deal> {
  const db = getDb();
  const [deal] = await db
    .update(deals)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(deals.id, parseInt(dealId, 10)))
    .returning();
  if (!deal) {
    throw new Error(`Deal ${dealId} not found`);
  }
  return deal as Deal;
}

export async function updateDealStage(
  dealId: string,
  stage: DealStage,
  reason?: string
): Promise<Deal> {
  // reason could be stored in a note or activity, but for now just update the stage
  return updateDeal(dealId, { stage });
}

export async function queryDealsByStage(stage: DealStage): Promise<Deal[]> {
  const db = getDb();
  const results = await db
    .select()
    .from(deals)
    .where(eq(deals.stage, stage as string))
    .orderBy(desc(deals.createdAt));
  return results as Deal[];
}

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
  return results as Deal[];
}

export async function getPendingApprovals(): Promise<Deal[]> {
  const db = getDb();
  const results = await db
    .select()
    .from(deals)
    .where(eq(deals.approvalStatus, 'pending'))
    .orderBy(desc(deals.createdAt));
  return results as Deal[];
}

export async function approveDeal(
  dealId: string,
  approverComment?: string
): Promise<Deal> {
  return updateDeal(dealId, { approvalStatus: 'approved' });
}

export async function rejectDeal(
  dealId: string,
  reason: string
): Promise<Deal> {
  return updateDeal(dealId, { approvalStatus: 'rejected' });
}

export async function searchSimilarDeals(
  query: string,
  limit = 5
): Promise<Deal[]> {
  const db = getDb();
  const results = await db
    .select()
    .from(deals)
    .where(
      or(
        ilike(deals.leadCompany, `%${query}%`),
        ilike(deals.leadName, `%${query}%`),
        ilike(deals.projectScope, `%${query}%`),
        ilike(deals.companyResearch, `%${query}%`)
      )
    )
    .limit(limit)
    .orderBy(desc(deals.createdAt));
  return results as Deal[];
}
