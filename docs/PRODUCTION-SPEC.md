# Closepilot — Production Spec

> **Date:** 2026-04-22  
> **Purpose:** Definitive blueprint for taking Closepilot from "infrastructure exists, agents are fake" to "fully autonomous B2B sales pipeline running in production."  
> This document supersedes task-level specs. It is the canonical source for what to build next and in what order.

---

## 1. Honest Current State

### The Infrastructure Is Solid

Everything below is real, working, and should not be touched:

| Component | Status | Notes |
|-----------|--------|-------|
| PostgreSQL schema | ✅ Real | All tables: deals, artifacts, events, approvals, orgs, users |
| MCP server (50+ tools) | ✅ Real | Gmail, Calendar, Drive, Deal Store — all defined |
| REST API | ✅ Real | Full CRUD + analytics endpoints on Hono |
| Next.js dashboard | ✅ Real | Kanban, deal detail, approvals, activity feed |
| Google OAuth + JWT | ✅ Real | Full auth + token refresh |
| BullMQ queue + worker.ts | ✅ Real | Infrastructure correct — **just never started** |
| Orchestrator | ✅ Real | Well-structured state machine + job enqueueing |
| Docker + Fly.io + CI/CD | ✅ Real | Complete deployment pipeline |
| OpenTelemetry + Prometheus | ✅ Real | Tracing + metrics |
| CRM Sync agent | ✅ Real | HubSpot, Salesforce, Pipedrive adapters all working |
| Ingestion agent | ✅ Real | Gmail polling + Claude classification + lead extraction |

### The Agent Brains Are Missing or Fake

| Agent | File | Reality |
|-------|------|---------|
| `Scoping` | `scoping/src/index.ts` | **Empty file** — just a comment header, zero implementation |
| `Enrichment > CompanyResearcher` | `company-researcher.ts` | Stub — no API calls, depends on DataSources (also stubs) |
| `Enrichment > ProspectResearcher` | `prospect-researcher.ts` | Keyword matching on job title — no real profile research |
| `Proposal > ContentGenerator` | `content-generator.ts` | **Fully hardcoded boilerplate strings** — zero Claude |
| `Proposal > PricingStrategy` | `pricing-strategy.ts` | **Hardcoded lookup table** (Web Dev: $15k, Mobile: $25k) — arbitrary multipliers |
| `worker.ts` imports | `orchestrator/src/worker.ts` | **Broken import paths** — will crash on start |

### Three Entire Agents Don't Exist

- **Outreach** — no package, no code (covers: outreach email draft + calendar booking)
- **Prep** — no package, no code (covers: pre-call dossier)
- **Chase** — no package, no code (covers: stall detection + follow-up automation)

---

## 2. The Definitive Architecture

This is what we're building. Not the original spec's agent names, not just what exists today — the optimal system given what's already built.

### Agent Pipeline

```
                    ┌──────────────────────────────────────────────────────┐
  Gmail Inbox       │                   AGENT PIPELINE                     │
      │             │                                                      │
      ▼             │  [Intake]──▶ Approval ──▶ [Outreach] ──▶ Meeting     │
  Ingestion ✅      │     │                         │                      │
      │             │  classify + ICP score         │ book calendar         │
      ▼             │     │                         ▼                      │
  Enrichment 🔧     │  Research                  [Prep*]                   │
      │             │  company                  dossier                    │
      ▼             │     │                     (async)                    │
   ICP score        │     ▼                         │                      │
      │             │  Qualified Lead          Call Notes                  │
      │             │                               │                      │
      │             │                         [Scope] 🔧                   │
      │             │                               │                      │
      │             │                       requirements +                 │
      │             │                       close probability               │
      │             │                               │                      │
      │             │                               ▼                      │
      │             │                     Approval ──▶ [Propose] 🔧        │
      │             │                                       │               │
      │             │                               Claude sections +       │
      │             │                               pricing + Google Doc    │
      │             │                                       │               │
      │             │                               Approval ──▶ Email     │
      │             │                                       │               │
      │             │                               [Chase] ──▶ [CRM Sync] │
      │             │                               follow-up     ✅        │
      │             └──────────────────────────────────────────────────────┘
      │
      ▼
  BullMQ Queue ──▶ worker.ts ──▶ routes to agent ──▶ updates deal stage
```

### The 7 Agents (Definitive Lineup)

