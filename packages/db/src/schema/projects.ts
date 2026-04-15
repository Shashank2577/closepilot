import { pgTable, serial, text, varchar, timestamp, integer } from 'drizzle-orm/pg-core';

/**
 * Projects table - stores similar past projects for matching
 */
export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  industry: varchar('industry', { length: 100 }),
  serviceType: varchar('service_type', { length: 100 }),
  complexity: varchar('complexity', { length: 20 }),
  timeline: varchar('timeline', { length: 100 }),
  budget: varchar('budget', { length: 100 }),

  // For similarity search
  keywords: text('keywords'), // JSON array of keywords
  features: text('features'), // JSON array of features

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
