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

> **Phase 1 complete — full build passing across all 11 packages**

| Area | Status | Notes |
|------|--------|-------|
| Core type system | ✅ Complete | Full deal lifecycle types |
| PostgreSQL schema | ✅ Complete | Deals, activities, approvals, projects, documents |
| MCP server | ✅ Complete | 50+ tools across Deal Store, Gmail, Calendar, Drive |
| MCP client | ✅ Complete | Agent-side wrappers for all tools |
| REST API | ✅ Complete | Deals, activities, approvals endpoints |
| Next.js web UI | ✅ Complete | Dashboard, kanban, approvals, activity stream |
| OAuth / auth | ✅ Complete | Google OAuth with token refresh |
| Activity streaming | ✅ Complete | Server-Sent Events real-time feed |
| Ingestion agent | ✅ Complete | Gmail polling, AI classification, lead extraction |
| Enrichment agent | ✅ Complete | Company & prospect research via Claude |
| Scoping agent | ✅ Complete | Requirement extraction, complexity analysis |
| Proposal agent | ✅ Complete | AI proposal generation with Drive integration |
| CRM Sync agent | ✅ Complete | HubSpot, Salesforce, Pipedrive adapters |
| Orchestrator agent | ✅ Complete | Pipeline coordination with approval gates |
| Docker / deploy | 🔲 Pending | Container setup not yet configured |
| E2E tests | 🔲 Pending | Integration test suite not yet written |
| Production dogfood | 🔲 Pending | First real lead not yet run through pipeline |

---

## Architecture

```
Gmail Inbox
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│                    Agent Pipeline                        │
│                                                         │
│  Ingestion → Enrichment → Scoping → Proposal → CRM Sync │
│       ↑            ↑          ↑          ↑         ↑    │
│       └────────────┴──────────┴──────────┴─────────┘    │
│                   Orchestrator (approvals)               │
└─────────────────────────────────────────────────────────┘
    │                           │
    ▼                           ▼
MCP Server                  REST API
(tools)                  (deal data)
    │                           │
    └───────────┬───────────────┘
                ▼
         PostgreSQL DB
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

The immediate next steps to reach a production-ready system:

1. **Docker Compose setup** — containerise all services (api, mcp-server, web, postgres) for one-command startup
2. **E2E integration tests** — run a synthetic lead end-to-end through the entire agent pipeline
3. **Agent YAML configs** — Claude Code agent and routine configuration files for managed execution
4. **Production dogfood** — run the first real lead through the pipeline on a live Gmail account
5. **Monitoring** — structured logging, error alerting, deal pipeline metrics dashboard

---

## License

MIT