| Agent | Status | Purpose | Stages |
|-------|--------|---------|--------|
| **Intake** (Ingestion + Enrichment) | 🔧 Fix | Email classify + company research + ICP score | `new-lead → qualified/declined` |
| **Outreach** | 🆕 Build | Personalized outreach email + calendar booking | `qualified → outreach-sent → meeting-booked` |
| **Prep** | 🆕 Build (Phase C) | Pre-call dossier 30 min before meeting | *Async, no stage change* |
| **Scope** | 🆕 Implement | Requirements extraction from call notes (Claude) | `meeting-booked → scoping → proposal-pending` |
| **Propose** | 🔧 Fix | Real Claude sections + pricing + Google Doc | `proposal-pending → proposal-sent` |
| **Chase** | 🆕 Build | Daily stall detection + follow-up automation | `proposal-sent → follow-up-1/2 → negotiating → closed` |
| **CRM Sync** | ✅ Keep | Sync to HubSpot/Salesforce/Pipedrive | `proposal-sent → completed` |

### Deal Stage Additions Needed

Current 7 stages → Target 13 stages:

```sql
-- Add to deal_stage enum:
'outreach-sent'     -- Outreach agent sent email, awaiting reply
'meeting-booked'    -- Calendar invite accepted
'follow-up-1'       -- Chase sent first follow-up
'follow-up-2'       -- Chase sent second follow-up
'negotiating'       -- Deal in active negotiation
'proposal-revised'  -- Proposal revised after negotiation
```

---

## 3. What to Keep, Fix, Add, and Discard

### Keep As-Is (Do Not Modify)

- `packages/api/` — complete REST API
- `packages/web/` — complete dashboard
- `packages/mcp-server/` — all 50+ tools defined correctly
- `packages/mcp-client/` — wrappers used by agents
- `packages/db/` — schema, queries, migrations
- `packages/agents/crm-sync/` — working CRM adapters
- `packages/agents/ingestion/` — working Gmail polling + classification
- `packages/agents/orchestrator/src/queue.ts` — real BullMQ queue
- `packages/agents/orchestrator/src/` (state machine, approval-queue, audit-log) — solid

### Fix (Existing Files with Wrong Implementation)

| File | Problem | Fix |
|------|---------|-----|
| `orchestrator/src/worker.ts` | Broken import paths, Scoping import crashes | Fix import paths, wire new agents |
| `enrichment/src/company-researcher.ts` | No API calls, stub DataSources | Rewrite: Claude + Anthropic web search tool |
| `enrichment/src/prospect-researcher.ts` | Keyword title matching only | Rewrite: Claude-based profile research from email context |
| `enrichment/src/index.ts` | Calls stub methods | Add ICP scoring call after research |
| `proposal/src/content-generator.ts` | Hardcoded boilerplate strings | Rewrite: Claude generates each proposal section |
| `proposal/src/pricing-strategy.ts` | Hardcoded lookup table ($15k Web Dev) | Rewrite: scope-based pricing with past project similarity |
| `proposal/src/index.ts` | Mock Google Drive document ID | Wire real Drive MCP tool: `create_google_doc` |

### Build New

| What | Where | Why |
|------|-------|-----|
| Scoping agent | `packages/agents/scoping/src/index.ts` | Empty file — core agent, blocks Proposal |
| ICP scoring module | `packages/agents/enrichment/src/icp-scorer.ts` | Foundation of the moat |
| Outreach agent | `packages/agents/outreach/` (new package) | Missing link: qualified → meeting booked |
| Chase agent | `packages/agents/chase/` (new package) | Post-proposal follow-up, stall detection |
| DB migration | `packages/db/drizzle/` | Add 6 missing stage enum values |
| Worker job types | `orchestrator/src/jobs.ts` | Add Outreach + Chase job types |
| UI stage columns | `packages/web/components/kanban/` | Add missing stage columns |

### Discard / Replace

| File | Action |
|------|--------|
| `enrichment/src/data-sources.ts` | Delete — replace with direct Claude + web search calls |
| Hardcoded service rates in `pricing-strategy.ts` | Delete — replace with requirements-based logic |
| `proposal/src/index.ts` mock document block | Remove — replace with real Drive MCP call |

### Deprioritize to Phase C

- Prep agent (nice-to-have, not blocking)
- pgvector past-project similarity (improves pricing but not blocking)
- RBAC middleware enforcement (schema exists, not blocking for single-org use)
- ICP model retraining (Phase C — needs deal outcome data first)

---

## 4. Phase A — "Make It Run" (Days 1–2)

**Goal:** One real inbound email flows end-to-end through the pipeline automatically.

### Track 1: Infrastructure Unblock (4 hours)

**Can run in parallel with Track 2 and Track 3.**

#### Task A1: Fix worker.ts import paths

File: `packages/agents/orchestrator/src/worker.ts`

