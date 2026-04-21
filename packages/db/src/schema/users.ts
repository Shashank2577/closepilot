import { pgTable, serial, text, timestamp, varchar, integer, jsonb } from 'drizzle-orm/pg-core';

export const organizations = pgTable('organizations', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  settings: jsonb('settings'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  name: text('name').notNull(),
  role: varchar('role', { length: 50 }).notNull().default('REP'),
  orgId: integer('org_id').references(() => organizations.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
