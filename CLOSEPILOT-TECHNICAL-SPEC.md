# CLOSEPILOT — Technical Architecture & Jules Operations Manual

> **Version:** 1.0 | **Date:** 2026-04-15
> **Purpose:** This document is the single source of truth for engineering. It contains every technical decision, every file path, every interface, every Jules session configuration, and every integration detail needed to build Closepilot from zero to deployed product.
> **Audience:** Claude Code sessions, Jules agent tasks, and the human orchestrator.

---

## Table of Contents

1. [Technology Stack & Dependencies](#1-technology-stack--dependencies)
2. [Repository Structure](#2-repository-structure)
3. [TypeScript Interface Contracts](#3-typescript-interface-contracts)
4. [Database Schema](#4-database-schema)
5. [Deal Store MCP Server Specification](#5-deal-store-mcp-server-specification)
6. [Agent Architecture Deep Dive](#6-agent-architecture-deep-dive)
7. [Managed Agent & Routine Configurations](#7-managed-agent--routine-configurations)
8. [Web UI Specification](#8-web-ui-specification)
9. [API Layer Specification](#9-api-layer-specification)
10. [Jules Setup & Configuration](#10-jules-setup--configuration)
11. [Jules Session Manifest: All 15 Parallel Sessions](#11-jules-session-manifest-all-15-parallel-sessions)
12. [Claude Code Orchestrator Runbook](#12-claude-code-orchestrator-runbook)
13. [Testing Strategy](#13-testing-strategy)
14. [Deployment & Infrastructure](#14-deployment--infrastructure)
15. [AGENTS.md Template for Jules](#15-agentsmd-template-for-jules)

---

## 1. Technology Stack & Dependencies

### Runtime

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| Language | TypeScript | 5.4+ | Type safety across all packages, interface contracts |
| Runtime | Node.js | 22 LTS | Latest LTS, native TypeScript strip support |
| Package Manager | pnpm | 9.x | Workspace support for monorepo, fast installs |
| Database | PostgreSQL | 16 | JSONB for artifact storage, pgvector for similarity |
| ORM | Drizzle | Latest | Type-safe SQL, lightweight, great migration story |
| Web Framework | Next.js | 15 | App Router, Server Actions, React Server Components |
| UI Components | shadcn/ui + Tailwind | Latest | Rapid UI development, consistent design |
| API | Hono | 4.x | Lightweight, fast, runs everywhere |
| MCP SDK | @anthropic-ai/mcp | Latest | Official Anthropic MCP server SDK |
| Testing | Vitest | Latest | Fast, TypeScript-native, compatible with Jest API |
| Validation | Zod | 3.x | Runtime type validation matching TS interfaces |

### External Services

| Service | Purpose | Integration Method |
|---------|---------|-------------------|
| Claude API (Anthropic) | Agent reasoning engine | Managed Agents API + Routines |
| Gmail | Read/send emails | MCP server (Google) |
| Google Calendar | Check/book availability | MCP server (Google) |
| Google Drive | Read/write proposals | MCP server (Google) |
| Web Search | Company research | Claude built-in web search tool |
| PostgreSQL | Deal Store | Custom MCP server (we build this) |

### Dev Dependencies

```json
{
  "devDependencies": {
    "typescript": "^5.4.0",
    "vitest": "latest",
    "@types/node": "^22.0.0",
    "tsx": "latest",
    "drizzle-kit": "latest",
    "eslint": "^9.0.0",
    "@typescript-eslint/parser": "latest"
  }
}
```

---

## 2. Repository Structure

```
closepilot/
├── AGENTS.md                          # Instructions for Jules (see Section 15)
├── CLAUDE.md                          # Instructions for Claude Code sessions
├── package.json                       # Root workspace config
├── pnpm-workspace.yaml                # Workspace packages list
├── tsconfig.base.json                 # Shared TS config
├── .env.example                       # Environment variable template
├── scripts/
│   ├── setup.sh                       # Jules environment setup script
│   ├── seed.ts                        # Seed database with sample data
│   └── test-all.sh                    # Run all tests across packages
│
├── packages/
│   ├── core/                          # Shared types, utilities, constants
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── types/
│   │       │   ├── index.ts           # Re-exports everything
│   │       │   ├── deal.ts            # Deal, DealStage enum
│   │       │   ├── artifacts.ts       # LeadBrief, MeetingRecord, CallDossier, DealIntel, ProposalRecord
│   │       │   ├── agents.ts          # AgentInput/Output types per agent
│   │       │   ├── approval.ts        # ApprovalQueueItem, ApprovalAction
│   │       │   ├── icp.ts             # ICPConfig, ICPScoreResult
│   │       │   ├── digest.ts          # DealDigest, DealSummary
│   │       │   └── common.ts          # Shared primitives (Person, Company, TimeSlot, etc.)
│   │       ├── deal-state-machine.ts  # Valid transitions, transition function
│   │       ├── errors.ts              # Typed error classes
│   │       └── constants.ts           # Stage names, agent names, default configs
│   │
│   ├── db/                            # Database layer
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── drizzle.config.ts
│   │   └── src/
│   │       ├── schema/
│   │       │   ├── index.ts           # Re-exports all tables
│   │       │   ├── organizations.ts
│   │       │   ├── users.ts
│   │       │   ├── deals.ts
│   │       │   ├── deal-artifacts.ts
│   │       │   ├── deal-events.ts
│   │       │   ├── past-projects.ts
│   │       │   └── approval-queue.ts
│   │       ├── migrations/            # Generated by drizzle-kit
│   │       ├── seeds/
│   │       │   ├── sample-projects.ts
│   │       │   ├── sample-icp.ts
│   │       │   └── test-deals.ts
│   │       ├── queries/
│   │       │   ├── deals.ts           # CRUD operations
│   │       │   ├── artifacts.ts       # Artifact read/write
│   │       │   ├── events.ts          # Event logging
│   │       │   ├── approvals.ts       # Approval queue operations
│   │       │   ├── past-projects.ts   # Search by similarity
│   │       │   └── similarity.ts      # Vector similarity for deal matching
│   │       └── connection.ts          # DB connection pool
│   │
│   ├── mcp-server/                    # Custom MCP server for Deal Store
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts               # MCP server entry point
│   │       ├── tools/
│   │       │   ├── deals.ts           # create_deal, get_deal, update_deal, list_deals
│   │       │   ├── artifacts.ts       # write_artifact, get_artifact, get_deal_artifacts
│   │       │   ├── events.ts          # log_event, get_deal_events
│   │       │   ├── past-projects.ts   # search_similar_projects, get_project
│   │       │   └── approvals.ts       # create_approval, list_pending, approve, reject
│   │       └── __tests__/
│   │           ├── deals.test.ts
│   │           ├── artifacts.test.ts
│   │           ├── events.test.ts
│   │           ├── past-projects.test.ts
│   │           └── approvals.test.ts
│   │
│   ├── agents/                        # All 6 agent implementations
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── scout/
│   │       │   ├── index.ts           # Scout orchestrator
│   │       │   ├── extract-lead.ts    # Email → partial LeadBrief
│   │       │   ├── research-company.ts # Company name → CompanyResearch
│   │       │   ├── score-lead.ts      # LeadBrief → ICPScoreResult
│   │       │   ├── find-similar-deals.ts # Criteria → SimilarDeal[]
│   │       │   └── __tests__/
│   │       │       ├── extract-lead.test.ts
│   │       │       ├── research-company.test.ts
│   │       │       ├── score-lead.test.ts
│   │       │       ├── find-similar-deals.test.ts
│   │       │       └── index.test.ts
│   │       ├── scheduler/
│   │       │   ├── index.ts
│   │       │   ├── check-availability.ts
│   │       │   ├── draft-outreach.ts
│   │       │   └── __tests__/
│   │       │       ├── check-availability.test.ts
│   │       │       ├── draft-outreach.test.ts
│   │       │       └── index.test.ts
│   │       ├── prep/
│   │       │   ├── index.ts
│   │       │   ├── fresh-research.ts
│   │       │   ├── generate-talking-points.ts
│   │       │   └── __tests__/
│   │       │       ├── fresh-research.test.ts
│   │       │       ├── generate-talking-points.test.ts
│   │       │       └── index.test.ts
│   │       ├── scribe/
│   │       │   ├── index.ts
│   │       │   ├── parse-transcript.ts
│   │       │   ├── calc-probability.ts
│   │       │   └── __tests__/
│   │       │       ├── parse-transcript.test.ts
│   │       │       ├── calc-probability.test.ts
│   │       │       └── index.test.ts
│   │       ├── proposal/
│   │       │   ├── index.ts
│   │       │   ├── select-template.ts
│   │       │   ├── generate-sections.ts
│   │       │   ├── calculate-pricing.ts
│   │       │   ├── assemble-doc.ts
│   │       │   └── __tests__/
│   │       │       ├── select-template.test.ts
│   │       │       ├── generate-sections.test.ts
│   │       │       ├── calculate-pricing.test.ts
│   │       │       ├── assemble-doc.test.ts
│   │       │       └── index.test.ts
│   │       └── chase/
│   │           ├── index.ts
│   │           ├── daily-sweep.ts
│   │           ├── draft-followup.ts
│   │           ├── generate-digest.ts
│   │           ├── templates/
│   │           │   └── digest.html
│   │           └── __tests__/
│   │               ├── daily-sweep.test.ts
│   │               ├── draft-followup.test.ts
│   │               ├── generate-digest.test.ts
│   │               └── index.test.ts
│   │
│   ├── api/                           # Hono API server
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts               # Server entry
│   │       ├── middleware/
│   │       │   ├── auth.ts            # Google OAuth verification
│   │       │   └── org-context.ts     # Multi-tenant org resolution
│   │       ├── routes/
│   │       │   ├── auth.ts            # POST /auth/google
│   │       │   ├── deals.ts           # CRUD + list by stage
│   │       │   ├── artifacts.ts       # GET artifacts for a deal
│   │       │   ├── approvals.ts       # List pending, approve, reject
│   │       │   ├── scribe.ts          # POST notes → trigger Scribe
│   │       │   ├── settings.ts        # ICP config, templates
│   │       │   └── webhooks.ts        # Gmail push notifications, e-sig events
│   │       └── __tests__/
│   │
│   └── web/                           # Next.js frontend
│       ├── package.json
│       ├── tsconfig.json
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       └── src/
│           ├── app/
│           │   ├── layout.tsx
│           │   ├── page.tsx           # Redirect to dashboard
│           │   ├── auth/
│           │   │   └── page.tsx       # Google OAuth login
│           │   ├── dashboard/
│           │   │   └── page.tsx       # Pipeline board (Kanban by stage)
│           │   ├── deals/
│           │   │   └── [id]/
│           │   │       ├── page.tsx   # Deal detail + timeline
│           │   │       ├── scribe/
│           │   │       │   └── page.tsx # Paste notes / upload transcript
│           │   │       └── proposal/
│           │   │           └── page.tsx # Review proposal + approve
│           │   ├── approvals/
│           │   │   └── page.tsx       # Approval queue
│           │   └── settings/
│           │       └── page.tsx       # ICP config, integrations
│           ├── components/
│           │   ├── deal-card.tsx
│           │   ├── pipeline-board.tsx
│           │   ├── approval-item.tsx
│           │   ├── artifact-viewer.tsx
│           │   ├── timeline-event.tsx
│           │   └── nav.tsx
│           └── lib/
│               ├── api-client.ts      # Typed fetch wrapper
│               └── auth.ts            # OAuth helpers
```

---

## 3. TypeScript Interface Contracts

These interfaces are THE source of truth. Every agent, every API route, every database query, and every Jules task implements against these. They live in `packages/core/src/types/`.

### 3.1 Common Primitives (`common.ts`)

```typescript
export interface Person {
  name: string;
  email?: string;
  title?: string;
  role_in_deal?: 'champion' | 'blocker' | 'evaluator' | 'end-user';
}

export interface Company {
  name: string;
  size?: number;
  industry?: string;
  funding_stage?: string;
  website?: string;
  linkedin_url?: string;
}

export interface TimeSlot {
  start: string; // ISO 8601
  end: string;   // ISO 8601
  available: boolean;
}

export interface NewsItem {
  headline: string;
  source: string;
  date: string;
  relevance_note: string;
}

export interface ProjectRef {
  id: string;
  name: string;
  industry: string;
  tech_stack: string[];
  price: number;
  duration_weeks: number;
  outcome: string;
  proposal_doc_url?: string;
}

export interface TalkingPoint {
  category: 'opener' | 'discovery_question' | 'proof_point' | 'concern_preempt';
  text: string;
  rationale: string;
}

export interface Requirement {
  title: string;
  description: string;
  priority: 'must' | 'should' | 'nice';
}

export interface Concern {
  topic: string;
  severity: 'high' | 'medium' | 'low';
  suggested_response: string;
}

export interface Promise {
  what: string;
  to_whom: string;
  by_when: string;
}

export interface Phase {
  name: string;
  deliverables: string[];
  duration_weeks: number;
  price: number;
}
```

### 3.2 Deal & Stages (`deal.ts`)

```typescript
export enum DealStage {
  NEW_LEAD = 'new-lead',
  QUALIFIED = 'qualified',
  DECLINED = 'declined',
  OUTREACH_SENT = 'outreach-sent',
  MEETING_BOOKED = 'meeting-booked',
  PROPOSAL_PENDING = 'proposal-pending',
  PROPOSAL_SENT = 'proposal-sent',
  FOLLOW_UP_1 = 'follow-up-1',
  FOLLOW_UP_2 = 'follow-up-2',
  NEGOTIATING = 'negotiating',
  PROPOSAL_REVISED = 'proposal-revised',
  CLOSED_WON = 'closed-won',
  CLOSED_LOST = 'closed-lost',
  STALLED = 'stalled',
}

export interface Deal {
  id: string;
  org_id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_title?: string;
  stage: DealStage;
  icp_score?: number;
  close_probability?: number;
  pipeline_value?: number;
  created_at: string;
  updated_at: string;
}
```

### 3.3 Artifact Types (`artifacts.ts`)

```typescript
export enum ArtifactType {
  LEAD_BRIEF = 'lead-brief',
  MEETING_RECORD = 'meeting-record',
  CALL_DOSSIER = 'call-dossier',
  DEAL_INTEL = 'deal-intel',
  PROPOSAL_RECORD = 'proposal-record',
  DEAL_DIGEST = 'deal-digest',
}

export interface LeadBrief {
  lead_id: string;
  contact_name: string;
  contact_email: string;
  contact_title: string;
  company: Company;
  inferred_tech_stack: string[];
  stated_need: string;
  budget_signal: string;
  timeline_signal: string;
  similar_past_deals: ProjectRef[];
  risk_flags: string[];
  icp_score: number;
  score_breakdown: { category: string; score: number; max: number; reasoning: string }[];
  scout_recommendation: 'qualify' | 'needs-review' | 'decline';
  raw_email_id: string;
}

export interface MeetingRecord {
  deal_id: string;
  meeting_datetime: string;
  meeting_duration_min: number;
  calendar_event_id: string;
  outreach_email_id: string;
  confirmation_email_id?: string;
  deal_stage: DealStage;
}

export interface CallDossier {
  deal_id: string;
  meeting_datetime: string;
  company_recent_news: NewsItem[];
  company_current_tech: string;
  product_observations: string;
  similar_past_projects: ProjectRef[];
  suggested_talking_points: TalkingPoint[];
  budget_guidance: string;
}

export interface DealIntel {
  deal_id: string;
  requirements: Requirement[];
  budget_confirmed: string;
  timeline: {
    start_date?: string;
    milestones: string[];
    deadline?: string;
  };
  decision_makers: Person[];
  concerns_raised: Concern[];
  promises_made: Promise[];
  competitive_mentions: string[];
  close_probability: number;
  deal_stage: DealStage;
}

export interface ProposalRecord {
  deal_id: string;
  proposal_doc_url: string;
  total_price: number;
  currency: string;
  duration_weeks: number;
  phases: Phase[];
  projected_margin: number;
  pricing_rationale: string;
  cover_email_draft: string;
  deal_stage: DealStage;
}

export interface DealDigest {
  date: string;
  active_deals_count: number;
  total_pipeline_value: number;
  deals_needing_action: DealSummary[];
  deals_progressing: DealSummary[];
  deals_stalled: DealSummary[];
  closed_this_week: DealSummary[];
  win_rate_30d: number;
}

export interface DealSummary {
  deal_id: string;
  company_name: string;
  contact_name: string;
  stage: DealStage;
  pipeline_value?: number;
  days_since_last_contact: number;
  latest_activity: string;
  recommended_action?: string;
}
```

### 3.4 Agent I/O Contracts (`agents.ts`)

```typescript
// Each agent has a strict input → output contract.
// Jules tasks implement these functions exactly.

export interface ScoutInput {
  raw_email_text: string;
  raw_email_id: string;
  org_id: string;
}
export interface ScoutOutput {
  lead_brief: LeadBrief;
  action: 'qualify' | 'needs-review' | 'decline';
  decline_email_draft?: string;
}

export interface SchedulerInput {
  lead_brief: LeadBrief;
  deal_id: string;
  org_id: string;
}
export interface SchedulerOutput {
  meeting_record?: MeetingRecord;
  outreach_email_draft: string;
  outreach_email_to: string;
  outreach_email_subject: string;
  offered_slots: TimeSlot[];
  approval_queue_id: string;
}

export interface PrepInput {
  deal_id: string;
  meeting_datetime: string;
  org_id: string;
}
export interface PrepOutput {
  call_dossier: CallDossier;
  delivery_email_sent: boolean;
}

export interface ScribeInput {
  deal_id: string;
  raw_notes: string;
  org_id: string;
}
export interface ScribeOutput {
  deal_intel: DealIntel;
  next_action: 'trigger-proposal' | 'trigger-followup' | 'needs-human';
  followup_tasks?: string[];
}

export interface ProposalInput {
  deal_id: string;
  org_id: string;
}
export interface ProposalOutput {
  proposal_record: ProposalRecord;
  approval_queue_id: string;
}

export interface ChaseInput {
  org_id: string;
  trigger: 'scheduled' | 'webhook';
  webhook_data?: { email_id?: string; event_type?: string };
}
export interface ChaseOutput {
  deal_digest: DealDigest;
  approval_queue_entries: string[];  // IDs of queued follow-up approvals
  stage_updates: { deal_id: string; old_stage: DealStage; new_stage: DealStage }[];
}
```

### 3.5 Approval Types (`approval.ts`)

```typescript
export enum ApprovalAction {
  SEND_OUTREACH = 'send-outreach',
  SEND_PROPOSAL = 'send-proposal',
  SEND_FOLLOWUP = 'send-followup',
  DECLINE_LEAD = 'decline-lead',
}

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EDITED_AND_APPROVED = 'edited-and-approved',
}

export interface ApprovalQueueItem {
  id: string;
  deal_id: string;
  org_id: string;
  agent_name: string;
  action: ApprovalAction;
  payload: Record<string, unknown>; // The email draft, proposal link, etc.
  status: ApprovalStatus;
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  edited_payload?: Record<string, unknown>; // If human edited before approving
}
```

### 3.6 ICP Configuration (`icp.ts`)

```typescript
export interface ICPConfig {
  target_industries: string[];
  min_company_size: number;
  max_company_size: number;
  preferred_tech_stack: string[];
  min_budget: number;
  max_budget: number;
  preferred_seniority: string[];  // VP, C-level, Director, Partner
  weights: {
    industry: number;     // 0-100, how much industry match matters
    size: number;
    budget: number;
    tech_stack: number;
    seniority: number;
    timeline: number;
  };
  qualify_threshold: number;  // score >= this → auto-qualify
  review_threshold: number;   // score >= this → needs-review (below → decline)
}

export interface ICPScoreResult {
  total_score: number;  // 0-100
  breakdown: {
    category: string;
    score: number;
    max: number;
    reasoning: string;
  }[];
  recommendation: 'qualify' | 'needs-review' | 'decline';
}
```

---

## 4. Database Schema

### Drizzle Schema Definition

All schema files live in `packages/db/src/schema/`. Here is the complete schema:

```typescript
// packages/db/src/schema/deals.ts
import { pgTable, uuid, text, integer, jsonb, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const dealStageEnum = pgEnum('deal_stage', [
  'new-lead', 'qualified', 'declined', 'outreach-sent', 'meeting-booked',
  'proposal-pending', 'proposal-sent', 'follow-up-1', 'follow-up-2',
  'negotiating', 'proposal-revised', 'closed-won', 'closed-lost', 'stalled'
]);

export const deals = pgTable('deals', {
  id: uuid('id').primaryKey().defaultRandom(),
  org_id: uuid('org_id').notNull().references(() => organizations.id),
  company_name: text('company_name').notNull(),
  contact_name: text('contact_name').notNull(),
  contact_email: text('contact_email').notNull(),
  contact_title: text('contact_title'),
  stage: dealStageEnum('stage').notNull().default('new-lead'),
  icp_score: integer('icp_score'),
  close_probability: integer('close_probability'),
  pipeline_value: integer('pipeline_value'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// packages/db/src/schema/deal-artifacts.ts
export const artifactTypeEnum = pgEnum('artifact_type', [
  'lead-brief', 'meeting-record', 'call-dossier',
  'deal-intel', 'proposal-record', 'deal-digest'
]);

export const dealArtifacts = pgTable('deal_artifacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  deal_id: uuid('deal_id').notNull().references(() => deals.id),
  artifact_type: artifactTypeEnum('artifact_type').notNull(),
  payload: jsonb('payload').notNull(),
  agent_name: text('agent_name').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// packages/db/src/schema/deal-events.ts
export const dealEvents = pgTable('deal_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  deal_id: uuid('deal_id').notNull().references(() => deals.id),
  event_type: text('event_type').notNull(),
  description: text('description').notNull(),
  agent_name: text('agent_name'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// packages/db/src/schema/past-projects.ts
export const pastProjects = pgTable('past_projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  org_id: uuid('org_id').notNull().references(() => organizations.id),
  name: text('name').notNull(),
  industry: text('industry').notNull(),
  tech_stack: jsonb('tech_stack').notNull().$type<string[]>(),
  price: integer('price').notNull(),
  duration_weeks: integer('duration_weeks').notNull(),
  outcome: text('outcome').notNull(),
  proposal_doc_url: text('proposal_doc_url'),
  client_contact_name: text('client_contact_name'),
  client_contact_email: text('client_contact_email'),
  completed_at: timestamp('completed_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// packages/db/src/schema/approval-queue.ts
export const approvalActionEnum = pgEnum('approval_action', [
  'send-outreach', 'send-proposal', 'send-followup', 'decline-lead'
]);
export const approvalStatusEnum = pgEnum('approval_status', [
  'pending', 'approved', 'rejected', 'edited-and-approved'
]);

export const approvalQueue = pgTable('approval_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  deal_id: uuid('deal_id').notNull().references(() => deals.id),
  org_id: uuid('org_id').notNull().references(() => organizations.id),
  agent_name: text('agent_name').notNull(),
  action: approvalActionEnum('action').notNull(),
  payload: jsonb('payload').notNull(),
  status: approvalStatusEnum('status').notNull().default('pending'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  reviewed_at: timestamp('reviewed_at'),
  reviewed_by: uuid('reviewed_by'),
  edited_payload: jsonb('edited_payload'),
});

// packages/db/src/schema/organizations.ts
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  settings: jsonb('settings').notNull().default({}),
  icp_config: jsonb('icp_config').notNull().$type<ICPConfig>(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// packages/db/src/schema/users.ts
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  org_id: uuid('org_id').notNull().references(() => organizations.id),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: text('role').notNull().default('member'),
  google_oauth_refresh_token: text('google_oauth_refresh_token'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});
```

### Indexes

```sql
CREATE INDEX idx_deals_org_stage ON deals(org_id, stage);
CREATE INDEX idx_deals_org_updated ON deals(org_id, updated_at DESC);
CREATE INDEX idx_artifacts_deal_type ON deal_artifacts(deal_id, artifact_type);
CREATE INDEX idx_events_deal ON deal_events(deal_id, created_at DESC);
CREATE INDEX idx_approvals_org_status ON approval_queue(org_id, status);
CREATE INDEX idx_past_projects_org ON past_projects(org_id);
```

---

## 5. Deal Store MCP Server Specification

The Deal Store MCP server exposes the PostgreSQL database as MCP tools that Claude Managed Agents can call. It runs as a separate process.

### Tool Definitions

```typescript
// Tool: create_deal
{
  name: "create_deal",
  description: "Create a new deal in the pipeline",
  input_schema: {
    type: "object",
    properties: {
      org_id: { type: "string", format: "uuid" },
      company_name: { type: "string" },
      contact_name: { type: "string" },
      contact_email: { type: "string", format: "email" },
      contact_title: { type: "string" },
      icp_score: { type: "integer", minimum: 0, maximum: 100 },
      pipeline_value: { type: "integer" },
    },
    required: ["org_id", "company_name", "contact_name", "contact_email"]
  }
}

// Tool: get_deal
{
  name: "get_deal",
  description: "Get a deal by ID with all its current data",
  input_schema: {
    type: "object",
    properties: {
      deal_id: { type: "string", format: "uuid" }
    },
    required: ["deal_id"]
  }
}

// Tool: update_deal_stage
{
  name: "update_deal_stage",
  description: "Transition a deal to a new stage. Validates the transition is legal.",
  input_schema: {
    type: "object",
    properties: {
      deal_id: { type: "string", format: "uuid" },
      new_stage: { type: "string", enum: ["new-lead", "qualified", ...] },
      reason: { type: "string" }
    },
    required: ["deal_id", "new_stage"]
  }
}

// Tool: write_artifact
{
  name: "write_artifact",
  description: "Write an agent artifact (LeadBrief, MeetingRecord, etc.) to a deal",
  input_schema: {
    type: "object",
    properties: {
      deal_id: { type: "string", format: "uuid" },
      artifact_type: { type: "string", enum: ["lead-brief", "meeting-record", "call-dossier", "deal-intel", "proposal-record"] },
      payload: { type: "object" },
      agent_name: { type: "string" }
    },
    required: ["deal_id", "artifact_type", "payload", "agent_name"]
  }
}

// Tool: get_deal_artifacts
{
  name: "get_deal_artifacts",
  description: "Get all artifacts for a deal, optionally filtered by type",
  input_schema: {
    type: "object",
    properties: {
      deal_id: { type: "string", format: "uuid" },
      artifact_type: { type: "string" }  // optional filter
    },
    required: ["deal_id"]
  }
}

// Tool: search_similar_projects
{
  name: "search_similar_projects",
  description: "Find past projects similar to given criteria",
  input_schema: {
    type: "object",
    properties: {
      org_id: { type: "string", format: "uuid" },
      industry: { type: "string" },
      tech_stack: { type: "array", items: { type: "string" } },
      budget_min: { type: "integer" },
      budget_max: { type: "integer" },
      limit: { type: "integer", default: 3 }
    },
    required: ["org_id"]
  }
}

// Tool: create_approval
{
  name: "create_approval",
  description: "Queue an action for human approval",
  input_schema: {
    type: "object",
    properties: {
      deal_id: { type: "string", format: "uuid" },
      org_id: { type: "string", format: "uuid" },
      agent_name: { type: "string" },
      action: { type: "string", enum: ["send-outreach", "send-proposal", "send-followup", "decline-lead"] },
      payload: { type: "object" }
    },
    required: ["deal_id", "org_id", "agent_name", "action", "payload"]
  }
}

// Tool: list_active_deals
{
  name: "list_active_deals",
  description: "List all non-terminal deals for an org",
  input_schema: {
    type: "object",
    properties: {
      org_id: { type: "string", format: "uuid" },
      stages: { type: "array", items: { type: "string" } }  // optional filter
    },
    required: ["org_id"]
  }
}

// Tool: log_event
{
  name: "log_event",
  description: "Log an event in the deal audit trail",
  input_schema: {
    type: "object",
    properties: {
      deal_id: { type: "string", format: "uuid" },
      event_type: { type: "string" },
      description: { type: "string" },
      agent_name: { type: "string" }
    },
    required: ["deal_id", "event_type", "description"]
  }
}
```

---

## 6. Agent Architecture Deep Dive

### 6.1 Agent Base Pattern

Every agent follows the same execution pattern:

```
1. Receive trigger (API call, schedule, webhook)
2. Load deal context from Deal Store (get_deal + get_deal_artifacts)
3. Execute agent-specific logic (research, draft, extract, etc.)
4. Write output artifact to Deal Store (write_artifact)
5. Log event to audit trail (log_event)
6. Update deal stage if applicable (update_deal_stage)
7. Trigger next agent OR queue for human approval
```

### 6.2 Error Handling

Every agent must handle these error classes:

| Error | Agent Behavior |
|-------|---------------|
| MCP tool call fails | Retry up to 3 times with exponential backoff. If still fails, log error event, set deal stage to `stalled`, notify human. |
| Invalid input artifact | Log validation error, do not proceed, notify human with the specific validation failure. |
| Invalid stage transition | Log the attempted transition, do not update stage, alert human. |
| External service down (Gmail, Calendar) | Retry 3 times. If persistent, queue the action for retry in 1 hour. Log event. |
| Agent produces empty/garbage output | Validate output against Zod schema before writing. If validation fails, retry the generation once. If still fails, log error and notify human. |

### 6.3 Agent-to-Agent Handoff Protocol

Agents never call each other directly. The handoff works through the Deal Store:

```
Agent A finishes → writes artifact to Deal Store → updates deal stage
                → Orchestration layer detects stage change
                → Orchestration layer triggers Agent B with deal_id
```

The orchestration layer is a simple state machine listener:

```typescript
// Orchestration rules (implemented by Claude Code in CC-05)
const HANDOFF_RULES: Record<DealStage, { next_agent?: string; auto?: boolean }> = {
  'qualified':         { next_agent: 'scheduler', auto: true },
  'meeting-booked':    { next_agent: 'prep', auto: false },  // Prep runs on schedule, not immediate
  'proposal-pending':  { next_agent: 'proposal', auto: true },
  'proposal-sent':     { next_agent: 'chase', auto: false },  // Chase runs on daily schedule
};
```

---

## 7. Managed Agent & Routine Configurations

### 7.1 Scout Agent — Managed Agent

```yaml
# infra/managed-agents/scout.yaml
name: closepilot-scout
model: claude-sonnet-4-20250514
max_turns: 15
tools:
  - mcp_server: deal-store        # Custom MCP
  - web_search: true              # Built-in
  - mcp_server: gmail             # Google Gmail MCP
system_prompt: |
  You are the Scout Agent for Closepilot. Your job is to process incoming lead emails.
  
  For each email:
  1. Extract the contact name, company, email, stated need, budget signals, timeline signals.
  2. Use web_search to research the company: size, industry, funding, tech stack (from job postings).
  3. Use search_similar_projects from deal-store to find 2-3 similar past deals.
  4. Score the lead against the ICP config (provided in context).
  5. Write the complete LeadBrief artifact using write_artifact.
  6. Create the deal using create_deal.
  7. Log the event using log_event.
  8. If score >= qualify_threshold: update stage to 'qualified'.
  9. If score >= review_threshold: leave as 'new-lead', create approval with action 'needs-review'.
  10. If score < review_threshold: create approval with action 'decline-lead' and a draft decline email.
  
  CRITICAL: Output the complete LeadBrief JSON. Do not skip fields. Do not hallucinate company data — if you cannot find something, say "not found".
```

### 7.2 Prep Agent — Claude Code Routine

```yaml
# Created via claude.ai/code/routines or /schedule CLI
name: closepilot-prep
trigger:
  type: scheduled
  cadence: every-30-minutes
repo: closepilot/closepilot
connectors:
  - google-calendar
  - gmail
prompt: |
  Check Google Calendar for any meetings tagged "discovery-call" starting in the next 30-60 minutes.
  
  For each upcoming meeting:
  1. Read the meeting description to get the deal_id.
  2. Call the Closepilot API: GET /api/deals/{deal_id}/artifacts to get the LeadBrief.
  3. Use web search to find fresh news about the company (last 30 days).
  4. Use web search to check their current job postings (infer tech stack, hiring signals).
  5. Generate 3-5 talking points.
  6. Compile into a Call Dossier.
  7. POST the dossier to the Closepilot API: POST /api/deals/{deal_id}/artifacts.
  8. Send the dossier as an email to the meeting organizer via Gmail.
```

### 7.3 Chase Agent — Claude Code Routine

```yaml
name: closepilot-chase
trigger:
  type: scheduled
  cadence: daily
  time: "09:00"
  timezone: "Asia/Kolkata"
repo: closepilot/closepilot
connectors:
  - gmail
prompt: |
  Run the daily Chase sweep for Closepilot.
  
  1. Call Closepilot API: GET /api/deals?stages=proposal-sent,follow-up-1,follow-up-2,negotiating
  2. For each deal, check Gmail for any replies from the prospect since last check.
  3. Apply rules:
     - proposal-sent + no reply 48h → draft follow-up-1 email, queue for approval
     - follow-up-1 + no reply 72h → draft follow-up-2 email, queue for approval
     - follow-up-2 + no reply 7d → mark as stalled, notify human
     - reply detected → classify as negotiating, alert human
  4. Generate Deal Digest with all active deals summary.
  5. POST digest to API: POST /api/deals/digest
  6. Send digest email to org admin via Gmail.
```

---

## 8. Web UI Specification

### Pages & Components

| Route | Component | Data Source | Key Interactions |
|-------|-----------|------------|-----------------|
| `/auth` | Google OAuth login | POST /api/auth/google | Login button → OAuth flow → redirect to dashboard |
| `/dashboard` | Pipeline board (Kanban) | GET /api/deals?grouped_by=stage | Drag-drop deals between stages (manual override), click deal → detail |
| `/deals/[id]` | Deal detail | GET /api/deals/:id + GET /api/deals/:id/artifacts + GET /api/deals/:id/events | Timeline of all events + artifacts, Scribe input button, Proposal review |
| `/deals/[id]/scribe` | Scribe input | POST /api/deals/:id/scribe | Textarea for notes, file upload for transcript, submit triggers Scribe Agent |
| `/deals/[id]/proposal` | Proposal review | GET /api/deals/:id/artifacts?type=proposal-record | Embedded Google Doc viewer, pricing summary, approve/reject buttons |
| `/approvals` | Approval queue | GET /api/approvals/pending | List of pending approvals with preview, approve/edit/reject per item |
| `/settings` | Configuration | GET/PUT /api/settings | ICP config form, Google integration status, email template editor |

### Design Tokens

- Framework: Next.js 15 App Router with React Server Components
- Styling: Tailwind CSS + shadcn/ui
- Layout: Sidebar nav (pipeline, approvals, settings) + main content area
- Mobile: Responsive, approval actions work on mobile (tap to approve)
- Real-time: Polling every 30s on dashboard and approvals (upgrade to WebSocket later)

---

## 9. API Layer Specification

### Routes

```
POST   /api/auth/google              # OAuth code → session token
GET    /api/deals                    # List deals (query: stage, sort, limit)
GET    /api/deals/:id                # Get deal with latest artifact of each type
POST   /api/deals                    # Manual deal creation
PATCH  /api/deals/:id                # Update deal (stage override, manual edits)
GET    /api/deals/:id/artifacts      # All artifacts (query: type)
POST   /api/deals/:id/artifacts      # Write artifact (used by Routines via API)
GET    /api/deals/:id/events         # Audit trail
POST   /api/deals/:id/scribe        # Submit notes → triggers Scribe Agent
GET    /api/approvals/pending        # Pending approvals for the org
POST   /api/approvals/:id/approve    # Approve (optional: edited_payload)
POST   /api/approvals/:id/reject     # Reject with reason
GET    /api/settings                 # Org settings + ICP config
PUT    /api/settings                 # Update settings
POST   /api/webhooks/gmail           # Gmail push notification receiver
POST   /api/webhooks/esignature      # E-signature completion webhook
POST   /api/deals/digest             # Chase Agent posts daily digest
```

### Authentication

All API routes (except webhooks) require a Bearer token. The token is a JWT issued during Google OAuth, containing `user_id` and `org_id`. Middleware extracts the org context for multi-tenant queries.

Webhook routes use HMAC signature verification (Gmail push) or shared secret (e-signature).

---

## 10. Jules Setup & Configuration

### 10.1 Jules Environment Settings

Configure these in the Jules settings page at jules.google:

**Setup Script:**

```bash
#!/bin/bash
set -e

# Node.js & pnpm
corepack enable
corepack prepare pnpm@9 --activate

# Install dependencies
pnpm install --frozen-lockfile

# Database (use SQLite for Jules tests, Postgres in production)
# Jules tasks run unit tests with mocked DB, no real DB needed

# Build shared packages first
pnpm --filter @closepilot/core build
pnpm --filter @closepilot/db build

# Verify setup
pnpm --filter @closepilot/core test -- --run
echo "Setup complete"
```

**Environment Variables:**

| Key | Value | Description |
|-----|-------|-------------|
| `NODE_ENV` | `test` | Jules runs tests, not production |
| `DATABASE_URL` | (not needed) | Jules tasks mock the database |
| `ANTHROPIC_API_KEY` | (not needed) | Jules tasks mock Claude calls |

**Network Access:** Enable. Jules needs to install npm packages.

### 10.2 Jules Repository Configuration

The repo must have an `agents.md` file (see Section 15) in the root. Jules reads this automatically to understand the project.

### 10.3 How Jules Sessions Work

Each Jules session:
1. Clones the repo into `/app`
2. Runs the setup script
3. Reads `agents.md` from the repo root
4. Receives the task prompt you provide
5. Makes changes (creates/edits files)
6. Runs tests
7. Creates a PR with the changes

**Sessions are completely isolated.** Session A cannot see what Session B is doing. They both work against the `main` branch as it was when they started. This is why every task must target unique files.

### 10.4 Optimal Jules Task Sizing

Based on Jules capabilities:
- **Sweet spot:** 1 module with 1-2 files + its test file. ~100-400 lines of code total.
- **Too small:** A single utility function. Not worth a session.
- **Too large:** An entire agent orchestrator that depends on 4 sub-modules. Break it up.
- **Ideal output:** A PR with 2-4 files changed, all tests passing.

---

## 11. Jules Session Manifest: All 15 Parallel Sessions

### 11.1 Batch 1 — Data Layer (Day 4)

Run all 8 tasks simultaneously. Each targets a completely separate file.

| Session | Task ID | Task Title | Target File(s) | Depends On | Test File | Expected Output |
|---------|---------|-----------|----------------|-----------|-----------|----------------|
| 1 | J-101 | Deal Store MCP: deals CRUD | `packages/mcp-server/src/tools/deals.ts` | Core types, DB schema | `__tests__/deals.test.ts` | create_deal, get_deal, update_deal, list_deals tools. 4+ tests passing. |
| 2 | J-102 | Deal Store MCP: artifacts CRUD | `packages/mcp-server/src/tools/artifacts.ts` | Core types, DB schema | `__tests__/artifacts.test.ts` | write_artifact, get_artifact, get_deal_artifacts tools. 3+ tests passing. |
| 3 | J-103 | Deal Store MCP: events logging | `packages/mcp-server/src/tools/events.ts` | Core types, DB schema | `__tests__/events.test.ts` | log_event, get_deal_events tools. 3+ tests passing. |
| 4 | J-104 | Deal Store MCP: past projects | `packages/mcp-server/src/tools/past-projects.ts` | Core types, DB schema | `__tests__/past-projects.test.ts` | search_similar_projects, get_project tools. Similarity search by industry + tech stack + price range. 4+ tests. |
| 5 | J-105 | Deal Store MCP: approval queue | `packages/mcp-server/src/tools/approvals.ts` | Core types, DB schema | `__tests__/approvals.test.ts` | create_approval, list_pending, approve, reject tools. 4+ tests. |
| 6 | J-106 | Deal state machine | `packages/core/src/deal-state-machine.ts` | Core types only | `__tests__/deal-state-machine.test.ts` | `transitionDeal(current, target) → valid/invalid`. Tests ALL valid transitions + 5 invalid ones. |
| 7 | J-107 | Seed data | `packages/db/src/seeds/*.ts` | DB schema | N/A (seed runs without errors) | 10 sample past projects across 3 industries. 1 sample ICP config. 3 test deals at various stages. |
| 8 | J-108 | DB query helpers | `packages/db/src/queries/similarity.ts` | DB schema | `__tests__/similarity.test.ts` | `findSimilarProjects(criteria) → ProjectRef[]`. Scores by industry match + tech stack overlap + price proximity. 3+ tests. |

**Jules prompt for Session 1 (J-101):**

```
CONTEXT: You are working on Closepilot, an autonomous deal flow engine.
Read AGENTS.md in the repo root for full project context.

TASK ID: J-101
TASK: Implement the Deal Store MCP server tools for deal CRUD operations.

The MCP server uses @anthropic-ai/mcp SDK. You are implementing 4 tools:
- create_deal: Creates a new deal record
- get_deal: Retrieves a deal by ID  
- update_deal: Updates deal fields (stage, score, probability, value)
- list_deals: Lists deals for an org, optionally filtered by stage

INPUT: See tool schemas in AGENTS.md section "MCP Tools".
OUTPUT: Each tool returns the deal object matching the Deal interface in packages/core/src/types/deal.ts.

FILE TO CREATE: packages/mcp-server/src/tools/deals.ts
TEST FILE: packages/mcp-server/src/__tests__/deals.test.ts

REQUIREMENTS:
1. Import Deal type from @closepilot/core
2. Import db queries from @closepilot/db
3. Each tool is an async function matching MCP tool handler signature
4. Validate inputs with Zod before DB operations
5. update_deal must validate stage transitions using the deal-state-machine
6. list_deals supports optional stage[] filter and pagination (limit/offset)
7. All tools log events via a logEvent helper (imported, not implemented here)

TEST REQUIREMENTS:
- Mock the database layer (do not connect to a real DB)
- Test create_deal with valid input → returns deal with generated ID
- Test get_deal with valid ID → returns deal
- Test get_deal with invalid ID → returns typed error
- Test update_deal stage transition: valid and invalid
- Test list_deals with and without stage filter

DO NOT modify any files outside your target files.
DO NOT add new dependencies to package.json.
```

### 11.2 Batch 2 — Scout + Scheduler + Prep Agents (Day 5-6)

Run up to 11 tasks across two days. Scout has 5 modules, Scheduler has 3, Prep has 3.

| Session | Task ID | Task Title | Target File(s) | Input Contract | Output Contract | Expected Output |
|---------|---------|-----------|----------------|---------------|----------------|----------------|
| 1 | J-201 | Scout: email parser | `agents/src/scout/extract-lead.ts` | `{ raw_email_text: string }` | `Partial<LeadBrief>` (contact + need fields) | Parse email for name, email, company, need, budget/timeline signals. 3+ tests with varied email formats. |
| 2 | J-202 | Scout: company research | `agents/src/scout/research-company.ts` | `{ company_name: string }` | `CompanyResearch { size, industry, funding, tech_stack, news[] }` | Uses web search tool (mocked). Returns structured company data. 3+ tests. |
| 3 | J-203 | Scout: ICP scoring | `agents/src/scout/score-lead.ts` | `ScoreLeadInput` | `ICPScoreResult` | Pure computation. Weighted scoring. 5+ tests (perfect, partial, poor, edge cases). |
| 4 | J-204 | Scout: similar deals finder | `agents/src/scout/find-similar-deals.ts` | `{ industry, tech_stack, budget }` | `ProjectRef[]` | Uses search_similar_projects MCP tool (mocked). Returns top 3. 3+ tests. |
| 5 | J-205 | Scout: orchestrator | `agents/src/scout/index.ts` | `ScoutInput` | `ScoutOutput` | Calls extract → research → score → findSimilar → writes artifact. Imports sub-modules. 3+ integration tests with all mocked. |
| 6 | J-206 | Scheduler: availability checker | `agents/src/scheduler/check-availability.ts` | `{ date_range, duration_min }` | `TimeSlot[]` | Uses Google Calendar MCP (mocked). Returns available 30-min slots. 3+ tests. |
| 7 | J-207 | Scheduler: email drafter | `agents/src/scheduler/draft-outreach.ts` | `{ lead_brief: LeadBrief, slots: TimeSlot[] }` | `{ subject, body, to }` | Generates personalized email referencing company research. Under 150 words. 3+ tests. |
| 8 | J-208 | Scheduler: orchestrator | `agents/src/scheduler/index.ts` | `SchedulerInput` | `SchedulerOutput` | Calls availability → drafter → creates approval. 3+ tests. |
| 9 | J-209 | Prep: fresh research | `agents/src/prep/fresh-research.ts` | `{ company_name }` | `{ news[], job_postings[], observations }` | Web search for last 30 days. 3+ tests. |
| 10 | J-210 | Prep: talking points | `agents/src/prep/generate-talking-points.ts` | `{ lead_brief, research, projects }` | `TalkingPoint[]` | 3-5 contextual points. Categorized. 3+ tests. |
| 11 | J-211 | Prep: orchestrator | `agents/src/prep/index.ts` | `PrepInput` | `PrepOutput` | Loads deal context → fresh research → talking points → dossier → email. 3+ tests. |

### 11.3 Batch 3 — Scribe + Proposal + Chase + Web UI (Day 7-8)

Run up to 15 tasks in parallel (max concurrency).

| Session | Task ID | Task Title | Target File(s) | Expected Output |
|---------|---------|-----------|----------------|----------------|
| 1 | J-212 | Scribe: transcript parser | `agents/src/scribe/parse-transcript.ts` | Extract requirements, budget, timeline, decision-makers, concerns, promises from raw text. 4+ tests with varied formats. |
| 2 | J-213 | Scribe: probability calculator | `agents/src/scribe/calc-probability.ts` | Compute close probability from structured deal intel. 5+ tests. |
| 3 | J-214 | Scribe: orchestrator | `agents/src/scribe/index.ts` | Parse → calculate → write artifact → update stage. 3+ tests. |
| 4 | J-215 | Proposal: template selector | `agents/src/proposal/select-template.ts` | Match criteria to past proposal templates via Drive MCP (mocked). 3+ tests. |
| 5 | J-216 | Proposal: section generator | `agents/src/proposal/generate-sections.ts` | Generate exec summary, tech approach, delivery plan, concern responses. Uses Claude API. 3+ tests. |
| 6 | J-217 | Proposal: pricing engine | `agents/src/proposal/calculate-pricing.ts` | Average similar deal prices, adjust for scope, calculate margin. Pure computation. 5+ tests. |
| 7 | J-218 | Proposal: doc assembler | `agents/src/proposal/assemble-doc.ts` | Create Google Doc via Drive MCP (mocked) from sections + pricing. 3+ tests. |
| 8 | J-219 | Proposal: orchestrator | `agents/src/proposal/index.ts` | Full pipeline: select template → generate → price → assemble → approval. 3+ tests. |
| 9 | J-220 | Chase: daily sweep | `agents/src/chase/daily-sweep.ts` | Check all active deals, apply follow-up rules, return action items. 5+ tests for each rule. |
| 10 | J-221 | Chase: follow-up drafter | `agents/src/chase/draft-followup.ts` | Draft contextual follow-up email for a stalled deal. 3+ tests. |
| 11 | J-222 | Chase: digest generator | `agents/src/chase/generate-digest.ts` | Compile DealDigest from all deals. 3+ tests. |
| 12 | J-223 | Chase: orchestrator | `agents/src/chase/index.ts` | Sweep → draft follow-ups → generate digest → queue approvals. 3+ tests. |
| 13 | J-301 | Web: Auth page | `packages/web/src/app/auth/page.tsx` | Google OAuth login page with branded Closepilot UI. |
| 14 | J-302 | Web: Dashboard pipeline board | `packages/web/src/app/dashboard/page.tsx` + `components/pipeline-board.tsx` + `components/deal-card.tsx` | Kanban board with columns per stage. Deal cards show company, contact, value, score. |
| 15 | J-304 | Web: Approvals page | `packages/web/src/app/approvals/page.tsx` + `components/approval-item.tsx` | List pending approvals with preview. Approve/edit/reject buttons. |

### 11.4 Batch 4 — Remaining UI (Day 9)

| Session | Task ID | Task Title | Target File(s) | Expected Output |
|---------|---------|-----------|----------------|----------------|
| 1 | J-303 | Web: Deal detail page | `packages/web/src/app/deals/[id]/page.tsx` + `components/artifact-viewer.tsx` + `components/timeline-event.tsx` | Full deal page with timeline, artifact tabs, stage badge. |
| 2 | J-305 | Web: Scribe input page | `packages/web/src/app/deals/[id]/scribe/page.tsx` | Textarea + file upload + submit button. Calls POST /api/deals/:id/scribe. |
| 3 | J-306 | Web: Settings page | `packages/web/src/app/settings/page.tsx` | ICP config form, Google integration toggle, email template editor. |
| 4 | J-307 | Chase: digest email template | `agents/src/chase/templates/digest.html` | Responsive HTML email template for daily deal digest. Inline CSS. |
| 5 | J-308 | Web: Proposal review page | `packages/web/src/app/deals/[id]/proposal/page.tsx` | Pricing summary cards, Google Doc embed/link, approve/reject buttons. |

---

## 12. Claude Code Orchestrator Runbook

This is the step-by-step guide for the human operating Claude Code as the architect and integrator.

### Day 1-3: Phase 0 (Foundation)

```
SESSION 1 (Day 1, ~2 hours):
├── Create monorepo with pnpm workspace
├── Initialize all 6 packages (core, db, mcp-server, agents, api, web)
├── Write ALL TypeScript interfaces (Section 3 of this document)
├── Write tsconfig.base.json, shared eslint config
└── Commit: "feat: initialize monorepo with type contracts"

SESSION 2 (Day 2, ~2 hours):
├── Write complete Drizzle schema (Section 4)
├── Generate initial migration
├── Write deal-state-machine.ts with all transitions
├── Write error classes
├── Write constants (stage names, agent names)
└── Commit: "feat: database schema and deal state machine"

SESSION 3 (Day 3, ~2 hours):
├── Write MCP server skeleton (index.ts with tool registrations, empty implementations)
├── Write API skeleton (Hono routes, empty handlers)
├── Write AGENTS.md (Section 15)
├── Write CLAUDE.md (Claude Code context file)
├── Write scripts/setup.sh for Jules
├── Test that setup.sh works in a clean environment
└── Commit: "feat: MCP skeleton, API skeleton, AGENTS.md, Jules setup"
```

### Day 4-9: Jules Batches + Daily Review

```
DAILY RHYTHM:
├── Morning (30 min): Review overnight Jules PRs
│   ├── Check tests pass in each PR
│   ├── Check type compatibility with core interfaces
│   ├── Check no files outside target were modified
│   └── Approve + merge clean PRs, request changes on others
├── Mid-day: Launch next batch of Jules tasks
│   ├── Copy prompts from Section 11 of this document
│   ├── Verify each prompt includes the correct interface snippets
│   └── Assign to Jules sessions
└── Evening (1 hour): Integration check
    ├── Pull all merged PRs
    ├── Run pnpm test across all packages
    ├── Fix any cross-package type errors
    └── Commit fixes
```

### Day 10-12: Phase 4 (Integration)

```
SESSION 4 (Day 10, ~3 hours):
├── Merge all remaining Jules PRs
├── Resolve any merge conflicts
├── Build the API route implementations connecting UI → agents
│   ├── POST /api/deals/:id/scribe → triggers Scribe Managed Agent
│   ├── POST /api/approvals/:id/approve → triggers Scheduler or Proposal post-approval actions
│   └── POST /api/webhooks/gmail → triggers Scout on new email
└── Commit: "feat: API layer connecting UI to agents"

SESSION 5 (Day 11, ~2 hours):
├── Write Managed Agent YAML definitions (Section 7)
├── Write Claude Code Routine configurations (Section 7)
├── Test Scout agent end-to-end with a sample email
├── Test Scheduler agent with mocked calendar
└── Commit: "feat: Managed Agent and Routine configurations"

SESSION 6 (Day 12, ~3 hours):
├── Write end-to-end integration tests
│   ├── Test: Email in → Scout processes → deal created with LeadBrief
│   ├── Test: Qualified deal → Scheduler drafts email → approval created
│   ├── Test: Approved email → sent via Gmail → meeting booked
│   ├── Test: Notes submitted → Scribe extracts → proposal triggered
│   └── Test: Full cycle on a mock deal
├── Docker Compose for local development (Postgres + MCP server + API + Web)
├── Environment variable documentation
└── Commit: "feat: E2E tests, Docker Compose, launch prep"
```

---

## 13. Testing Strategy

### Unit Tests (Jules writes these)

Every Jules task includes tests. Tests mock external dependencies:

```typescript
// Example: Mocking MCP tool calls in agent tests
import { vi, describe, it, expect } from 'vitest';
import { scoreLead } from '../score-lead';

// Mock the MCP tool calls
vi.mock('@closepilot/mcp-client', () => ({
  callTool: vi.fn(async (tool: string, input: any) => {
    if (tool === 'search_similar_projects') {
      return { projects: [mockProject1, mockProject2] };
    }
    throw new Error(`Unexpected tool call: ${tool}`);
  }),
}));

describe('scoreLead', () => {
  it('scores a perfect match above qualify threshold', async () => {
    const result = await scoreLead(perfectMatchInput);
    expect(result.total_score).toBeGreaterThanOrEqual(90);
    expect(result.recommendation).toBe('qualify');
  });
});
```

### Integration Tests (Claude Code writes these)

Test agent-to-agent handoffs through the Deal Store:

```typescript
// Test: Scout → Scheduler handoff
it('qualified lead triggers scheduler', async () => {
  // Scout processes an email
  const scoutResult = await scoutAgent.process(sampleEmail);
  expect(scoutResult.action).toBe('qualify');
  
  // Check deal was created in the store
  const deal = await getDeal(scoutResult.lead_brief.lead_id);
  expect(deal.stage).toBe('qualified');
  
  // Check LeadBrief artifact was written
  const artifacts = await getDealArtifacts(deal.id, 'lead-brief');
  expect(artifacts).toHaveLength(1);
  
  // Orchestration triggers scheduler
  const schedulerResult = await schedulerAgent.process({
    lead_brief: artifacts[0].payload as LeadBrief,
    deal_id: deal.id,
    org_id: deal.org_id,
  });
  expect(schedulerResult.outreach_email_draft).toBeTruthy();
  expect(schedulerResult.approval_queue_id).toBeTruthy();
});
```

### Test Data

Seed files in `packages/db/src/seeds/` provide:

- 10 past projects: 4 fintech, 3 healthcare, 3 e-commerce. Mix of sizes ($20K-$200K).
- 1 ICP config: targeting funded startups, 20-200 employees, $50K-$200K budgets, React/Node/Python stacks.
- 5 test deals at various stages with pre-written artifacts for each.
- 3 sample email texts: perfect match, partial match, poor match.

---

## 14. Deployment & Infrastructure

### Local Development

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: closepilot
      POSTGRES_USER: closepilot
      POSTGRES_PASSWORD: localdev
    volumes:
      - pg_data:/var/lib/postgresql/data

  mcp-server:
    build: ./packages/mcp-server
    ports: ["3100:3100"]
    environment:
      DATABASE_URL: postgres://closepilot:localdev@postgres:5432/closepilot
    depends_on: [postgres]

  api:
    build: ./packages/api
    ports: ["3200:3200"]
    environment:
      DATABASE_URL: postgres://closepilot:localdev@postgres:5432/closepilot
      MCP_SERVER_URL: http://mcp-server:3100
    depends_on: [postgres, mcp-server]

  web:
    build: ./packages/web
    ports: ["3000:3000"]
    environment:
      API_URL: http://api:3200
    depends_on: [api]

volumes:
  pg_data:
```

### Production (Phase 1: Simple)

- **Database:** Neon Postgres (serverless, free tier to start)
- **MCP Server:** Deployed as a Cloud Run service (or Railway)
- **API:** Deployed on Vercel serverless functions (Hono adapter)
- **Web:** Deployed on Vercel (Next.js native)
- **Managed Agents:** Run on Anthropic infrastructure (no deployment needed)
- **Routines:** Run on Anthropic infrastructure (no deployment needed)

### Environment Variables (Production)

```
DATABASE_URL=postgres://...@neon.tech/closepilot
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
MCP_SERVER_URL=https://closepilot-mcp.fly.dev
JWT_SECRET=...
DEAL_STORE_MCP_AUTH_TOKEN=...
```

---

## 15. AGENTS.md Template for Jules

This file goes in the repository root. Jules reads it automatically.

```markdown
# Closepilot — Project Context for AI Agents

## What is this project?

Closepilot is an autonomous deal flow engine for B2B service businesses (agencies, consultancies, dev shops). Six specialized AI agents collaborate to handle the full lead-to-revenue lifecycle: research, qualification, scheduling, call preparation, conversation intelligence, proposal generation, follow-up, and close tracking.

## Architecture

- **Monorepo** with pnpm workspaces: packages/core, packages/db, packages/mcp-server, packages/agents, packages/api, packages/web
- **Shared types** in packages/core/src/types/ — ALL agent inputs and outputs are defined here
- **Deal Store** is a PostgreSQL database exposed as an MCP server (packages/mcp-server)
- **Agents** are independent modules in packages/agents/src/{agent-name}/
- **Web UI** is Next.js 15 + shadcn/ui in packages/web

## Rules for contributing

1. **NEVER modify files in packages/core/src/types/** — these are the contracts. If you think an interface is wrong, flag it in a comment but do not change it.
2. **NEVER modify files outside your assigned target files** — other agents/modules are built by other sessions.
3. **ALWAYS import types from @closepilot/core** — never redefine types locally.
4. **ALWAYS write tests** — every module must have unit tests with mocked dependencies.
5. **NEVER add new dependencies** to any package.json without explicit instruction.
6. **ALWAYS use Zod for runtime validation** of inputs in MCP tools and API routes.
7. **ALWAYS handle errors** by returning typed error objects, never throwing untyped exceptions.

## Key interfaces

See packages/core/src/types/index.ts for all types. The critical ones:
- Deal, DealStage — the core deal record and stage enum
- LeadBrief, MeetingRecord, CallDossier, DealIntel, ProposalRecord — agent artifacts
- ScoutInput/Output, SchedulerInput/Output, etc. — agent function signatures
- ApprovalQueueItem — the human approval gate data structure

## MCP tools available

The Deal Store MCP server provides:
- create_deal, get_deal, update_deal_stage, list_active_deals
- write_artifact, get_deal_artifacts
- log_event, get_deal_events
- search_similar_projects
- create_approval, list_pending_approvals, approve_approval, reject_approval

## Testing

Run tests with: pnpm --filter {package-name} test
Run all tests: pnpm test
All tests use Vitest. Mock external dependencies (MCP calls, Gmail, Calendar).
```

---

## Appendix A: File Ownership Matrix

This table ensures no two Jules tasks ever touch the same file.

| File Path | Owner (Task ID) | Status |
|-----------|----------------|--------|
| `packages/core/src/types/*` | CC-02 (Claude Code) | Foundation — never modified by Jules |
| `packages/core/src/deal-state-machine.ts` | J-106 | |
| `packages/core/src/errors.ts` | CC-02 | Foundation |
| `packages/core/src/constants.ts` | CC-02 | Foundation |
| `packages/db/src/schema/*` | CC-03 | Foundation |
| `packages/db/src/seeds/*` | J-107 | |
| `packages/db/src/queries/similarity.ts` | J-108 | |
| `packages/mcp-server/src/tools/deals.ts` | J-101 | |
| `packages/mcp-server/src/tools/artifacts.ts` | J-102 | |
| `packages/mcp-server/src/tools/events.ts` | J-103 | |
| `packages/mcp-server/src/tools/past-projects.ts` | J-104 | |
| `packages/mcp-server/src/tools/approvals.ts` | J-105 | |
| `packages/agents/src/scout/extract-lead.ts` | J-201 | |
| `packages/agents/src/scout/research-company.ts` | J-202 | |
| `packages/agents/src/scout/score-lead.ts` | J-203 | |
| `packages/agents/src/scout/find-similar-deals.ts` | J-204 | |
| `packages/agents/src/scout/index.ts` | J-205 | |
| `packages/agents/src/scheduler/check-availability.ts` | J-206 | |
| `packages/agents/src/scheduler/draft-outreach.ts` | J-207 | |
| `packages/agents/src/scheduler/index.ts` | J-208 | |
| `packages/agents/src/prep/fresh-research.ts` | J-209 | |
| `packages/agents/src/prep/generate-talking-points.ts` | J-210 | |
| `packages/agents/src/prep/index.ts` | J-211 | |
| `packages/agents/src/scribe/parse-transcript.ts` | J-212 | |
| `packages/agents/src/scribe/calc-probability.ts` | J-213 | |
| `packages/agents/src/scribe/index.ts` | J-214 | |
| `packages/agents/src/proposal/select-template.ts` | J-215 | |
| `packages/agents/src/proposal/generate-sections.ts` | J-216 | |
| `packages/agents/src/proposal/calculate-pricing.ts` | J-217 | |
| `packages/agents/src/proposal/assemble-doc.ts` | J-218 | |
| `packages/agents/src/proposal/index.ts` | J-219 | |
| `packages/agents/src/chase/daily-sweep.ts` | J-220 | |
| `packages/agents/src/chase/draft-followup.ts` | J-221 | |
| `packages/agents/src/chase/generate-digest.ts` | J-222 | |
| `packages/agents/src/chase/index.ts` | J-223 | |
| `packages/agents/src/chase/templates/digest.html` | J-307 | |
| `packages/web/src/app/auth/page.tsx` | J-301 | |
| `packages/web/src/app/dashboard/page.tsx` | J-302 | |
| `packages/web/src/components/pipeline-board.tsx` | J-302 | |
| `packages/web/src/components/deal-card.tsx` | J-302 | |
| `packages/web/src/app/deals/[id]/page.tsx` | J-303 | |
| `packages/web/src/components/artifact-viewer.tsx` | J-303 | |
| `packages/web/src/components/timeline-event.tsx` | J-303 | |
| `packages/web/src/app/approvals/page.tsx` | J-304 | |
| `packages/web/src/components/approval-item.tsx` | J-304 | |
| `packages/web/src/app/deals/[id]/scribe/page.tsx` | J-305 | |
| `packages/web/src/app/settings/page.tsx` | J-306 | |
| `packages/web/src/app/deals/[id]/proposal/page.tsx` | J-308 | |

---

## Appendix B: Complete Jules Task Checklist

Use this to track progress. Check off each task as the PR is merged.

```
PHASE 0 — Foundation (Claude Code)
[ ] CC-01: Initialize monorepo
[ ] CC-02: TypeScript interfaces (ALL types)
[ ] CC-03: Database schema + migrations
[ ] CC-04: MCP server skeleton
[ ] CC-05: Agent base class + orchestration
[ ] CC-06: Approval queue API skeleton
[ ] CC-07: AGENTS.md + CLAUDE.md
[ ] CC-08: Setup script for Jules

PHASE 1 — Data Layer (Jules Batch 1)
[ ] J-101: MCP deals CRUD
[ ] J-102: MCP artifacts CRUD
[ ] J-103: MCP events logging
[ ] J-104: MCP past projects
[ ] J-105: MCP approval queue
[ ] J-106: Deal state machine
[ ] J-107: Seed data
[ ] J-108: Similarity queries

PHASE 2 — Agents (Jules Batch 2 + 3)
[ ] J-201: Scout email parser
[ ] J-202: Scout company research
[ ] J-203: Scout ICP scoring
[ ] J-204: Scout similar deals
[ ] J-205: Scout orchestrator
[ ] J-206: Scheduler availability
[ ] J-207: Scheduler email drafter
[ ] J-208: Scheduler orchestrator
[ ] J-209: Prep fresh research
[ ] J-210: Prep talking points
[ ] J-211: Prep orchestrator
[ ] J-212: Scribe transcript parser
[ ] J-213: Scribe probability calc
[ ] J-214: Scribe orchestrator
[ ] J-215: Proposal template selector
[ ] J-216: Proposal section generator
[ ] J-217: Proposal pricing engine
[ ] J-218: Proposal doc assembler
[ ] J-219: Proposal orchestrator
[ ] J-220: Chase daily sweep
[ ] J-221: Chase follow-up drafter
[ ] J-222: Chase digest generator
[ ] J-223: Chase orchestrator

PHASE 3 — Web UI (Jules Batch 3 + 4)
[ ] J-301: Auth page
[ ] J-302: Dashboard + pipeline board
[ ] J-303: Deal detail page
[ ] J-304: Approvals page
[ ] J-305: Scribe input page
[ ] J-306: Settings page
[ ] J-307: Digest email template
[ ] J-308: Proposal review page

PHASE 4 — Integration (Claude Code)
[ ] CC-20: Merge all Jules PRs
[ ] CC-21: API routes implementation
[ ] CC-22: Managed Agent YAML configs
[ ] CC-23: Claude Code Routine configs
[ ] CC-24: E2E integration tests
[ ] CC-25: Docker Compose + deployment

PHASE 5 — Launch
[ ] Dogfood with own pipeline
[ ] Fix issues from dogfood
[ ] Beta invite 3-5 agencies
[ ] Monitor + iterate
```

---

*End of document. This is everything needed to build Closepilot from zero to deployed product.*