Fix broken imports:
```typescript
// Wrong:
import { ScopingAgent } from '@closepilot/agent-scoping';
// Right: (after implementing scoping)
import { ScopingAgent } from '../../scoping/src/index.js';
// Or via package reference once scoping package is built
```

Also fix Ingestion wiring — Ingestion is trigger-based (polls Gmail), not queue-based. 
The worker should NOT try to enqueue RunIngestion. Instead, Ingestion runs as a separate long-running process and pushes `RunEnrichment` jobs when it creates a deal.

Update `packages/agents/ingestion/src/index.ts` to enqueue a `RunEnrichment` job after deal creation:
```typescript
// After creating deal in DB:
await queue.add('RunEnrichment', { dealId, orgId });
```

#### Task A2: Start the worker

Add to `package.json` root scripts:
```json
"worker:dev": "tsx packages/agents/orchestrator/src/worker.ts"
```

Add to `docker-compose.yml`:
```yaml
worker:
  build: .
  command: node packages/agents/orchestrator/src/worker.js
  environment:
    - DATABASE_URL
    - REDIS_URL
    - ANTHROPIC_API_KEY
  depends_on: [postgres, redis]
```

#### Task A3: Set real credentials

`.env` changes needed:
```env
ANTHROPIC_API_KEY=sk-ant-...          # Required for all agents
GOOGLE_ACCESS_TOKEN=ya29...           # Required for Gmail + Calendar
GOOGLE_REFRESH_TOKEN=1//...           # Required for token refresh
GOOGLE_PRIVATE_KEY=...                # Required for Drive service account
```

---

### Track 2: Implement Scoping Agent (6 hours)

**Can run in parallel with Track 1 and Track 3.**

File: `packages/agents/scoping/src/index.ts` — currently **empty**, implement from scratch.

#### What it does

Receives call notes/email from a meeting, extracts structured requirements, estimates complexity, calculates close probability, decides next action.

#### Implementation

```typescript
import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `You are a B2B sales scoping analyst. Given call notes or an email thread, extract:
1. Functional requirements (what they need built)
2. Non-functional requirements (performance, scale, timeline)
3. Budget signals (confirmed or inferred)
4. Decision makers involved
5. Concerns or risks raised
6. Close probability (0–100) based on engagement signals
Output strict JSON matching the DealIntel interface.`;

export class ScopingAgent {
  private claude: Anthropic;

  async process(input: ScopingInput): Promise<ScopingOutput> {
    const response = await this.claude.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: input.raw_notes }],
    });
    
    const dealIntel = JSON.parse(extractJson(response));
    
    // Determine next action
    const nextAction = dealIntel.close_probability >= 60 
      ? 'trigger-proposal' 
      : dealIntel.close_probability >= 30 
      ? 'trigger-followup' 
      : 'needs-human';
    
    // Update deal with close probability
    await dealStoreTools.updateDeal({ 
      id: input.deal_id, 
      close_probability: dealIntel.close_probability 
    });
    
    return { deal_intel: dealIntel, next_action: nextAction };
  }
}
```

Also create `packages/agents/scoping/src/scoping-agent.test.ts` with unit tests.

---

### Track 3: Fix Enrichment + Proposal (8 hours)

**Can run in parallel with Track 1 and Track 2.**

#### Task A4: Rewrite company-researcher.ts

Replace stub with real Claude + web search:

```typescript
import Anthropic from '@anthropic-ai/sdk';

export class CompanyResearcher {
  async research(company: string, domain: string): Promise<CompanyProfile> {
    const client = new Anthropic();
    
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      tools: [{ type: 'web_search' }],  // Claude built-in web search
      messages: [{
        role: 'user',
        content: `Research "${company}" (domain: ${domain}). Find:
        - Company size (employees), founded year, funding stage
        - Primary products/services and target market
        - Tech stack signals (job postings, engineering blog, G2 reviews)
        - Recent news or funding events (last 6 months)
        - Key decision makers (CTO, VP Eng, CEO)
        Return as JSON: { size, founded, funding, tech_stack, recent_news, decision_makers, description }`
      }]
    });
    
    return JSON.parse(extractJson(response));
  }
}
```

#### Task A5: Rewrite prospect-researcher.ts

Replace keyword matching with Claude inference from email context:

