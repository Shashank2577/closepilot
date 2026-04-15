import { activities } from '../schema';
import { getDb } from '../db';

/**
 * Query stubs for activity operations
 * These will be implemented by Jules session J-101
 */

export async function createActivity(data: {
  dealId: number;
  agentType: string;
  activityType: string;
  description: string;
  metadata?: string;
}) {
  throw new Error('Not implemented - Jules J-101 will implement');
}

export async function getActivitiesByDeal(dealId: number) {
  throw new Error('Not implemented - Jules J-101 will implement');
}

export async function getRecentActivities(limit = 50) {
  throw new Error('Not implemented - Jules J-101 will implement');
}
