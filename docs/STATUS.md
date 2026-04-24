# Closepilot — Project Status

> **Last updated:** 2026-04-22  
> **Production spec:** [`docs/PRODUCTION-SPEC.md`](./PRODUCTION-SPEC.md)  
> **Interactive map:** `open /tmp/closepilot-map.html`

---

## TL;DR

The infrastructure is solid (DB, API, UI, Docker, CI/CD, BullMQ worker). The problem is in the agent brains: `scoping/src/index.ts` is an **empty file**, `content-generator.ts` returns **hardcoded boilerplate strings**, `pricing-strategy.ts` uses a **hardcoded lookup table** ($15k for Web Dev), and the enrichment sub-modules make **zero API calls**. The BullMQ `worker.ts` exists and is well-structured but has broken import paths and has never been started. See `docs/PRODUCTION-SPEC.md` for the full execution plan.

---

## Phase Completion Overview

| Phase | Description | Status | Notes |
|-------|-------------|--------|-------|
| **Phase 0** | Foundation — monorepo, schema, MCP server, API, web shell | ✅ Complete | All 11 packages build cleanly |
| **Phase 1** | Core agents — Ingestion, Enrichment, Scoping, Proposal, CRM Sync | ⚠️ ~40% Real | 2 fake, 2 partial, 1 real, worker never started |
| **Phase 2** | Infrastructure — OTel, rate limiting, Fly.io, CI/CD, E2E tests | ✅ Complete | PRs #28–#33 merged |
| **Phase 3** | Intelligence — vector search, analytics, RBAC, distributed workers | 🔲 Not Started | Schema ready, logic not implemented |
| **Phase 4** | Missing agents — Scheduler, Prep, Chase, full 14-stage lifecycle | 🔲 Not Started | Zero code written |
| **Phase 5** | Behavioral moat — ICP training, deal outcome feedback, pricing ML | 🔲 Future | Depends on Phase 4 data |

---

## Agent Status

### What the Spec Planned (6 Agents)

| Agent | Purpose | Stages Covered |
|-------|---------|----------------|
| **Scout** | Classify email, ICP score, research company, qualify/decline | new-lead → qualified/declined |
| **Scheduler** | Draft outreach, check calendar, book meeting, confirm | qualified → outreach-sent → meeting-booked |
| **Prep** | Pre-call dossier (news, talking points, past projects) | meeting-booked (background, no stage change) |
| **Scribe** | Call transcript → requirements + close probability | meeting-booked → proposal-pending |
| **Proposal** | Claude section generation, pricing engine, Google Docs | proposal-pending → proposal-sent |
| **Chase** | Daily sweep, stall detection, follow-up emails, deal digest | proposal-sent → closed-* |

### What Was Actually Built

| Spec Agent | Built As | Implementation Status | Real AI? |
|------------|----------|-----------------------|----------|
| Scout (email/classify) | **Ingestion** | ✅ Real | Claude 3.5 Sonnet — Gmail polling, classification, lead extraction |
| Scout (research) | **Enrichment** | ❌ Fake | Hardcoded mock data — must be replaced with real company research |
| Scheduler | — | ❌ Not Built | Zero code. All Gmail/Calendar MCP tools defined but not wired |
| Prep | — | ❌ Not Built | Zero code |
| Scribe | **Scoping** | ⚠️ Partial | Real Claude, but several functions are stubs. Processes emails (not transcripts) |
| Proposal | **Proposal** | ❌ Fake | String templates only — no Claude generation, no Google Docs assembly |
| Chase | — | ❌ Not Built | Zero code |
| *(not in spec)* | **CRM Sync** | ✅ Real | Full HubSpot, Salesforce, Pipedrive adapters |

**Critical blocker:** The **BullMQ orchestrator worker** is defined but has never been started. No deal has ever moved automatically through the pipeline.

---

## Stage Coverage

The spec defines 14 deal stages. The codebase has 7 (with different names in some cases).

| Spec Stage | In Codebase? | Notes |
|------------|-------------|-------|
| `new-lead` | ✅ Built | In DB enum |
| `qualified` | ✅ Built | In DB enum |
| `declined` | ❌ Missing | No qualify/decline logic implemented |
| `outreach-sent` | ❌ Missing | Scheduler not built |
| `meeting-booked` | ❌ Missing | Scheduler not built |
| `proposal-pending` | ❌ Missing | Built as `scoping` instead |
| `proposal-sent` | ✅ Built | In DB enum |
| `follow-up-1` | ❌ Missing | Chase not built |
| `follow-up-2` | ❌ Missing | Chase not built |
| `negotiating` | ❌ Missing | Chase not built |
| `proposal-revised` | ❌ Missing | Chase not built |
| `closed-won` | ⚠️ Schema only | In DB, no auto-trigger logic |
| `closed-lost` | ⚠️ Schema only | In DB, no auto-trigger logic |
| `stalled` | ⚠️ Schema only | In DB, no detection logic |