```typescript
export class ProspectResearcher {
  async research(email: string, name: string, title: string, company: string): Promise<ProspectProfile> {
    // Use the email content itself as the primary signal
    // Claude infers decision-making authority from how they write + their title
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      messages: [{
        role: 'user',
        content: `Based on: Name="${name}", Title="${title}", Company="${company}"
        Infer:
        - Decision-making authority level (final/influencer/champion/unknown)  
        - Technical depth (high/medium/low/unknown)
        - Seniority (C-level/VP/Director/Manager/IC)
        - Likely pain points for a ${title} at ${company}
        Return JSON: { authority, technical_depth, seniority, pain_points, linkedin_search_url }`
      }]
    });
    
    return JSON.parse(extractJson(response));
  }
}
```

#### Task A6: Add ICP scoring to Enrichment

New file: `packages/agents/enrichment/src/icp-scorer.ts`

```typescript
export function scoreICP(
  companyProfile: CompanyProfile, 
  prospectProfile: ProspectProfile,
  icpConfig: ICPConfig
): ICPScoreResult {
  let score = 0;
  const breakdown = [];
  
  // Industry match (weight: 20)
  const industryMatch = icpConfig.target_industries.includes(companyProfile.industry);
  const industryScore = industryMatch ? icpConfig.weights.industry : 0;
  score += industryScore;
  breakdown.push({ category: 'industry', score: industryScore, max: icpConfig.weights.industry, 
    reasoning: industryMatch ? 'Industry matches target' : 'Industry not in target list' });
  
  // Company size (weight: 20)
  const sizeInRange = companyProfile.size >= icpConfig.min_company_size && 
                      companyProfile.size <= icpConfig.max_company_size;
  const sizeScore = sizeInRange ? icpConfig.weights.size : Math.max(0, icpConfig.weights.size * 0.5);
  score += sizeScore;
  breakdown.push({ category: 'size', score: sizeScore, max: icpConfig.weights.size,
    reasoning: `${companyProfile.size} employees — ${sizeInRange ? 'in range' : 'outside target range'}` });
  
  // Tech stack overlap (weight: 20)
  const techOverlap = companyProfile.tech_stack.filter(t => 
    icpConfig.preferred_tech_stack.includes(t)).length;
  const techScore = Math.min(icpConfig.weights.tech_stack, techOverlap * 5);
  score += techScore;
  
  // Decision-maker seniority (weight: 20)
  const seniorityMatch = icpConfig.preferred_seniority.includes(prospectProfile.seniority);
  const seniorityScore = seniorityMatch ? icpConfig.weights.seniority : 0;
  score += seniorityScore;
  
  // Authority level (weight: 20)
  const authorityScore = { final: 20, influencer: 12, champion: 8, unknown: 5 }[prospectProfile.authority] || 0;
  score += authorityScore;
  
  const recommendation = score >= icpConfig.qualify_threshold ? 'qualify' 
    : score >= icpConfig.review_threshold ? 'needs-review' : 'decline';
  
  return { total_score: Math.min(100, score), breakdown, recommendation };
}
```

#### Task A7: Rewrite content-generator.ts

Replace hardcoded boilerplate with Claude generation:

```typescript
export async function generateProposalContent(
  dealIntel: DealIntel, 
  company: string,
  pastProjects: ProjectRef[]
): Promise<ProposalContent> {
  const client = new Anthropic();
  
  const contextBlock = `
Company: ${company}
Requirements: ${JSON.stringify(dealIntel.requirements, null, 2)}
Budget: ${dealIntel.budget_confirmed}
Timeline: ${JSON.stringify(dealIntel.timeline)}
Similar past projects: ${JSON.stringify(pastProjects.slice(0, 3), null, 2)}
  `;
  
  const sections = await Promise.all([
    generateSection(client, 'executive_summary', contextBlock),
    generateSection(client, 'technical_approach', contextBlock),
    generateSection(client, 'timeline_and_phases', contextBlock),
    generateSection(client, 'investment', contextBlock),
    generateSection(client, 'why_us', contextBlock),
  ]);
  
  return {
    executive_summary: sections[0],
    technical_approach: sections[1],
    timeline_and_phases: sections[2],
    investment: sections[3],
    why_us: sections[4],
    cover_email: await generateCoverEmail(client, company, contextBlock),
  };
}

async function generateSection(client: Anthropic, section: string, context: string): Promise<string> {
  const prompts = {
    executive_summary: 'Write a compelling 2-paragraph executive summary for this proposal...',
    technical_approach: 'Describe our technical approach for solving their requirements...',
    // ... etc
  };
  
  const response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 800,
    messages: [{ role: 'user', content: `${prompts[section]}\n\nContext:\n${context}` }]
  });
  
  return response.content[0].text;
}
```

#### Task A8: Fix pricing-strategy.ts

Replace hardcoded lookup with requirements-based calculation:

```typescript
export async function calculatePricing(
  requirements: Requirement[],
  timeline: Timeline,
  pastProjects: ProjectRef[]  // From similar past projects (pgvector or keyword match)
): Promise<PricingResult> {
  // Base estimate from requirements complexity
  const complexityHours = estimateHours(requirements);
  const hourlyRate = 150; // Configurable per org
  const basePrice = complexityHours * hourlyRate;
  
  // Adjust based on similar past project prices
  if (pastProjects.length > 0) {
    const avgPastPrice = pastProjects.reduce((sum, p) => sum + p.price, 0) / pastProjects.length;
    // Blend base estimate with past project reference
    const adjustedPrice = (basePrice * 0.6) + (avgPastPrice * 0.4);
    return buildPricingResult(adjustedPrice, requirements, timeline);
  }
  
  return buildPricingResult(basePrice, requirements, timeline);
}

function estimateHours(requirements: Requirement[]): number {
  const baseHours = { must: 40, should: 20, nice: 8 };
  const complexityMultiplier = { high: 1.5, medium: 1.0, low: 0.7 };
  
  return requirements.reduce((total, req) => {
    const base = baseHours[req.priority] || 20;
    // Simple complexity heuristic from description length + keywords
    const complexity = req.description.length > 200 ? 'high' : 
                       req.description.length > 100 ? 'medium' : 'low';
    return total + (base * complexityMultiplier[complexity]);
  }, 0);
}
```

#### Task A9: Wire real Google Docs in proposal/src/index.ts

Replace mock document ID:

```typescript
// Replace the mock block:
// const mockDocumentId = `PROPOSAL_${dealId}_${Date.now()}`;

// With real Drive MCP call:
const driveTools = new DriveTools(mcpClient);
const docResult = await driveTools.createDocument({
  title: `Proposal — ${deal.company_name} — ${new Date().toLocaleDateString()}`,
  content: formatProposalAsHtml(proposalContent),
  folderId: process.env.PROPOSALS_FOLDER_ID,
});
const documentUrl = docResult.webViewLink;
```

---

### Phase A Acceptance Criteria

- [ ] `pnpm worker:dev` starts without import errors
- [ ] Worker processes a `RunEnrichment` job without crashing
- [ ] Enrichment agent calls Claude API and returns real company data (not empty/mock)
- [ ] Scoping agent processes sample call notes and returns structured requirements
- [ ] Proposal agent generates non-boilerplate content for each section
- [ ] Full pipeline: new-lead → qualified → scoping → proposal-sent — one deal, automated

---

## 5. Phase B — "Complete the Sales Cycle" (Days 3–5)

**Goal:** Full automation from email arrival to closed deal, including meeting booking and follow-up.

### Track 1: Outreach Agent — New Package (1.5 days)

**New package:** `packages/agents/outreach/`

#### What it does

Triggered when a deal reaches `qualified` stage and a human approves outreach.  
Writes a personalized outreach email, checks Google Calendar for available slots, queues the email for approval, then books the meeting once the prospect replies.

#### Package structure

```
packages/agents/outreach/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts          # OutreachAgent class
    ├── email-drafter.ts  # Claude generates personalized email
    ├── slot-finder.ts    # Google Calendar availability check
    ├── booker.ts         # Creates calendar event + sends confirmation
    └── reply-parser.ts   # Parses prospect's reply to detect acceptance
```

#### Core implementation

```typescript
// email-drafter.ts
export async function draftOutreachEmail(
  leadBrief: LeadBrief,
  orgProfile: OrgProfile  // Our company description, value prop
): Promise<EmailDraft> {
  const response = await claude.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    messages: [{
      role: 'user',
      content: `Draft a concise outreach email to ${leadBrief.contact_name} at ${leadBrief.company.name}.
      
Their inquiry: ${leadBrief.stated_need}
Their tech stack: ${leadBrief.inferred_tech_stack.join(', ')}
ICP score: ${leadBrief.icp_score}/100
Similar past work: ${leadBrief.similar_past_deals.map(p => p.name).join(', ')}

Guidelines:
- Max 150 words
- Reference their specific need, not generic
- Mention one relevant past project
- End with a specific calendar link or availability question
- Professional but warm tone`
    }]
  });
  
  return { subject: extractSubject(response), body: response.content[0].text };
}

// slot-finder.ts  
export async function findAvailableSlots(
  calendarTools: CalendarTools,
  count: number = 3
): Promise<TimeSlot[]> {
  const availability = await calendarTools.getCalendarAvailability({
    days_ahead: 7,
    duration_minutes: 30,
  });
  return availability.free_slots.slice(0, count);
}
```

