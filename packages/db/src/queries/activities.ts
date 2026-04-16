import { activities } from '../schema';
import { getDb } from '../db';
import { desc, eq } from 'drizzle-orm';

/**
 * Database query functions for activity operations
 */

export async function createActivity(data: {
  dealId: number;
  agentType: string;
  activityType: string;
  description: string;
  metadata?: string;
}) {
  const db = getDb();
  const [activity] = await db
    .insert(activities)
    .values({
      dealId: data.dealId,
      agentType: data.agentType,
      activityType: data.activityType,
      description: data.description,
      metadata: data.metadata,
    })
    .returning();
  return activity;
}

export async function getActivitiesByDeal(dealId: number) {
  const db = getDb();
  return await db
    .select()
    .from(activities)
    .where(eq(activities.dealId, dealId))
    .orderBy(desc(activities.createdAt));
}

export async function getRecentActivities(limit = 50) {
  const db = getDb();
  return await db
    .select()
    .from(activities)
    .orderBy(desc(activities.createdAt))
    .limit(limit);
}
