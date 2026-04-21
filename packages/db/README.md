# @closepilot/db

PostgreSQL database schema and Drizzle ORM query layer for Closepilot. All persistent state lives here — deals, activities, approvals, projects, and documents.

## Status

✅ Complete — schema defined, Drizzle queries exported, migrations ready.

## Schema

### `deals`
The primary table. Stores the full lifecycle of every B2B deal:

| Column | Type | Notes |
|--------|------|-------|
| `id` | serial | Primary key |
| `stage` | text | Current `DealStage` enum value |
| `leadEmail` | text | Lead's email address |
| `leadName` | text | Lead's full name |
| `leadCompany` | text | Company name |
| `leadPhone` | text | |
| `source` | text | `gmail`, `manual`, etc. |
| `companyResearch` | jsonb | Enrichment output |
| `prospectResearch` | jsonb | Contact research output |
| `projectScope` | jsonb | Scoping output |
| `requirements` | jsonb | Extracted requirements array |
| `proposal` | jsonb | Full proposal document |
| `crmId` | text | CRM system record ID |
| `crmType` | text | `hubspot`, `salesforce`, `pipedrive` |
| `crmSyncedAt` | timestamp | Last sync time |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

### `activities`
Immutable audit log of everything agents do:

| Column | Type | Notes |
|--------|------|-------|
| `id` | serial | |
| `dealId` | integer | FK → deals |
| `agentType` | text | Which agent acted |
| `activityType` | text | `email_received`, `deal_created`, etc. |
| `description` | text | Human-readable summary |
| `metadata` | jsonb | Agent-specific details |
| `createdAt` | timestamp | |

### `approvals`
Human-in-the-loop checkpoints:

| Column | Type | Notes |
|--------|------|-------|
| `id` | serial | |
| `dealId` | integer | FK → deals |
| `approverEmail` | text | Who needs to approve |
| `itemType` | text | What's being approved |
| `itemId` | text | Reference to the item |
| `status` | text | `pending`, `approved`, `rejected` |
| `requestComment` | text | Context from agent |
| `responseComment` | text | Reviewer's note |
| `respondedAt` | timestamp | |
| `createdAt` | timestamp | |

### `projects` and `documents`
Supporting tables for project tracking and Drive document references.

## Usage

```typescript
import { db } from '@closepilot/db';
import { deals } from '@closepilot/db/schema';
import { getDeal, createDeal, updateDeal } from '@closepilot/db/queries/deals';

// Direct Drizzle query
const allDeals = await db.select().from(deals);

// Query helpers
const deal = await getDeal('deal-123');
await updateDeal('deal-123', { stage: 'proposal' });
```

## Commands

```bash
pnpm db:push      # Push schema changes directly to DB (dev)
pnpm db:migrate   # Run migration files (production)
pnpm db:studio    # Open Drizzle Studio at http://localhost:4983
pnpm build        # tsc
```

## Environment

Requires `DATABASE_URL` pointing to a PostgreSQL instance:

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/closepilot
```
