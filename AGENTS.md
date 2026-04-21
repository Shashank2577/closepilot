# AGENTS.md - Closepilot Project Context

## What This Project Does
Closepilot is an autonomous B2B deal flow engine. It watches inbound email, identifies leads,
enriches the account, scopes the work, generates a proposal, waits for human approval, and then
syncs the deal to a CRM.

## Monorepo Structure
- `packages/core` - shared domain types and enums
- `packages/db` - Drizzle ORM schema and query helpers for PostgreSQL
- `packages/mcp-server` - MCP stdio server that exposes deal, Gmail, Calendar, and Drive tools
- `packages/mcp-client` - client helpers that agents use to talk to the MCP server
- `packages/api` - Hono REST API for deals, activities, and approvals
- `packages/web` - Next.js 15 dashboard and operator UI
- `packages/agents/ingestion` - inbox polling and lead classification
- `packages/agents/enrichment` - company and prospect research
- `packages/agents/scoping` - requirement extraction and complexity analysis
- `packages/agents/proposal` - proposal generation and document creation
- `packages/agents/crm-sync` - CRM integration for HubSpot, Salesforce, and Pipedrive
- `packages/agents/orchestrator` - pipeline coordination and approval gating

## Tech Stack
| Area | Stack |
| --- | --- |
| Language | TypeScript 5.3+, ESM-style imports with `.js` extensions |
| Runtime | Node.js 20 |
| Package Manager | pnpm 8 workspaces |
| Database | PostgreSQL 16 with Drizzle ORM |
| API | Hono |
| Web | Next.js 15, React |
| Testing | Vitest |
| MCP | Model Context Protocol stdio server |
| AI | Anthropic Claude |
| Integrations | Google Gmail, Calendar, Drive; HubSpot; Salesforce; Pipedrive |

## Build, Test, and Lint
- `pnpm install` - install dependencies
- `pnpm build` - build all packages in dependency order
- `pnpm test` - run the Vitest suites
- `pnpm typecheck` - run TypeScript checks across the workspace
- `pnpm lint` - run lint commands across packages
- `pnpm db:push` - apply schema changes in development
- `pnpm db:studio` - open Drizzle Studio

## Code Conventions
- Keep source files in `src/` and compiled output in `dist/`
- Always use `.js` extensions in TypeScript imports
- Do not add barrel files
- Keep shared types in `@closepilot/core`
- Agents should not import `@closepilot/db` directly; they should go through MCP tools

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `API_PORT` - API service port (default 3001)
- `MCP_PORT` - MCP server port (default 3000)
- `LOG_LEVEL` - `debug`, `info`, `warn`, `error`
- `NODE_ENV` - `development`, `test`, `production`
- `ANTHROPIC_API_KEY` - Claude API key
- `OTEL_ENABLED` - Enable OpenTelemetry tracing (true/false)
- `OTEL_EXPORTER_OTLP_ENDPOINT` - OTLP exporter endpoint
- `METRICS_BEARER_TOKEN` - Token to protect /metrics endpoint
- `RATE_LIMIT_RPM` - Requests per minute per IP (default 120)
- `RATE_LIMIT_BURST` - Max burst requests per IP (default 30)
- `CORS_ORIGINS` - Comma-separated list of allowed CORS origins
- `REQUEST_BODY_LIMIT_KB` - Max request body size in KB (default 256)
- `SHUTDOWN_TIMEOUT_MS` - Graceful shutdown timeout (default 10000)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Google OAuth

## Important Notes
- The MCP server uses stdio transport, not HTTP, for tool calls
- The MCP server also exposes a small `/health` HTTP endpoint for container checks
- Use `pnpm db:push` in development, not `drizzle-kit migrate`
- Vitest is the only test runner in this repo
- Prefer direct source imports over re-exports
