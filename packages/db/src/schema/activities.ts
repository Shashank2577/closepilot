import { pgTable, serial, text, varchar, timestamp, integer } from 'drizzle-orm/pg-core';
import { deals } from './deals';

/**
 * Activities table - stores all activity logs for deals
 */
export const activities = pgTable('activities', {
  id: serial('id').primaryKey(),
  dealId: integer('deal_id').notNull().references(() => deals.id),
  agentType: varchar('agent_type', { length: 50 }).notNull(),
  activityType: varchar('activity_type', { length: 50 }).notNull(),
  description: text('description').notNull(),
  metadata: text('metadata'), // JSON metadata

  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
