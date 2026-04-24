# Closepilot

**Autonomous B2B Deal Flow Engine for Service Businesses**

Closepilot is an AI-powered system that automates the entire B2B sales pipeline — from the moment a lead email arrives to the point a signed proposal reaches your CRM. A chain of specialized Claude AI agents handles classification, research, scoping, proposal generation, and CRM sync, with a human-in-the-loop approval layer throughout.

---

## Vision

Most service businesses lose deals not because they can't close, but because the operational overhead of qualifying leads, scoping projects, and writing proposals is too slow and too manual. Closepilot removes that bottleneck:

- A new lead emails → within minutes a deal is created, the prospect is researched, requirements are extracted, a proposal is drafted, and your CRM is updated
- You review and approve at each major checkpoint — nothing ships without your sign-off
- Everything is audited in a real-time activity stream

**End goal:** A service business owner should spend zero manual effort between "lead email received" and "proposal sent" for any standard engagement.

---

## Current Status

> **Phases 0 & 2 complete. Phase 1 (~40% real). Phases 3–5 not started.**  
> See [`docs/STATUS.md`](./docs/STATUS.md) for a full spec-vs-built breakdown.

| Area | Status | Notes |
|------|--------|-------|
| Core type system | ✅ Complete | Full 14-stage lifecycle types, ICP, artifacts |
| PostgreSQL schema | ✅ Complete | Deals, artifacts, events, approvals, orgs, users |
| MCP server | ✅ Complete | 50+ tools — Deal Store, Gmail, Calendar, Drive |
| REST API | ✅ Complete | Deals, activities, approvals, analytics endpoints |
| Next.js web UI | ✅ Complete | Dashboard, Kanban, approvals, activity feed |
| Google OAuth + JWT | ✅ Complete | Full auth flow with token refresh |
| SSE activity stream | ✅ Complete | Real-time deal activity events |
| Docker + Fly.io deploy | ✅ Complete | Local dev + production deployment configs |
| OTel + Prometheus | ✅ Complete | Tracing, metrics, request ID propagation |
| GitHub Actions CI/CD | ✅ Complete | Test + lint + build + deploy pipeline |
| CRM Sync agent | ✅ Real | HubSpot, Salesforce, Pipedrive adapters working |
| Ingestion agent | ✅ Real | Gmail polling, Claude classification, lead extraction |
| Scoping agent | ⚠️ Partial | Real Claude, but several functions are stubs |
| Enrichment agent | ❌ Fake | Returns hardcoded mock data — not real research |
| Proposal agent | ❌ Fake | String templates only — no Claude, no Google Docs |
| Orchestrator worker | ❌ Not started | BullMQ worker defined but never started |
| Scheduler agent | ❌ Not built | Outreach email + calendar booking — missing entirely |
| Prep agent | ❌ Not built | Pre-call dossier — missing entirely |
| Chase agent | ❌ Not built | Follow-up + stall detection — missing entirely |
| ICP scoring | ❌ Not built | Types defined, no scoring logic |
| Production dogfood | ❌ Pending | Zero real deals run end-to-end |

---

## Architecture

### Complete Vision (6 Agents × 14 Stages)

```
Gmail Inbox
    │
    ▼
┌────────────────────────────────────────────────────────────────────┐
│                         Agent Pipeline                              │
│                                                                    │
│  Scout ──→ Scheduler ──→ Prep ──→ Scribe ──→ Proposal ──→ Chase   │
│  (email     (book         (call     (scope    (generate   (follow  │
│   qualify)   meeting)     dossier)  reqs)      doc)        up)     │
│                                                                    │
│  Built:  Ingestion ✅  Enrichment ❌  Scoping ⚠️  Proposal ❌       │
│  Missing: Scheduler ❌  Prep ❌  Chase ❌                           │
│                                                                    │
│                    Orchestrator (approvals + BullMQ)               │
└────────────────────────────────────────────────────────────────────┘
         │                                    │
         ▼                                    ▼
    MCP Server                           REST API
    (50+ tools)                        (deal data)
         │                                    │
         └────────────────┬───────────────────┘
                          ▼
                   PostgreSQL + pgvector
                          │
                          ▼
                   Next.js Web UI
              (dashboard · approvals · activity)
```

All agents communicate exclusively through the **MCP server** — they never import from `@closepilot/db` directly. This keeps agents stateless and swappable.

---

## Packages

