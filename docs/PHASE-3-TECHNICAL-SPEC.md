# Closepilot Phase 3: Intelligence & Scale - Technical Specification
**Version:** 1.0
**Target Audience:** Autonomous Coding Agents (Jules/ZOOS)
**Architecture Context:** TypeScript Monorepo (pnpm workspace), Hono API, Next.js 15 App Router, Drizzle ORM + PostgreSQL, MCP Server (stdio).

---

## 🏗️ Executive Summary & Agent Delegation Strategy
Phase 3 transforms Closepilot from a linear automation pipeline into an intelligent, scalable, and multi-tenant enterprise system. To execute this phase via autonomous agents without conflicts, the work is strictly partitioned into four isolated vertical tracks. 

**Delegation Rules for Agents:**
1. **Never modify another track's core schema or API routes.**
2. **Communicate across boundaries ONLY via defined TypeScript interfaces in `@closepilot/core`.**
3. **If a shared type must change, Agent 1 (Data & Infra) owns the PR; others must block/wait.**

---

## 🛤️ Track 1: Data Infrastructure & Semantic Memory (Agent 1)
**Objective:** Establish the foundation for Vector Search (RAG) and caching.

### 1.1 Database Upgrades (PostgreSQL + pgvector)
- **Action:** Upgrade the Docker setup to use `pgvector`.
- **Files:** `docker-compose.yml`, `docker-compose.dev.yml`
  - Change image from `postgres:16-alpine` to `pgvector/pgvector:pg16`.
- **Schema (`packages/db/src/schema/vectors.ts`):**
  - Create a new Drizzle schema file for vector storage.
  - Table: `deal_embeddings`
    - `id`: uuid (PK)
    - `dealId`: integer (FK to `deals.id`, cascade delete)
    - `embedding`: vector(1536) (OpenAI ada-002 size)
    - `contentType`: enum ('email_thread', 'proposal_chunk', 'research_summary')
    - `content`: text (the raw text that was embedded)
    - `createdAt`: timestamp
  - **Index:** Create an HNSW index on the `embedding` column for cosine distance (`vector_cosine_ops`).
- **Scripts:** Update `packages/db/package.json` to ensure `drizzle-kit` handles the `vector` type correctly (may require custom migration SQL for the `CREATE EXTENSION vector;` command).

### 1.2 Redis Implementation
- **Action:** Add Redis to the infrastructure for caching and rate limiting.
- **Files:** `docker-compose.yml`, `packages/core/src/env.ts`
  - Add `redis:7-alpine` service to Docker Compose.
  - Add `REDIS_URL` to `ApiEnv` validation schema in `@closepilot/core/src/env.ts`.
- **Module (`packages/db/src/redis.ts`):**
  - Initialize a singleton `ioredis` client.
  - Export utility functions: `getCache(key)`, `setCache(key, val, ttl)`.

### 1.3 Memory Access Tools (MCP)
- **Action:** Expose vector search to the agent pipeline.
- **Files:** `packages/mcp-server/src/tools/memory.ts`
  - **Tool:** `store_deal_context(dealId, content, contentType)` -> calls OpenAI embedding API, saves to `deal_embeddings`.
  - **Tool:** `search_deal_history(dealId, query, limit=3)` -> embeds query, performs cosine similarity search in `deal_embeddings`, returns top K results.
- **Dependencies:** Add `openai` SDK to `packages/mcp-server` for generating embeddings.

---

## 🛤️ Track 2: Advanced Analytics & Telemetry (Agent 2)
**Objective:** Provide actionable insights on deal velocity and conversion rates.

### 2.1 Velocity Metrics (Database Layer)
- **Action:** Calculate time-in-stage for deals.
- **Files:** `packages/db/src/queries/analytics.ts` (NEW)
  - Function: `getDealVelocity()`
  - Logic: Query the `activities` table (type: `status_changed`) to calculate the average time duration between stage transitions (e.g., `ingestion` -> `enrichment`).
  - Output Interface (in `@closepilot/core`): 
    ```typescript
    export interface StageVelocity { stage: DealStage; avgDurationMs: number; count: number; }
    ```

