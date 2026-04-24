# Closepilot Internal Developer Guide

> **Target Audience:** Internal Engineering Team, AI Agents (Jules/Claude)
> **Purpose:** A deep dive into the technical implementation, architectural patterns, and current gaps in the Closepilot platform.

## System Architecture: The Micro-Agent Pattern

Unlike traditional monolithic LLM applications that rely on massive, complex prompts, Closepilot uses a **Micro-Agent Architecture**.

1. **Isolation of Concerns:** Each agent (`ingestion`, `enrichment`, `scoping`, `proposal`) has a single, narrowly defined responsibility. 
2. **Asynchronous Orchestration:** Agents do not call each other directly. They emit events (e.g., `lead_created`) or update the state in PostgreSQL. The `orchestrator` (powered by BullMQ) listens to these state changes and dispatches jobs to the next agent in the sequence.
3. **Tool Access via MCP:** Agents interact with the outside world (Gmail, Drive, CRMs) exclusively through the internal MCP (Model Context Protocol) server. This centralizes authentication, logging, and security.

## The Deal State Machine

A Deal in Closepilot is a state machine. Its progression is tracked via the `stage` column in the `deals` table.

```
[ new-lead ] -> [ qualified ] -> [ scoping ] -> [ proposal-sent ] -> [ negotiating ] -> [ closed-* ]
```

### Current Implementation Status

- **`new-lead`**: Created by the Ingestion agent after parsing a Gmail message. (✅ Fully Implemented)
- **`qualified`**: Reached after the Enrichment agent gathers context. (⚠️ Agent is currently returning mock data).
- **`scoping`**: Reached after the Scoping agent extracts requirements from the email thread. (⚠️ Agent logic exists but contains incomplete function stubs).
- **`proposal-sent`**: Reached after the Proposal agent drafts the document and a human approves it in the UI. (⚠️ Agent uses string templates; human approval UI works; document generation via Google Drive MCP is not fully wired).

## Core Technologies

- **Monorepo:** `pnpm` workspaces.
- **Database:** PostgreSQL. Interacted with exclusively via `drizzle-orm`.
- **Backend API:** `Hono` running on Node.js (can be deployed to Edge/Serverless environments).
- **Frontend:** Next.js 15 App Router, Tailwind CSS, Framer Motion, Server-Sent Events (SSE) for real-time dashboard updates.
- **Workers:** BullMQ backed by Redis for durable, retryable background jobs.
- **AI/LLM:** Anthropic's Claude 3.5 Sonnet via the `@anthropic-ai/sdk`.

## Integrating with the MCP Server

The MCP server (`packages/mcp-server`) exposes tools. To add a new capability:
1. Define the tool schema using `zod` in the MCP server package.
2. Implement the tool handler (e.g., calling the Google Calendar API).
3. The LLM agents (in `packages/agents/*`) connect to the MCP server via the `mcp-client` package and use the tools natively.

## Current Technical Blockers (The "To-Do" List)

1. **The Orchestrator is Dormant:** The BullMQ worker process in `packages/agents/orchestrator/src/worker.ts` exists but is not being started in the local dev environment or production. **Fix:** Update `docker-compose.yml` or `Procfile` to run the orchestrator.
2. **Mocked AI Logic:** The `enrichment` and `proposal` agents are currently faking their AI interactions to allow UI development. **Fix:** Wire them up to the actual Anthropic API client implemented in `packages/core/src/llm.ts`.
3. **Missing Agents:** The `Scheduler` (for booking meetings) and `Chase` (for follow-ups) agents have not been built.

## Development Workflow

- `pnpm dev`: Starts the Next.js frontend, Hono API, and MCP server.
- `pnpm db:push`: Pushes schema changes to the local PostgreSQL instance.
- `pnpm test:e2e`: Runs the end-to-end playwright/jest tests verifying the pipeline flow.
