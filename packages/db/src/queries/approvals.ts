import { eq, desc } from 'drizzle-orm';
import { approvals } from '../schema';
import { getDb } from '../db';

/**
 * Query functions for approval operations
 */

export async function createApproval(data: {
  dealId: number;
  approverEmail: string;
  itemType: string;
  itemId: string;
  requestComment?: string;
}) {
  const db = getDb();
  const [approval] = await db
    .insert(approvals)
    .values({
      ...data,
      status: 'pending',
    })
    .returning();
  return approval;
}

export async function getApprovalById(approvalId: number) {
  const db = getDb();
  const [approval] = await db
    .select()
    .from(approvals)
    .where(eq(approvals.id, approvalId));
  return approval;
}

export async function getApprovalsByDeal(dealId: number) {
  const db = getDb();
  return db
    .select()
    .from(approvals)
    .where(eq(approvals.dealId, dealId))
    .orderBy(desc(approvals.createdAt));
}

export async function getPendingApprovalRecords() {
  const db = getDb();
  return db
    .select()
    .from(approvals)
    .where(eq(approvals.status, 'pending'))
    .orderBy(desc(approvals.createdAt));
}

export async function respondToApproval(data: {
  approvalId: number;
  status: 'approved' | 'rejected';
  responseComment?: string;
}) {
  const db = getDb();
  const [updatedApproval] = await db
    .update(approvals)
    .set({
      status: data.status,
      responseComment: data.responseComment,
      respondedAt: new Date(),
    })
    .where(eq(approvals.id, data.approvalId))
    .returning();
  return updatedApproval;
}