### 2.2 Analytics API Routes
- **Action:** Expose metrics to the frontend.
- **Files:** `packages/api/src/routes/analytics.ts` (NEW)
  - `GET /api/analytics/velocity`: Returns `StageVelocity[]`.
  - `GET /api/analytics/conversion`: Returns win/loss ratios based on deals in `completed` vs `failed` stages.
- **Integration:** Mount `analyticsRoutes` in `packages/api/src/index.ts`.

### 2.3 Dashboard UI Integration
- **Action:** Visualize the new metrics.
- **Files:** `packages/web/app/page.tsx`, `packages/web/components/dashboard/VelocityChart.tsx` (NEW)
  - Fetch data from `/api/analytics/velocity` using React Query.
  - Render a Bar Chart (using `recharts` or similar) showing average days spent in each pipeline stage.

---

## 🛤️ Track 3: Enterprise RBAC & Security (Agent 3)
**Objective:** Secure the platform for multi-user teams.

### 3.1 Role & Permission Schema
- **Action:** Define roles and organizations in the DB.
- **Files:** `packages/db/src/schema/users.ts` (NEW)
  - Table: `users` (id, email, name, role enum['ADMIN', 'MANAGER', 'REP'], orgId)
  - Table: `organizations` (id, name, settings JSONB)
  - *Note: Add `orgId` to existing `deals` table to isolate tenant data.*

### 3.2 Authorization Middleware
- **Action:** Enforce RBAC at the API boundary.
- **Files:** `packages/api/src/middleware/auth.ts` (NEW)
  - Implement a Hono middleware that:
    1. Reads session/JWT.
    2. Fetches user role from `db`.
    3. Attaches `user` object to Hono Context (`AppEnv.Variables.user`).
  - Create a wrapper: `requireRole(['ADMIN', 'MANAGER'])` to protect specific routes (e.g., deleting deals).

### 3.3 UI Access Control
- **Action:** Hide restricted UI elements.
- **Files:** `packages/web/lib/auth/roles.ts` (NEW), `packages/web/components/deals/DealCard.tsx`
  - Create a hook `useRBAC()` that checks the current user's role against required permissions.
  - Example: Only 'ADMIN' or 'MANAGER' can see the "Delete Deal" button or the "System Settings" page.

---

## 🛤️ Track 4: Asynchronous Orchestration (Agent 4)
**Objective:** Replace synchronous `stdio` agent execution with scalable background queues.

### 4.1 Queue Infrastructure (BullMQ)
- **Action:** Setup BullMQ to handle agent jobs.
- **Files:** `packages/agents/orchestrator/src/queue.ts` (NEW)
  - Initialize BullMQ `Queue` and `Worker` using the Redis connection from Track 1.
  - Define Job Types: `RunIngestion`, `RunEnrichment`, `RunProposal`.

### 4.2 Decoupling the Orchestrator
- **Action:** Refactor the Orchestrator to publish jobs instead of spawning processes directly.
- **Files:** `packages/agents/orchestrator/src/index.ts`
  - When a deal changes stage (e.g., to `enrichment`), the Orchestrator adds a job to the `agent-tasks` queue instead of calling `spawn()`.

### 4.3 Agent Workers
- **Action:** Convert individual agents into BullMQ consumers.
- **Files:** `packages/agents/[agent-name]/src/worker.ts` (NEW for each agent)
  - Create a worker process that listens to the `agent-tasks` queue.
  - When a job matching the agent's type is received, execute the existing agent logic.
  - *Crucial Update:* Agents must now communicate with the MCP server via SSE or HTTP instead of `stdio` if they are running in distributed background workers. Update `@closepilot/mcp-client` to support a network transport layer (e.g., `SSEClientTransport`).

---

## 🚦 Execution Constraints for Autonomous Agents
1. **Database Migrations:** ONLY Agent 1 is allowed to run `pnpm db:migrate`. Other agents must use local mocks or wait for the schema PR to merge before testing DB interactions.
2. **Environment Variables:** Any new `ENV` variables (e.g., `REDIS_URL`) must be documented in `.env.example` and validated in `@closepilot/core/src/env.ts`.
3. **Tests Required:** Every new API endpoint, MCP tool, or BullMQ worker MUST have an adjacent Vitest integration test. Do not submit a PR without >80% test coverage for the new code.
4. **Code Style:** Strictly adhere to the existing ESLint/Prettier configuration. Use explicit TypeScript return types for all public functions and API handlers.