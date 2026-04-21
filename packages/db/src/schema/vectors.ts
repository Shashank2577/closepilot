import { pgTable, uuid, integer, text, timestamp, customType } from 'drizzle-orm/pg-core';
import { deals } from './deals.js';

// Drizzle does not have native pgvector support; use customType.
const vector = (name: string, dimensions: number) =>
  customType<{ data: number[]; driverData: string }>({
    dataType() {
      return `vector(${dimensions})`;
    },
    toDriver(value: number[]): string {
      return `[${value.join(',')}]`;
    },
    fromDriver(value: string): number[] {
      return value
        .replace(/^\[|\]$/g, '')
        .split(',')
        .map(Number);
    },
  })(name);

export const dealEmbeddings = pgTable('deal_embeddings', {
  id: uuid('id').primaryKey().defaultRandom(),
  dealId: integer('deal_id')
    .notNull()
    .references(() => deals.id, { onDelete: 'cascade' }),
  embedding: vector('embedding', 1536).notNull(),
  contentType: text('content_type')
    .$type<'email_thread' | 'proposal_chunk' | 'research_summary'>()
    .notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type DealEmbedding = typeof dealEmbeddings.$inferSelect;
export type NewDealEmbedding = typeof dealEmbeddings.$inferInsert;
