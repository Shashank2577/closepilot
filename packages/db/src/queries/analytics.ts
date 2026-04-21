import { getDb } from '../db.js';
import { activities, deals } from '../schema/index.js';
import { DealStage, StageVelocity, ConversionStats } from '@closepilot/core';
import { eq, asc, count } from 'drizzle-orm';

/**
 * Get Deal Velocity statistics
 * Calculates the average time spent in each deal stage.
 */
export async function getDealVelocity(): Promise<StageVelocity[]> {
  const db = getDb();

  // Query status changed activities
  const statusChanges = await db
    .select()
    .from(activities)
    .where(eq(activities.activityType, 'status_changed'))
    .orderBy(asc(activities.createdAt));

  // Initialize stage duration trackers
  const stageStats: Record<string, { totalDurationMs: number; count: number }> = {};
  for (const stage of Object.values(DealStage)) {
    stageStats[stage] = { totalDurationMs: 0, count: 0 };
  }

  // Group by deal to compute differences between consecutive transitions
  const dealTransitions: Record<number, typeof statusChanges> = {};
  for (const activity of statusChanges) {
    if (!dealTransitions[activity.dealId]) {
      dealTransitions[activity.dealId] = [];
    }
    dealTransitions[activity.dealId].push(activity);
  }

  for (const [dealIdStr, transitions] of Object.entries(dealTransitions)) {
    for (let i = 0; i < transitions.length - 1; i++) {
      const currentTransition = transitions[i];
      const nextTransition = transitions[i + 1];

      // We assume metadata contains { from: string, to: string }
      // Or we just compute the duration the deal spent in the `to` stage of the current transition
      let stage = 'unknown';
      try {
        if (currentTransition.metadata) {
          const meta = JSON.parse(currentTransition.metadata);
          stage = meta.to || meta.stage || currentTransition.description.split(' ').pop();
        }
      } catch (e) {
        // Fallback or ignore
      }

      // We actually need the stage it transitioned *to* because that's the stage it stayed in
      // until the *next* transition. Let's find it securely.
      let currentStage: string | null = null;
      if (currentTransition.metadata) {
        try {
          const meta = JSON.parse(currentTransition.metadata);
          currentStage = meta.to || meta.newStage;
        } catch (e) {}
      }

      if (!currentStage) {
        // Extract from description like "Deal stage updated to proposal"
        const match = currentTransition.description.match(/stage updated to ([a-z_]+)/i);
        if (match && match[1]) {
          currentStage = match[1].toLowerCase();
        }
      }

      if (currentStage && stageStats[currentStage]) {
        const duration = nextTransition.createdAt.getTime() - currentTransition.createdAt.getTime();
        stageStats[currentStage].totalDurationMs += duration;
        stageStats[currentStage].count += 1;
      }
    }
  }

  // Create the final array ordered by DealStage
  const result: StageVelocity[] = Object.values(DealStage).map((stage) => {
    const stats = stageStats[stage];
    return {
      stage,
      avgDurationMs: stats.count > 0 ? Math.round(stats.totalDurationMs / stats.count) : 0,
      count: stats.count,
    };
  });

  return result;
}

/**
 * Get overall conversion statistics
 */
export async function getConversionStats(): Promise<ConversionStats> {
  const db = getDb();

  const stats = await db
    .select({
      stage: deals.stage,
      count: count()
    })
    .from(deals)
    .groupBy(deals.stage);

  let totalDeals = 0;
  let completed = 0;
  let failed = 0;
  let inProgress = 0;

  for (const row of stats) {
    const c = Number(row.count);
    totalDeals += c;
    if (row.stage === DealStage.COMPLETED) {
      completed += c;
    } else if (row.stage === DealStage.FAILED) {
      failed += c;
    } else {
      inProgress += c;
    }
  }

  const closed = completed + failed;
  const winRate = closed > 0 ? completed / closed : 0;

  return {
    totalDeals,
    completed,
    failed,
    inProgress,
    winRate,
  };
}