| Package | Description | README |
|---------|-------------|--------|
| [`@closepilot/core`](./packages/core/README.md) | Shared TypeScript types for the entire deal lifecycle | [→](./packages/core/README.md) |
| [`@closepilot/db`](./packages/db/README.md) | PostgreSQL schema and Drizzle ORM queries | [→](./packages/db/README.md) |
| [`@closepilot/mcp-server`](./packages/mcp-server/README.md) | MCP server exposing 50+ tools to agents | [→](./packages/mcp-server/README.md) |
| [`@closepilot/mcp-client`](./packages/mcp-client/README.md) | MCP client wrappers used by agents | [→](./packages/mcp-client/README.md) |
| [`@closepilot/api`](./packages/api/README.md) | Hono REST API for the web UI | [→](./packages/api/README.md) |
| [`@closepilot/web`](./packages/web/README.md) | Next.js 15 dashboard | [→](./packages/web/README.md) |
| [`agents/ingestion`](./packages/agents/ingestion/README.md) | Gmail polling + AI lead classification | [→](./packages/agents/ingestion/README.md) |
| [`agents/enrichment`](./packages/agents/enrichment/README.md) | Company and prospect research | [→](./packages/agents/enrichment/README.md) |
| [`agents/scoping`](./packages/agents/scoping/README.md) | Requirement extraction and scoping | [→](./packages/agents/scoping/README.md) |
| [`agents/proposal`](./packages/agents/proposal/README.md) | AI proposal generation | [→](./packages/agents/proposal/README.md) |
| [`agents/crm-sync`](./packages/agents/crm-sync/README.md) | CRM integration (HubSpot, Salesforce, Pipedrive) | [→](./packages/agents/crm-sync/README.md) |
| [`agents/orchestrator`](./packages/agents/orchestrator/README.md) | Pipeline coordination and approval gates | [→](./packages/agents/orchestrator/README.md) |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20+ |
| Language | TypeScript 5.3+ |
| Package manager | pnpm 8+ (workspaces) |
| Database | PostgreSQL + Drizzle ORM |
| API server | Hono 3 |
| Web UI | Next.js 15, React 18, TanStack Query |
| AI / agents | Anthropic Claude API (claude-3-5-sonnet) |
| Agent protocol | Model Context Protocol (MCP) |
| Google services | Gmail, Calendar, Drive (googleapis) |
| CRM integrations | HubSpot API, jsforce (Salesforce), Pipedrive |
| Drag & drop | @dnd-kit |
| Testing | Vitest |

---

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+
- PostgreSQL (or Docker)

### Setup

```bash
git clone <repository-url>
cd closepilot

# Install all dependencies
pnpm install

# Copy and fill in environment variables
cp .env.example .env

# Push database schema
pnpm db:push

# Build all packages
pnpm build
```

### Environment variables

```env
# Database
DATABASE_URL=postgresql://localhost:5432/closepilot

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3002/auth/callback

# Google Service Account (for Drive/Docs)
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# Auth
SESSION_SECRET=
```

### Run development servers

```bash
pnpm mcp:dev    # MCP server  → port 3000
pnpm api:dev    # REST API    → port 3001
pnpm web:dev    # Web UI      → port 3002
```

---

## Development commands

```bash
pnpm build          # Build all packages
pnpm test           # Run all tests
pnpm lint           # Lint all packages
pnpm typecheck      # Type-check all packages

pnpm db:studio      # Open Drizzle Studio (visual DB browser)
pnpm db:push        # Push schema to database
pnpm db:migrate     # Run migrations
```

---

## What's Next

See [`docs/STATUS.md`](./docs/STATUS.md) for the full breakdown. Recommended priority:

### P0 — Unblock the Pipeline (Phase 1 completion)
1. **Start BullMQ worker** — `pnpm --filter orchestrator dev` — currently defined but never started
2. **Fix Enrichment** — replace hardcoded mock data with real Claude + web search company research
3. **Fix Proposal** — wire Claude for section generation, Google Docs assembly via Drive MCP tools
4. **Complete Scoping stubs** — fill in incomplete function bodies, add close_probability scoring
5. **Set real credentials** — `ANTHROPIC_API_KEY`, `GOOGLE_ACCESS_TOKEN`, `GOOGLE_REFRESH_TOKEN`

### Phase 3 — Intelligence
6. **pgvector semantic search** — embed past projects, wire similarity search for Proposal pricing
7. **Analytics** — stage conversion rates, velocity metrics, win rate dashboard

### Phase 4 — Missing Agents
8. **Scheduler** — outreach email + Google Calendar booking (qualified → meeting-booked)
9. **Chase** — daily stall detection + follow-up automation (proposal-sent → closed-*)
10. **Prep** — pre-call dossier delivered 30 min before each meeting

---

## License

MIT
