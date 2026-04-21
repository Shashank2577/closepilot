import { getDb, deals, activities, approvals } from '@closepilot/db';
import { DealStage } from '@closepilot/core';
import { eq } from 'drizzle-orm';

export async function cleanDatabase() {
  const db = getDb();
  await db.delete(approvals);
  await db.delete(activities);
  await db.delete(deals);
}

export async function getDealByEmail(email: string) {
  const db = getDb();
  const dealArray = await db
    .select()
    .from(deals)
    .where(eq(deals.leadEmail, email))
    .limit(1);

  if (dealArray.length === 0) return null;
  const deal = dealArray[0];

  const dealActivities = await db
    .select()
    .from(activities)
    .where(eq(activities.dealId, deal.id));

  return { ...deal, activities: dealActivities };
}

export async function seedDeal(stage: DealStage, overrides: Partial<typeof deals.$inferInsert> = {}) {
  const db = getDb();
  const [deal] = await db
    .insert(deals)
    .values({
      leadEmail: 'test@acme.com',
      leadName: 'John Smith',
      leadCompany: 'Acme Corp',
      source: 'other',
      stage,
      ...overrides,
    })
    .returning();
  return deal;
}

export async function waitForStage(dealId: string | number, stage: DealStage, maxWaitMs = 5000): Promise<typeof deals.$inferSelect | null> {
  const db = getDb();
  const startTime = Date.now();
  const idNum = typeof dealId === 'string' ? parseInt(dealId, 10) : dealId;

  while (Date.now() - startTime < maxWaitMs) {
    const [deal] = await db
      .select()
      .from(deals)
      .where(eq(deals.id, idNum))
      .limit(1);

    if (deal && deal.stage === stage) {
      return deal;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timeout waiting for deal ${dealId} to reach stage ${stage}`);
}