#### Wire to orchestrator

Add to `worker.ts`:
```typescript
case AgentType.OUTREACH:
  const outreachAgent = new OutreachAgent(mcpClient);
  result = await outreachAgent.process({ dealId: job.data.dealId, orgId: job.data.orgId });
  break;
```

Add to `jobs.ts`:
```typescript
export type OutreachJob = { name: 'RunOutreach'; data: { dealId: string; orgId: string } };
```

---

### Track 2: Chase Agent — New Package (1.5 days)

**Can run in parallel with Track 1.**

**New package:** `packages/agents/chase/`

#### What it does

Runs on a **daily cron schedule**. Scans all active deals for:
1. Stalled deals (no activity in N days after `proposal-sent`)
2. Deals awaiting follow-up
3. Email replies that advanced the deal

Drafts follow-up emails, queues them for approval, and advances or closes deals accordingly.

#### Package structure

```
packages/agents/chase/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts           # ChaseAgent class + cron setup
    ├── stall-detector.ts  # Scans for deals with no recent activity
    ├── followup-drafter.ts# Claude drafts follow-up email
    ├── reply-detector.ts  # Checks Gmail for replies to our sent emails
    ├── digest-builder.ts  # Builds DealDigest report
    └── stage-advancer.ts  # Updates deal stages based on signals
```

#### Core implementation

```typescript
// stall-detector.ts
export async function detectStalledDeals(
  deals: Deal[],
  stallThresholdDays: number = 5
): Promise<StalledDeal[]> {
  const now = Date.now();
  return deals
    .filter(d => ACTIVE_STAGES.includes(d.stage))
    .filter(d => {
      const daysSinceUpdate = (now - new Date(d.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceUpdate >= stallThresholdDays;
    })
    .map(d => ({ ...d, daysSinceActivity: Math.floor((now - new Date(d.updatedAt).getTime()) / 86400000) }));
}

// followup-drafter.ts
export async function draftFollowUp(
  deal: Deal, 
  previousEmail: EmailRecord,
  followUpNumber: 1 | 2 | 3
): Promise<EmailDraft> {
  const tones = { 1: 'gentle check-in', 2: 'adding value/insight', 3: 'closing the loop' };
  
  const response = await claude.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    messages: [{
      role: 'user',
      content: `Draft follow-up #${followUpNumber} for ${deal.leadCompany}.
Tone: ${tones[followUpNumber]}
Days since proposal: ${deal.daysSinceProposal}
Previous email subject: ${previousEmail.subject}
Keep under 100 words. Don't be pushy.`
    }]
  });
  
  return { subject: `Re: ${previousEmail.subject}`, body: response.content[0].text };
}

// index.ts — cron setup
import { CronJob } from 'cron';

export function startChaseAgent() {
  // Run every day at 8am
  new CronJob('0 8 * * *', async () => {
    const chase = new ChaseAgent();
    await chase.runDailySweep();
  }, null, true, 'America/New_York');
}
```

---

### Track 3: DB Migrations + UI (1 day)

**Can run in parallel with Track 1 and Track 2.**

#### Task B1: Add missing stage values to DB

File: `packages/db/src/schema/deals.ts`

```typescript
export const dealStageEnum = pgEnum('deal_stage', [
  'new-lead', 'qualified', 'declined',
  'outreach-sent',    // NEW
  'meeting-booked',   // NEW
  'scoping',
  'proposal-pending',
  'proposal-sent',
  'follow-up-1',      // NEW
  'follow-up-2',      // NEW
  'negotiating',      // NEW
  'proposal-revised', // NEW
  'closed-won', 'closed-lost', 'stalled', 'failed',
]);
```

Generate and apply migration:
```bash
pnpm db:generate
pnpm db:migrate
```

#### Task B2: Add stage columns to Kanban UI

File: `packages/web/components/kanban/KanbanBoard.tsx`

Add to `STAGES` array:
```typescript
const STAGES = [
  { id: 'new-lead', label: 'New Lead' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'outreach-sent', label: 'Outreach Sent' },     // NEW
  { id: 'meeting-booked', label: 'Meeting Booked' },   // NEW
  { id: 'scoping', label: 'Scoping' },
  { id: 'proposal-sent', label: 'Proposal Sent' },
  { id: 'follow-up-1', label: 'Follow-up 1' },         // NEW
  { id: 'follow-up-2', label: 'Follow-up 2' },         // NEW
  { id: 'negotiating', label: 'Negotiating' },         // NEW
  { id: 'closed-won', label: 'Closed Won' },
  { id: 'closed-lost', label: 'Closed Lost' },
  { id: 'stalled', label: 'Stalled' },
];
```

---

### Track 4: pgvector Past Project Similarity (1 day)

**Can run in parallel with Track 1, 2, 3.**

This improves Proposal pricing by finding similar past projects.

#### Task B3: Embed past projects on write

File: `packages/db/src/queries/past-projects.ts` — add embedding on insert:

```typescript
import Anthropic from '@anthropic-ai/sdk';

