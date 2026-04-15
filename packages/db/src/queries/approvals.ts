import { approvals } from '../schema';
import { getDb } from '../db';
import { eq, desc } from 'drizzle-orm';
import type { Approval, NewApproval } from '../schema/approvals';

/**
 * Create a new approval request
 */
export async function createApproval(data: {
  dealId: number;
  approverEmail: string;
  itemType: string;
  itemId: string;
  requestComment?: string;
}): Promise<Approval> {
  const db = getDb();
  const [approval] = await db
    .insert(approvals)
    .values({
      dealId: data.dealId,
      approverEmail: data.approverEmail,
      itemType: data.itemType,
      itemId: data.itemId,
      requestComment: data.requestComment || null,
      status: 'pending',
    })
    .returning();
  return approval;
}

/**
 * Get an approval by ID
 */
export async function getApprovalById(approvalId: number): Promise<Approval | null> {
  const db = getDb();
  const [approval] = await db
    .select()
    .from(approvals)
    .where(eq(approvals.id, approvalId));
  return approval || null;
}

/**
 * Get all approvals for a specific deal
 */
export async function getApprovalsByDeal(dealId: number): Promise<Approval[]> {
  const db = getDb();
  const results = await db
    .select()
    .from(approvals)
    .where(eq(approvals.dealId, dealId))
    .orderBy(desc(approvals.createdAt));
  return results;
}

/**
 * Get all pending approval requests
 */
export async function getPendingApprovalRecords(): Promise<Approval[]> {
  const db = getDb();
  const results = await db
    .select()
    .from(approvals)
    .where(eq(approvals.status, 'pending'))
    .orderBy(desc(approvals.createdAt));
  return results;
}

/**
 * Respond to an approval request (approve or reject)
 */
export async function respondToApproval(data: {
  approvalId: number;
  status: 'approved' | 'rejected';
  responseComment?: string;
}): Promise<Approval> {
  const db = getDb();
  const [approval] = await db
    .update(approvals)
    .set({
      status: data.status,
      responseComment: data.responseComment || null,
      respondedAt: new Date(),
    })
    .where(eq(approvals.id, data.approvalId))
    .returning();
  return approval;
}
