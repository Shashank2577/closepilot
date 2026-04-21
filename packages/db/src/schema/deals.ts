import { pgTable, serial, text, timestamp, varchar, integer } from 'drizzle-orm/pg-core';
import { organizations } from './users';

/**
 * Deals table - stores all B2B deal opportunities
 */
export const deals = pgTable('deals', {
  id: serial('id').primaryKey(),
  stage: varchar('stage', { length: 50 }).notNull().default('ingestion'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),

  // Lead information
  leadEmail: varchar('lead_email', { length: 255 }).notNull(),
  leadName: varchar('lead_name', { length: 255 }).notNull(),
  leadCompany: varchar('lead_company', { length: 255 }),
  leadTitle: varchar('lead_title', { length: 255 }),

  // Communication
  threadId: varchar('thread_id', { length: 255 }),
  initialEmailId: varchar('initial_email_id', { length: 255 }),

  // Enrichment data (JSON stored in text)
  companyResearch: text('company_research'),
  prospectResearch: text('prospect_research'),

  // Scoping data
  projectScope: text('project_scope'),

  // Proposal data
  proposal: text('proposal'),
  proposalDocumentId: varchar('proposal_document_id', { length: 255 }),

  // CRM sync
  crmId: varchar('crm_id', { length: 255 }),
  crmSyncedAt: timestamp('crm_synced_at'),

  // Metadata
  source: varchar('source', { length: 50 }).notNull(),
  assignedAgent: varchar('assigned_agent', { length: 255 }),
  approvalStatus: varchar('approval_status', { length: 50 }),

  // Data isolation per tenant
  orgId: integer('org_id').references(() => organizations.id),
});

export type Deal = typeof deals.$inferSelect;
export type NewDeal = typeof deals.$inferInsert;