export async function insertPastProjectWithEmbedding(project: NewPastProject) {
  const client = new Anthropic();
  const embeddingResponse = await client.embeddings.create({
    model: 'voyage-2',
    input: `${project.name} ${project.industry} ${project.tech_stack.join(' ')} ${project.outcome}`,
  });
  
  await db.insert(pastProjects).values({
    ...project,
    embedding: embeddingResponse.embeddings[0],
  });
}
```

#### Task B4: Similarity search for Proposal agent

File: `packages/db/src/queries/similarity.ts`:

```typescript
export async function findSimilarProjects(
  requirements: string,
  techStack: string[],
  limit = 5
): Promise<ProjectRef[]> {
  const client = new Anthropic();
  const queryEmbedding = await client.embeddings.create({
    model: 'voyage-2',
    input: `${requirements} ${techStack.join(' ')}`,
  });
  
  return db.execute(sql`
    SELECT *, 1 - (embedding <=> ${JSON.stringify(queryEmbedding.embeddings[0])}::vector) AS similarity
    FROM past_projects
    ORDER BY embedding <=> ${JSON.stringify(queryEmbedding.embeddings[0])}::vector
    LIMIT ${limit}
  `);
}
```

Use in `pricing-strategy.ts` to replace hardcoded rates with data-driven reference prices.

---

### Phase B Acceptance Criteria

- [ ] Outreach agent processes a qualified deal and produces an email draft + calendar slots
- [ ] Chase agent's daily cron runs without error and identifies stalled deals
- [ ] New stages appear in Kanban UI
- [ ] DB migration applies cleanly
- [ ] Proposal agent uses similar past project prices (not hardcoded $15k)

---

## 6. Phase C — "Make It Smart" (Days 6–10)

**Goal:** Intelligence layer — data-driven decisions, multi-tenant support, pre-call automation.

### C1: Analytics — Real Velocity Data (1 day)

File: `packages/api/src/routes/analytics.ts` — replace stub data with real queries:

```typescript
router.get('/velocity', async (c) => {
  const stageTransitions = await db.execute(sql`
    SELECT 
      from_stage,
      to_stage,
      AVG(EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (PARTITION BY deal_id ORDER BY created_at)))/86400) as avg_days,
      COUNT(*) as transition_count
    FROM deal_events
    WHERE event_type = 'stage_transition'
    GROUP BY from_stage, to_stage
  `);
  return c.json(stageTransitions);
});
```

Wire `VelocityChart` component to real endpoint.

### C2: RBAC Enforcement (1 day)

Files: `packages/api/src/middleware/auth.ts`, `packages/web/middleware.ts`

- Enforce `org_id` scoping on all DB queries (currently all queries return all orgs' data)
- Add role check middleware: `requireRole('owner')` for destructive actions
- UI access control: hide admin sections for non-owner roles

### C3: Prep Agent — Pre-Call Dossier (1 day)

**New package:** `packages/agents/prep/`

Triggered by a scheduled job 30 minutes before `meeting_datetime` (stored in `MeetingRecord`).

```typescript
// Scheduled check: every 5 minutes, look for upcoming meetings
async function checkUpcomingMeetings() {
  const thirtyMinsFromNow = new Date(Date.now() + 30 * 60 * 1000);
  const fiveMinsFromNow = new Date(Date.now() + 5 * 60 * 1000);
  
  const upcomingDeals = await db.query.deals.findMany({
    where: and(
      eq(deals.stage, 'meeting-booked'),
      between(deals.meetingDatetime, fiveMinsFromNow, thirtyMinsFromNow),
      isNull(deals.prepSentAt)
    )
  });
  
  for (const deal of upcomingDeals) {
    await prepAgent.process({ dealId: deal.id, orgId: deal.orgId });
  }
}
```

Prep generates:
- Company recent news (Claude web search)
- Current tech stack observations
- 3–5 tailored talking points
- Similar past projects reference
- Emails dossier to org owner

### C4: ICP Model v2 — Learning from Outcomes (2 days)

When a deal reaches `closed-won` or `closed-lost`, trigger a feedback job:

```typescript
// packages/agents/orchestrator/src/jobs.ts
export type FeedbackJob = { 
  name: 'RunICPFeedback'; 
  data: { dealId: string; outcome: 'won' | 'lost'; icpScore: number } 
};
```

Store outcome → ICP score pairs in a new `icp_outcomes` table. After 20+ outcomes, compute weight adjustments using simple regression. Update org's `ICPConfig.weights` to reflect which signals actually predicted wins.

---

## 7. Parallelization Map

```
DAY 1:
├── Track 1: Fix worker imports + start worker process (A1, A2)
├── Track 2: Implement Scoping agent from scratch (A3)
└── Track 3: Fix Enrichment company/prospect researcher (A4, A5)