---

## Feature Inventory

### ✅ Built and Working

- PostgreSQL schema (all tables: deals, artifacts, events, approvals, orgs, users, past-projects)
- MCP server with 50+ tools (Deal Store, Gmail, Calendar, Drive)
- Hono REST API (deals, activities, approvals, analytics endpoints)
- Next.js 15 dashboard (Kanban, deal detail, approvals, activity feed, Framer Motion)
- Google OAuth with JWT and automatic token refresh
- SSE real-time activity stream
- Docker Compose for local dev (Postgres + Redis)
- Fly.io deployment configs (api, web, worker services)
- GitHub Actions CI/CD pipeline
- OpenTelemetry tracing + Prometheus metrics
- Rate limiting, security headers, Zod env validation
- Drizzle migrations (schema stable)
- E2E pipeline tests
- CRM Sync (HubSpot, Salesforce, Pipedrive adapters)
- Gmail polling + AI lead classification (Ingestion)

### ⚠️ Defined but Not Functional

- **BullMQ orchestrator worker** — code exists, never started, no automatic deal processing
- **Enrichment agent** — returns hardcoded mock company data, not real research
- **Proposal agent** — string templates, no Claude generation, no Google Docs
- **Scoping agent** — real Claude but several functions are incomplete stubs
- **pgvector semantic search** — schema and extension ready, embedding generation not wired
- **RBAC / multi-tenancy** — organizations + role columns exist, middleware not enforced
- **VelocityChart** — UI component exists, needs real stage-transition data

### ❌ Not Built

- ICP scoring (0–100) — types and config interfaces exist, no calculation
- Qualify/decline logic — no Scout recommendation acted upon
- Scheduler agent (outreach email, calendar booking)
- Prep agent (pre-call dossier)
- Chase agent (follow-up, stall detection, daily digest)
- Call transcript input for Scribe/Scoping
- Google Docs proposal assembly
- Pricing engine (phase-based pricing from similar past projects)
- Stages: declined, outreach-sent, meeting-booked, follow-up-1/2, negotiating, proposal-revised
- Production run (zero real deals processed end-to-end)

---

## Spec Divergences

The original `CLOSEPILOT-TECHNICAL-SPEC.md` (v1.0, 2026-04-15) and what was actually built diverge in several key ways:

### Agent Naming Mismatch

| Original Spec | Built As | Coverage |
|---------------|----------|---------|
| Scout | Ingestion + Enrichment | Email classify only; research is fake |
| Scribe | Scoping | Email-based, not transcript-based; partial |
| *(not in spec)* | CRM Sync | Added during build — useful addition |
| Scheduler | *(missing)* | Not started |
| Prep | *(missing)* | Not started |
| Chase | *(missing)* | Not started |

### Pipeline Coverage Gap

The original vision covered the **entire B2B sales cycle**:  
`email → qualify → outreach → meeting → prep → call → scope → proposal → follow-up → close`

What's built covers only:  
`email → qualify → scope (from email) → proposal (fake) → CRM sync`

The meeting booking loop (Scheduler), pre-call intelligence (Prep), and post-proposal follow-up (Chase) are entirely absent.

### Stage Count

- **Spec:** 14 stages
- **Built:** 7 stages (with different names — `scoping` instead of `proposal-pending`, no meeting or follow-up stages)

---

## P0 Unblocking Checklist

These are the minimum steps to make the pipeline actually run end-to-end:

- [ ] **Start BullMQ worker** — `pnpm --filter orchestrator dev` or configure as a service
- [ ] **Fix Enrichment** — replace mock data with real Claude + web search calls to research company
- [ ] **Fix Proposal** — wire Claude for section generation; assemble via Google Drive MCP tools
- [ ] **Complete Scoping stubs** — fill in the incomplete function bodies
- [ ] **Set real `ANTHROPIC_API_KEY`** — currently a placeholder in `.env`
- [ ] **Set up Gmail OAuth tokens** — `GOOGLE_ACCESS_TOKEN` and `GOOGLE_REFRESH_TOKEN` empty
- [ ] **Run first real lead** — dogfood the pipeline with a real email

---

## What's Next

See `/docs/PHASE-3-TECHNICAL-SPEC.md` for Phase 3 details.  
See the interactive product map: `open /tmp/closepilot-map.html`

**Recommended priority order:**
1. Phase 1 P0 fixes (worker + Enrichment + Proposal + credentials)
2. Phase 3 vector search (unlock past-project similarity for Proposal)
3. Phase 4 Scheduler (completes the inbound → meeting booking loop)
4. Phase 4 Chase (completes the post-proposal follow-up loop)
5. Phase 5 ICP model training (requires Phase 4 data volume)
