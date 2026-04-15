import { activities } from '../schema';
import { getDb } from '../db';
import type { NewActivity, Activity } from '../schema';
import { eq, desc } from 'drizzle-orm';

/**
 * Create a new activity log entry
 */
export async function createActivity(data: {
  dealId: number;
  agentType: string;
  activityType: string;
  description: string;
  metadata?: string;
}): Promise<Activity> {
  const db = getDb();
  const [activity] = await db
    .insert(activities)
    .values(data as NewActivity)
    .returning();
  return activity;
}

/**
 * Get all activities for a specific deal
 */
export async function getActivitiesByDeal(dealId: number): Promise<Activity[]> {
  const db = getDb();
  const results = await db
    .select()
    .from(activities)
    .where(eq(activities.dealId, dealId))
    .orderBy(desc(activities.createdAt));
  return results;
}

/**
 * Get recent activities across all deals
 */
export async function getRecentActivities(limit = 50): Promise<Activity[]> {
  const db = getDb();
  const results = await db
    .select()
    .from(activities)
    .orderBy(desc(activities.createdAt))
    .limit(limit);
  return results;
}