DAY 2:
├── Track 1: Add ICP scoring module to Enrichment (A6)
├── Track 2: Rewrite Proposal content-generator + pricing (A7, A8)
└── Track 3: Wire real Google Docs in Proposal (A9) + set credentials

DAY 3:
├── Track 1: Build Outreach agent skeleton + email drafter (B1)
└── Track 2: Build Chase agent skeleton + stall detector (B2)

DAY 4:
├── Track 1: Complete Outreach: slot-finder + booker + wire to worker
├── Track 2: Complete Chase: follow-up drafter + daily cron + wire to worker
└── Track 3: DB migration (new stages) + Kanban UI additions (B3, B4)

DAY 5:
├── Track 1: pgvector past-project similarity for Proposal (B5, B6)
├── Track 2: End-to-end testing of full pipeline
└── Track 3: Dogfood — run first real lead end-to-end

DAYS 6–10:
├── Analytics + VelocityChart (C1)        [parallel]
├── RBAC enforcement (C2)                 [parallel]
├── Prep agent (C3)                       [parallel]
└── ICP model v2 feedback loop (C4)       [starts after enough deals]
```

---

## 8. What Success Looks Like

### Phase A Done When:
- New inbound email → deal created → enriched with real company data → scoped (requirements extracted) → proposal generated with real Claude content → proposal-sent — **all automatically**, without manual intervention, in under 10 minutes
- ICP score (0–100) appears on every deal card

### Phase B Done When:
- Qualified deal → personalized outreach email drafted and queued for approval → after approval, sent and calendar booked → all stages visible in Kanban → stalled deals automatically flagged and follow-ups drafted within 24 hours

### Phase C Done When:
- Multi-user orgs can sign in with separate accounts and see only their deals
- VelocityChart shows real avg days per stage
- Pre-call dossier emails arrive 30 min before meetings
- After 20+ deals, ICP weights auto-adjust based on what actually converted

---

## 9. Files Summary — Complete Change List

### Create New
```
packages/agents/scoping/src/index.ts              (implement from scratch)
packages/agents/scoping/src/scoping-agent.test.ts
packages/agents/enrichment/src/icp-scorer.ts
packages/agents/outreach/package.json             (new package)
packages/agents/outreach/src/index.ts
packages/agents/outreach/src/email-drafter.ts
packages/agents/outreach/src/slot-finder.ts
packages/agents/outreach/src/booker.ts
packages/agents/chase/package.json               (new package)
packages/agents/chase/src/index.ts
packages/agents/chase/src/stall-detector.ts
packages/agents/chase/src/followup-drafter.ts
packages/agents/chase/src/digest-builder.ts
packages/agents/prep/package.json                (new package, Phase C)
packages/agents/prep/src/index.ts
packages/db/drizzle/XXXX_add_lifecycle_stages.sql
```

### Modify
```
packages/agents/enrichment/src/company-researcher.ts   (rewrite with Claude)
packages/agents/enrichment/src/prospect-researcher.ts  (rewrite with Claude)
packages/agents/enrichment/src/index.ts                (add ICP scoring call)
packages/agents/proposal/src/content-generator.ts      (rewrite with Claude)
packages/agents/proposal/src/pricing-strategy.ts       (rewrite with requirements logic)
packages/agents/proposal/src/index.ts                  (wire real Drive MCP tool)
packages/agents/orchestrator/src/worker.ts             (fix imports, add Outreach/Chase)
packages/agents/orchestrator/src/jobs.ts               (add Outreach/Chase job types)
packages/agents/ingestion/src/index.ts                 (enqueue RunEnrichment after deal create)
packages/db/src/schema/deals.ts                        (add 6 stage enum values)
packages/web/components/kanban/KanbanBoard.tsx          (add missing stage columns)
docker-compose.yml                                      (add worker service)
.env                                                   (real credentials)
```

### Delete
```
packages/agents/enrichment/src/data-sources.ts         (replace with direct Claude calls)
```
