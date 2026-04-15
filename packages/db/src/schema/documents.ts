import { pgTable, serial, text, varchar, timestamp, integer } from 'drizzle-orm/pg-core';
import { deals } from './deals';

/**
 * Documents table - stores generated documents
 */
export const documents = pgTable('documents', {
  id: serial('id').primaryKey(),
  dealId: integer('deal_id').notNull().references(() => deals.id),
  templateId: varchar('template_id', { length: 255 }),
  type: varchar('type', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  driveId: varchar('drive_id', { length: 255 }),
  driveUrl: text('drive_url'),

  // Document values as JSON
  values: text('values'),

  status: varchar('status', { length: 50 }).notNull().default('draft'),
  generatedAt: timestamp('generated_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
