import { pgTable, serial, text, varchar, timestamp, integer } from 'drizzle-orm/pg-core';
import { deals } from './deals';

/**
 * Approvals table - stores approval queue items
 */
export const approvals = pgTable('approvals', {
  id: serial('id').primaryKey(),
  dealId: integer('deal_id').notNull().references(() => deals.id),
  approverEmail: varchar('approver_email', { length: 255 }).notNull(),
  itemType: varchar('item_type', { length: 50 }).notNull(), // 'proposal', 'scope', etc.
  itemId: varchar('item_id', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('pending'),

  // Approval request
  requestComment: text('request_comment'),

  // Approval response
  responseComment: text('response_comment'),
  respondedAt: timestamp('responded_at'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Approval = typeof approvals.$inferSelect;
export type NewApproval = typeof approvals.$inferInsert;
