# Closepilot — Foundation Design & Gap-Fill Specification

> **Date:** 2026-04-15
> **Status:** Approved
> **Purpose:** Supplements `CLOSEPILOT-TECHNICAL-SPEC.md` with all missing details required to scaffold the repo, pass `pnpm install`, and allow 15 parallel Jules sessions to succeed without ambiguity.
> **Read alongside:** `CLOSEPILOT-TECHNICAL-SPEC.md` (primary spec — all interfaces, DB schema, agent logic, and Jules session prompts live there).

---

## Table of Contents

1. [Gap Resolution Decisions](#1-gap-resolution-decisions)
2. [Added Packages & Files](#2-added-packages--files)
3. [Complete File Contents — Scaffold Layer](#3-complete-file-contents--scaffold-layer)
4. [GitHub Repo Creation](#4-github-repo-creation)
5. [Updated Repository Structure](#5-updated-repository-structure)
6. [Updated File Ownership Matrix](#6-updated-file-ownership-matrix)
7. [Phase 0 Execution Checklist](#7-phase-0-execution-checklist)

---

## 1. Gap Resolution Decisions

### 1.1 `@closepilot/mcp-client` Package

**Problem:** Every Jules agent test uses `vi.mock('@closepilot/mcp-client')` but this package does not exist in the repo structure.

**Decision:** Create `packages/mcp-client/` as a seventh workspace package. It exposes a single function:

```typescript
export async function callTool(
  serverName: 'deal-store' | 'gmail' | 'google-calendar' | 'google-drive',
  toolName: string,
  input: Record<string, unknown>
): Promise<unknown>
```

In tests, Jules mocks this entirely:
```typescript
vi.mock('@closepilot/mcp-client', () => ({
  callTool: vi.fn()
}));
```

In production, the real implementation uses the Anthropic MCP client SDK to call the running MCP server over stdio or HTTP.

The package is intentionally thin — the real value is the mock interface.

---

### 1.2 DB Query Stubs

**Problem:** J-101 through J-105 import from `@closepilot/db` (e.g., `import { dealQueries } from '@closepilot/db'`) but the query files are CC-owned (not Jules-owned) and have no content specification.

**Decision:** CC-03 creates typed stub implementations of all query files:

- `packages/db/src/queries/deals.ts` — CRUD stubs
- `packages/db/src/queries/artifacts.ts` — artifact read/write stubs
- `packages/db/src/queries/events.ts` — event log stubs
- `packages/db/src/queries/approvals.ts` — approval queue stubs
- `packages/db/src/queries/past-projects.ts` — project lookup stubs
- `packages/db/src/connection.ts` — drizzle connection pool

Stubs throw `new Error('not implemented')` by default. Jules J-108 fills in `similarity.ts`. The full implementations are written by CC-20 during Phase 4 integration.

---

### 1.3 pgvector Contradiction

**Problem:** The tech stack lists pgvector but the schema has no vector column and `search_similar_projects` uses manual criteria matching.

**Decision:** Skip pgvector for v1. Use manual similarity scoring:
- Industry match → 40 pts
- Tech stack overlap (Jaccard similarity × 40) → 40 pts
- Price range proximity → 20 pts

Add `// TODO v2: replace with pgvector embeddings` comment in similarity.ts. No pgvector migration, no `vector` column, no pgvector extension needed.

---

### 1.4 `infra/` Directory

**Problem:** Section 7 of the spec references `infra/managed-agents/scout.yaml` but the directory is not in the repo structure.

**Decision:** Add to root:
```
infra/
├── managed-agents/
│   ├── scout.yaml
│   ├── scheduler.yaml
│   ├── prep.yaml
│   ├── scribe.yaml
│   └── proposal.yaml
└── routines/
    ├── prep-routine.yaml
    └── chase-routine.yaml
```

These YAML files are created by CC-22 (Phase 4). Jules does not touch `infra/`.

---

### 1.5 Agent Claude API Client

**Problem:** Agents like Scribe and Proposal generate text via Claude, but there is no SDK wrapper or import path defined.

**Decision:** Add `packages/agents/src/shared/claude-client.ts`. It wraps `@anthropic-ai/sdk` and exposes:

```typescript
export async function generateText(
  systemPrompt: string,
  userMessage: string,
  options?: { maxTokens?: number; model?: string }
): Promise<string>
```

Jules tests mock this:
```typescript
vi.mock('../../shared/claude-client', () => ({
  generateText: vi.fn(async () => 'mocked response')
}));
```

---

### 1.6 GitHub Repo Creation

**Problem:** Jules requires a GitHub repository. The project is currently a local directory with no git init.

**Decision:** Phase 0 ends with:
1. Claude Code runs `git init`, creates `.gitignore`, commits all foundation files
2. Human runs: `gh repo create closepilot/closepilot --private && git push -u origin main`
3. Jules sessions are launched ONLY after the push is confirmed

---

## 2. Added Packages & Files

### New package: `packages/mcp-client/`

```
packages/mcp-client/
├── package.json
├── tsconfig.json
└── src/
    └── index.ts          # callTool() — the single export
```

### New shared module in agents

```
packages/agents/src/shared/
├── claude-client.ts      # generateText() wrapper
└── mcp-tools.ts          # typed wrappers around callTool() for deal-store tools
```

`mcp-tools.ts` provides typed helpers so Jules doesn't call `callTool('deal-store', 'create_deal', {...})` with raw strings everywhere:

```typescript
import { callTool } from '@closepilot/mcp-client';
import type { Deal, LeadBrief, ... } from '@closepilot/core';

export const dealStore = {
  createDeal: (input: CreateDealInput) => callTool('deal-store', 'create_deal', input) as Promise<Deal>,
  getDeal: (dealId: string) => callTool('deal-store', 'get_deal', { deal_id: dealId }) as Promise<Deal>,
  updateDealStage: (dealId: string, newStage: DealStage, reason?: string) =>
    callTool('deal-store', 'update_deal_stage', { deal_id: dealId, new_stage: newStage, reason }),
  writeArtifact: (input: WriteArtifactInput) => callTool('deal-store', 'write_artifact', input),
  getDealArtifacts: (dealId: string, type?: ArtifactType) =>
    callTool('deal-store', 'get_deal_artifacts', { deal_id: dealId, artifact_type: type }),
  logEvent: (dealId: string, eventType: string, description: string, agentName?: string) =>
    callTool('deal-store', 'log_event', { deal_id: dealId, event_type: eventType, description, agent_name: agentName }),
  searchSimilarProjects: (input: SimilarProjectInput) =>
    callTool('deal-store', 'search_similar_projects', input) as Promise<{ projects: ProjectRef[] }>,
  createApproval: (input: CreateApprovalInput) =>
    callTool('deal-store', 'create_approval', input) as Promise<{ id: string }>,
};

export const gmailTools = {
  sendEmail: (to: string, subject: string, body: string) =>
    callTool('gmail', 'send_email', { to, subject, body }),
  getThread: (threadId: string) =>
    callTool('gmail', 'get_thread', { thread_id: threadId }),
};

export const calendarTools = {
  getAvailability: (startDate: string, endDate: string, durationMin: number) =>
    callTool('google-calendar', 'get_availability', { start_date: startDate, end_date: endDate, duration_min: durationMin }),
  createEvent: (input: CreateEventInput) =>
    callTool('google-calendar', 'create_event', input),
};

export const driveTools = {
  createDocument: (title: string, content: string) =>
    callTool('google-drive', 'create_document', { title, content }),
  listTemplates: (folderId: string) =>
    callTool('google-drive', 'list_files', { folder_id: folderId }),
};
```

---

## 3. Complete File Contents — Scaffold Layer

All files below are created by Claude Code in Phase 0 sessions CC-01 through CC-08.

### 3.1 Root Files

#### `package.json` (root)

```json
{
  "name": "closepilot",
  "private": true,
  "version": "0.0.1",
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test -- --run",
    "test:watch": "pnpm -r test",
    "lint": "pnpm -r lint",
    "db:generate": "pnpm --filter @closepilot/db db:generate",
    "db:migrate": "pnpm --filter @closepilot/db db:migrate",
    "db:seed": "tsx scripts/seed.ts",
    "dev:api": "pnpm --filter @closepilot/api dev",
    "dev:web": "pnpm --filter @closepilot/web dev",
    "dev:mcp": "pnpm --filter @closepilot/mcp-server dev"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@typescript-eslint/parser": "latest",
    "drizzle-kit": "latest",
    "eslint": "^9.0.0",
    "tsx": "latest",
    "typescript": "^5.4.0",
    "vitest": "latest"
  }
}
```

#### `pnpm-workspace.yaml`

```yaml
packages:
  - 'packages/*'
```

#### `tsconfig.base.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist"
  }
}
```

#### `.env.example`

```bash
# Database
DATABASE_URL=postgres://closepilot:localdev@localhost:5432/closepilot

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# JWT
JWT_SECRET=change-me-in-production

# MCP Server
MCP_SERVER_URL=http://localhost:3100
DEAL_STORE_MCP_AUTH_TOKEN=localdev-token

# API (used by web)
NEXT_PUBLIC_API_URL=http://localhost:3200

# Environment
NODE_ENV=development
PORT=3200
```

#### `.gitignore`

```
node_modules/
dist/
.env
.env.local
*.tsbuildinfo
.next/
.vercel/
coverage/
pg_data/
*.log
```

#### `docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: closepilot
      POSTGRES_USER: closepilot
      POSTGRES_PASSWORD: localdev
    volumes:
      - pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U closepilot"]
      interval: 5s
      timeout: 5s
      retries: 5

  mcp-server:
    build:
      context: ./packages/mcp-server
      dockerfile: Dockerfile
    ports:
      - "3100:3100"
    environment:
      DATABASE_URL: postgres://closepilot:localdev@postgres:5432/closepilot
      AUTH_TOKEN: localdev-token
    depends_on:
      postgres:
        condition: service_healthy

  api:
    build:
      context: ./packages/api
      dockerfile: Dockerfile
    ports:
      - "3200:3200"
    environment:
      DATABASE_URL: postgres://closepilot:localdev@postgres:5432/closepilot
      MCP_SERVER_URL: http://mcp-server:3100
      DEAL_STORE_MCP_AUTH_TOKEN: localdev-token
      JWT_SECRET: localdev-jwt-secret
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
      NODE_ENV: development
    depends_on:
      postgres:
        condition: service_healthy

  web:
    build:
      context: ./packages/web
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3200
    depends_on:
      - api

volumes:
  pg_data:
```

---

### 3.2 Package-Level Files

#### `packages/core/package.json`

```json
{
  "name": "@closepilot/core",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest",
    "lint": "eslint src"
  },
  "devDependencies": {
    "vitest": "latest",
    "typescript": "^5.4.0"
  }
}
```

#### `packages/core/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules"]
}
```

#### `packages/db/package.json`

```json
{
  "name": "@closepilot/db",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "@closepilot/core": "workspace:*",
    "drizzle-orm": "latest",
    "postgres": "^3.4.0"
  },
  "devDependencies": {
    "drizzle-kit": "latest",
    "typescript": "^5.4.0",
    "vitest": "latest"
  }
}
```

#### `packages/db/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules"]
}
```

#### `packages/db/drizzle.config.ts`

```typescript
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/schema/index.ts',
  out: './src/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env['DATABASE_URL'] ?? 'postgres://closepilot:localdev@localhost:5432/closepilot',
  },
} satisfies Config;
```

#### `packages/mcp-server/package.json`

```json
{
  "name": "@closepilot/mcp-server",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "test": "vitest"
  },
  "dependencies": {
    "@anthropic-ai/mcp": "latest",
    "@closepilot/core": "workspace:*",
    "@closepilot/db": "workspace:*",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "tsx": "latest",
    "vitest": "latest"
  }
}
```

#### `packages/mcp-server/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules"]
}
```

#### `packages/mcp-client/package.json`

```json
{
  "name": "@closepilot/mcp-client",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest"
  },
  "dependencies": {
    "@anthropic-ai/mcp": "latest"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vitest": "latest"
  }
}
```

#### `packages/mcp-client/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules"]
}
```

#### `packages/agents/package.json`

```json
{
  "name": "@closepilot/agents",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./scout": {
      "import": "./dist/scout/index.js",
      "types": "./dist/scout/index.d.ts"
    },
    "./scheduler": {
      "import": "./dist/scheduler/index.js",
      "types": "./dist/scheduler/index.d.ts"
    },
    "./prep": {
      "import": "./dist/prep/index.js",
      "types": "./dist/prep/index.d.ts"
    },
    "./scribe": {
      "import": "./dist/scribe/index.js",
      "types": "./dist/scribe/index.d.ts"
    },
    "./proposal": {
      "import": "./dist/proposal/index.js",
      "types": "./dist/proposal/index.d.ts"
    },
    "./chase": {
      "import": "./dist/chase/index.js",
      "types": "./dist/chase/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "latest",
    "@closepilot/core": "workspace:*",
    "@closepilot/mcp-client": "workspace:*",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "tsx": "latest",
    "vitest": "latest"
  }
}
```

#### `packages/agents/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules"]
}
```

#### `packages/api/package.json`

```json
{
  "name": "@closepilot/api",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "test": "vitest"
  },
  "dependencies": {
    "@closepilot/agents": "workspace:*",
    "@closepilot/core": "workspace:*",
    "@closepilot/db": "workspace:*",
    "hono": "^4.0.0",
    "jose": "^5.0.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "tsx": "latest",
    "vitest": "latest",
    "@types/node": "^22.0.0"
  }
}
```

#### `packages/api/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules"]
}
```

#### `packages/web/package.json`

```json
{
  "name": "@closepilot/web",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest"
  },
  "dependencies": {
    "@closepilot/core": "workspace:*",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "lucide-react": "latest",
    "class-variance-authority": "latest",
    "clsx": "latest",
    "tailwind-merge": "latest",
    "jose": "^5.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^3.4.0",
    "postcss": "latest",
    "autoprefixer": "latest",
    "typescript": "^5.4.0",
    "vitest": "latest"
  }
}
```

#### `packages/web/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "jsx": "preserve",
    "module": "esnext",
    "moduleResolution": "bundler",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

#### `packages/web/next.config.ts`

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
```

#### `packages/web/tailwind.config.ts`

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',
          500: '#0ea5e9',
          600: '#0284c7',
          900: '#0c4a6e',
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

---

### 3.3 Core Package Source Files

#### `packages/core/src/index.ts`

```typescript
export * from './types/index.js';
export * from './deal-state-machine.js';
export * from './errors.js';
export * from './constants.js';
```

#### `packages/core/src/errors.ts`

```typescript
export class ClosepilotError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'ClosepilotError';
  }
}

export class ValidationError extends ClosepilotError {
  constructor(message: string, public readonly field?: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class StageTransitionError extends ClosepilotError {
  constructor(
    public readonly from: string,
    public readonly to: string
  ) {
    super(`Invalid stage transition: ${from} → ${to}`, 'INVALID_STAGE_TRANSITION');
    this.name = 'StageTransitionError';
  }
}

export class NotFoundError extends ClosepilotError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ExternalServiceError extends ClosepilotError {
  constructor(service: string, cause: Error) {
    super(`External service error (${service}): ${cause.message}`, 'EXTERNAL_SERVICE_ERROR');
    this.name = 'ExternalServiceError';
    this.cause = cause;
  }
}
```

#### `packages/core/src/constants.ts`

```typescript
import { DealStage } from './types/deal.js';

export const STAGE_LABELS: Record<DealStage, string> = {
  [DealStage.NEW_LEAD]: 'New Lead',
  [DealStage.QUALIFIED]: 'Qualified',
  [DealStage.DECLINED]: 'Declined',
  [DealStage.OUTREACH_SENT]: 'Outreach Sent',
  [DealStage.MEETING_BOOKED]: 'Meeting Booked',
  [DealStage.PROPOSAL_PENDING]: 'Proposal Pending',
  [DealStage.PROPOSAL_SENT]: 'Proposal Sent',
  [DealStage.FOLLOW_UP_1]: 'Follow-up 1',
  [DealStage.FOLLOW_UP_2]: 'Follow-up 2',
  [DealStage.NEGOTIATING]: 'Negotiating',
  [DealStage.PROPOSAL_REVISED]: 'Proposal Revised',
  [DealStage.CLOSED_WON]: 'Closed Won',
  [DealStage.CLOSED_LOST]: 'Closed Lost',
  [DealStage.STALLED]: 'Stalled',
};

export const TERMINAL_STAGES: DealStage[] = [
  DealStage.CLOSED_WON,
  DealStage.CLOSED_LOST,
  DealStage.DECLINED,
];

export const ACTIVE_STAGES: DealStage[] = Object.values(DealStage).filter(
  (s) => !TERMINAL_STAGES.includes(s)
);

export const AGENT_NAMES = {
  SCOUT: 'scout',
  SCHEDULER: 'scheduler',
  PREP: 'prep',
  SCRIBE: 'scribe',
  PROPOSAL: 'proposal',
  CHASE: 'chase',
} as const;

export const DEFAULT_ICP_THRESHOLDS = {
  QUALIFY: 75,   // score >= 75 → auto-qualify
  REVIEW: 50,    // score >= 50 → needs-review
  // below 50 → decline
} as const;

export const MCP_SERVERS = {
  DEAL_STORE: 'deal-store',
  GMAIL: 'gmail',
  GOOGLE_CALENDAR: 'google-calendar',
  GOOGLE_DRIVE: 'google-drive',
} as const;

export const FOLLOW_UP_DELAYS = {
  PROPOSAL_TO_FOLLOWUP1_HOURS: 48,
  FOLLOWUP1_TO_FOLLOWUP2_HOURS: 72,
  FOLLOWUP2_TO_STALLED_DAYS: 7,
} as const;
```

---

### 3.4 MCP Client Package

#### `packages/mcp-client/src/index.ts`

```typescript
/**
 * Thin MCP tool call client.
 * In tests: vi.mock('@closepilot/mcp-client', () => ({ callTool: vi.fn() }))
 * In production: uses Anthropic MCP SDK over stdio/HTTP transport.
 */

export type McpServerName =
  | 'deal-store'
  | 'gmail'
  | 'google-calendar'
  | 'google-drive';

// In production this is replaced by the real MCP SDK client.
// The implementation is intentionally minimal — the interface is what matters.
export async function callTool(
  serverName: McpServerName,
  toolName: string,
  input: Record<string, unknown>
): Promise<unknown> {
  const serverUrl = resolveServerUrl(serverName);
  const authToken = process.env['DEAL_STORE_MCP_AUTH_TOKEN'];

  const response = await fetch(`${serverUrl}/tools/${toolName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(
      `MCP tool call failed: ${serverName}.${toolName} → ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

function resolveServerUrl(serverName: McpServerName): string {
  const urls: Record<McpServerName, string> = {
    'deal-store': process.env['MCP_SERVER_URL'] ?? 'http://localhost:3100',
    'gmail': process.env['GMAIL_MCP_URL'] ?? 'http://localhost:3101',
    'google-calendar': process.env['CALENDAR_MCP_URL'] ?? 'http://localhost:3102',
    'google-drive': process.env['DRIVE_MCP_URL'] ?? 'http://localhost:3103',
  };
  return urls[serverName];
}
```

---

### 3.5 DB Package Stubs

#### `packages/db/src/connection.ts`

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

const connectionString =
  process.env['DATABASE_URL'] ?? 'postgres://closepilot:localdev@localhost:5432/closepilot';

// Singleton connection pool
const client = postgres(connectionString, { max: 10 });
export const db = drizzle(client, { schema });
export type DB = typeof db;
```

#### `packages/db/src/index.ts`

```typescript
export * from './schema/index.js';
export * from './connection.js';
export * from './queries/deals.js';
export * from './queries/artifacts.js';
export * from './queries/events.js';
export * from './queries/approvals.js';
export * from './queries/past-projects.js';
// Note: similarity.ts is implemented by J-108
export * from './queries/similarity.js';
```

#### `packages/db/src/queries/deals.ts` (stub)

```typescript
import { db } from '../connection.js';
import { deals } from '../schema/index.js';
import { eq, inArray } from 'drizzle-orm';
import type { Deal } from '@closepilot/core';

export async function createDeal(
  input: Omit<Deal, 'id' | 'created_at' | 'updated_at'>
): Promise<Deal> {
  const [row] = await db.insert(deals).values(input as any).returning();
  return row as unknown as Deal;
}

export async function getDealById(id: string): Promise<Deal | null> {
  const [row] = await db.select().from(deals).where(eq(deals.id, id));
  return (row as unknown as Deal) ?? null;
}

export async function updateDeal(
  id: string,
  updates: Partial<Omit<Deal, 'id' | 'org_id' | 'created_at'>>
): Promise<Deal> {
  const [row] = await db
    .update(deals)
    .set({ ...updates, updated_at: new Date().toISOString() } as any)
    .where(eq(deals.id, id))
    .returning();
  return row as unknown as Deal;
}

export async function listDeals(
  orgId: string,
  stages?: string[]
): Promise<Deal[]> {
  const query = db.select().from(deals).$dynamic();
  if (stages?.length) {
    return query.where(inArray(deals.stage, stages as any[])) as unknown as Deal[];
  }
  return query as unknown as Deal[];
}
```

#### `packages/db/src/queries/artifacts.ts` (stub)

```typescript
import { db } from '../connection.js';
import { dealArtifacts } from '../schema/index.js';
import { eq, and } from 'drizzle-orm';

export async function writeArtifact(input: {
  deal_id: string;
  artifact_type: string;
  payload: unknown;
  agent_name: string;
}): Promise<{ id: string }> {
  const [row] = await db.insert(dealArtifacts).values(input as any).returning();
  return { id: row!.id };
}

export async function getArtifactsByDeal(
  dealId: string,
  artifactType?: string
) {
  const conditions = [eq(dealArtifacts.deal_id, dealId)];
  if (artifactType) {
    conditions.push(eq(dealArtifacts.artifact_type, artifactType as any));
  }
  return db
    .select()
    .from(dealArtifacts)
    .where(conditions.length === 1 ? conditions[0] : and(...conditions));
}
```

#### `packages/db/src/queries/events.ts` (stub)

```typescript
import { db } from '../connection.js';
import { dealEvents } from '../schema/index.js';
import { eq, desc } from 'drizzle-orm';

export async function logEvent(input: {
  deal_id: string;
  event_type: string;
  description: string;
  agent_name?: string;
}): Promise<void> {
  await db.insert(dealEvents).values(input as any);
}

export async function getDealEvents(dealId: string) {
  return db
    .select()
    .from(dealEvents)
    .where(eq(dealEvents.deal_id, dealId))
    .orderBy(desc(dealEvents.created_at));
}
```

#### `packages/db/src/queries/approvals.ts` (stub)

```typescript
import { db } from '../connection.js';
import { approvalQueue } from '../schema/index.js';
import { eq, and } from 'drizzle-orm';

export async function createApproval(input: {
  deal_id: string;
  org_id: string;
  agent_name: string;
  action: string;
  payload: unknown;
}): Promise<{ id: string }> {
  const [row] = await db.insert(approvalQueue).values(input as any).returning();
  return { id: row!.id };
}

export async function listPendingApprovals(orgId: string) {
  return db
    .select()
    .from(approvalQueue)
    .where(and(eq(approvalQueue.org_id, orgId), eq(approvalQueue.status, 'pending')));
}

export async function resolveApproval(
  id: string,
  status: 'approved' | 'rejected' | 'edited-and-approved',
  reviewedBy: string,
  editedPayload?: unknown
) {
  await db
    .update(approvalQueue)
    .set({
      status: status as any,
      reviewed_at: new Date(),
      reviewed_by: reviewedBy,
      ...(editedPayload ? { edited_payload: editedPayload as any } : {}),
    })
    .where(eq(approvalQueue.id, id));
}
```

#### `packages/db/src/queries/past-projects.ts` (stub)

```typescript
import { db } from '../connection.js';
import { pastProjects } from '../schema/index.js';
import { eq } from 'drizzle-orm';
import type { ProjectRef } from '@closepilot/core';

export async function getAllPastProjects(orgId: string): Promise<ProjectRef[]> {
  const rows = await db
    .select()
    .from(pastProjects)
    .where(eq(pastProjects.org_id, orgId));
  return rows as unknown as ProjectRef[];
}

export async function getPastProjectById(id: string): Promise<ProjectRef | null> {
  const [row] = await db
    .select()
    .from(pastProjects)
    .where(eq(pastProjects.id, id));
  return (row as unknown as ProjectRef) ?? null;
}

export async function insertPastProject(
  input: Omit<ProjectRef, 'id'> & { org_id: string }
): Promise<ProjectRef> {
  const [row] = await db.insert(pastProjects).values(input as any).returning();
  return row as unknown as ProjectRef;
}
```

#### `packages/db/src/queries/similarity.ts` (stub — J-108 implements this)

```typescript
import type { ProjectRef } from '@closepilot/core';

export interface SimilarProjectCriteria {
  org_id: string;
  industry?: string;
  tech_stack?: string[];
  budget_min?: number;
  budget_max?: number;
  limit?: number;
}

/**
 * Finds past projects similar to the given criteria.
 * Scoring:
 *   - Industry exact match: 40 pts
 *   - Tech stack Jaccard overlap × 40: up to 40 pts
 *   - Price within range: 20 pts
 *
 * TODO v2: Replace with pgvector embeddings for semantic similarity.
 *
 * Implemented by J-108. This stub exists so other packages can compile.
 */
export async function findSimilarProjects(
  criteria: SimilarProjectCriteria
): Promise<ProjectRef[]> {
  throw new Error('findSimilarProjects: not yet implemented (J-108)');
}
```

---

### 3.6 Agents Shared Utilities

#### `packages/agents/src/shared/claude-client.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env['ANTHROPIC_API_KEY'],
});

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

export interface GenerateTextOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Generate text using the Claude API.
 * In tests: vi.mock('../../shared/claude-client', () => ({ generateText: vi.fn() }))
 */
export async function generateText(
  systemPrompt: string,
  userMessage: string,
  options: GenerateTextOptions = {}
): Promise<string> {
  const message = await anthropic.messages.create({
    model: options.model ?? DEFAULT_MODEL,
    max_tokens: options.maxTokens ?? 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const content = message.content[0];
  if (!content || content.type !== 'text') {
    throw new Error('Claude returned no text content');
  }
  return content.text;
}

/**
 * Generate and parse JSON from Claude.
 * Retries once if JSON parsing fails.
 */
export async function generateJson<T>(
  systemPrompt: string,
  userMessage: string,
  options: GenerateTextOptions = {}
): Promise<T> {
  const text = await generateText(
    systemPrompt + '\n\nRespond with valid JSON only. No markdown, no code blocks.',
    userMessage,
    options
  );

  try {
    return JSON.parse(text) as T;
  } catch {
    // Retry once
    const retry = await generateText(
      systemPrompt + '\n\nRespond with valid JSON only. No markdown, no code blocks.',
      userMessage,
      options
    );
    return JSON.parse(retry) as T;
  }
}
```

#### `packages/agents/src/shared/mcp-tools.ts`

```typescript
import { callTool } from '@closepilot/mcp-client';
import type {
  Deal, DealStage, ArtifactType, ProjectRef,
  ApprovalAction, ApprovalQueueItem
} from '@closepilot/core';

// ── Deal Store ────────────────────────────────────────────────────────────────

export interface CreateDealInput {
  org_id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_title?: string;
  icp_score?: number;
  pipeline_value?: number;
}

export interface WriteArtifactInput {
  deal_id: string;
  artifact_type: ArtifactType;
  payload: unknown;
  agent_name: string;
}

export interface SimilarProjectInput {
  org_id: string;
  industry?: string;
  tech_stack?: string[];
  budget_min?: number;
  budget_max?: number;
  limit?: number;
}

export interface CreateApprovalInput {
  deal_id: string;
  org_id: string;
  agent_name: string;
  action: ApprovalAction;
  payload: unknown;
}

export const dealStore = {
  createDeal: (input: CreateDealInput) =>
    callTool('deal-store', 'create_deal', input as Record<string, unknown>) as Promise<Deal>,

  getDeal: (dealId: string) =>
    callTool('deal-store', 'get_deal', { deal_id: dealId }) as Promise<Deal>,

  updateDealStage: (dealId: string, newStage: DealStage, reason?: string) =>
    callTool('deal-store', 'update_deal_stage', {
      deal_id: dealId,
      new_stage: newStage,
      ...(reason ? { reason } : {}),
    }) as Promise<Deal>,

  listActiveDeals: (orgId: string, stages?: DealStage[]) =>
    callTool('deal-store', 'list_active_deals', {
      org_id: orgId,
      ...(stages ? { stages } : {}),
    }) as Promise<Deal[]>,

  writeArtifact: (input: WriteArtifactInput) =>
    callTool('deal-store', 'write_artifact', input as Record<string, unknown>) as Promise<{ id: string }>,

  getDealArtifacts: (dealId: string, artifactType?: ArtifactType) =>
    callTool('deal-store', 'get_deal_artifacts', {
      deal_id: dealId,
      ...(artifactType ? { artifact_type: artifactType } : {}),
    }) as Promise<{ artifacts: Array<{ id: string; artifact_type: ArtifactType; payload: unknown; created_at: string }> }>,

  logEvent: (dealId: string, eventType: string, description: string, agentName?: string) =>
    callTool('deal-store', 'log_event', {
      deal_id: dealId,
      event_type: eventType,
      description,
      ...(agentName ? { agent_name: agentName } : {}),
    }) as Promise<void>,

  searchSimilarProjects: (input: SimilarProjectInput) =>
    callTool('deal-store', 'search_similar_projects', input as Record<string, unknown>) as Promise<{ projects: ProjectRef[] }>,

  createApproval: (input: CreateApprovalInput) =>
    callTool('deal-store', 'create_approval', input as Record<string, unknown>) as Promise<{ id: string }>,
};

// ── Gmail ─────────────────────────────────────────────────────────────────────

export const gmailTools = {
  sendEmail: (to: string, subject: string, body: string, htmlBody?: string) =>
    callTool('gmail', 'send_email', {
      to,
      subject,
      body,
      ...(htmlBody ? { html_body: htmlBody } : {}),
    }) as Promise<{ message_id: string }>,

  getThread: (threadId: string) =>
    callTool('gmail', 'get_thread', { thread_id: threadId }) as Promise<{
      messages: Array<{ id: string; from: string; subject: string; body: string; date: string }>
    }>,

  searchEmails: (query: string, maxResults?: number) =>
    callTool('gmail', 'search_emails', { query, max_results: maxResults ?? 10 }) as Promise<{
      messages: Array<{ id: string; from: string; subject: string; snippet: string; date: string }>
    }>,
};

// ── Google Calendar ───────────────────────────────────────────────────────────

export interface CreateEventInput {
  summary: string;
  description: string;
  start: string; // ISO 8601
  end: string;   // ISO 8601
  attendees: string[];
}

export const calendarTools = {
  getAvailability: (startDate: string, endDate: string, durationMin: number) =>
    callTool('google-calendar', 'get_availability', {
      start_date: startDate,
      end_date: endDate,
      duration_min: durationMin,
    }) as Promise<{ slots: Array<{ start: string; end: string; available: boolean }> }>,

  createEvent: (input: CreateEventInput) =>
    callTool('google-calendar', 'create_event', input as Record<string, unknown>) as Promise<{
      event_id: string;
      html_link: string;
    }>,
};

// ── Google Drive ──────────────────────────────────────────────────────────────

export const driveTools = {
  createDocument: (title: string, content: string, folderId?: string) =>
    callTool('google-drive', 'create_document', {
      title,
      content,
      ...(folderId ? { folder_id: folderId } : {}),
    }) as Promise<{ doc_id: string; url: string }>,

  getDocument: (docId: string) =>
    callTool('google-drive', 'get_document', { doc_id: docId }) as Promise<{
      content: string;
      url: string;
    }>,

  listFiles: (folderId: string, mimeType?: string) =>
    callTool('google-drive', 'list_files', {
      folder_id: folderId,
      ...(mimeType ? { mime_type: mimeType } : {}),
    }) as Promise<{ files: Array<{ id: string; name: string; url: string }> }>,
};
```

---

### 3.7 MCP Server Skeleton

#### `packages/mcp-server/src/index.ts`

```typescript
import { McpServer } from '@anthropic-ai/mcp';
import { registerDealTools } from './tools/deals.js';
import { registerArtifactTools } from './tools/artifacts.js';
import { registerEventTools } from './tools/events.js';
import { registerPastProjectTools } from './tools/past-projects.js';
import { registerApprovalTools } from './tools/approvals.js';

const server = new McpServer({
  name: 'closepilot-deal-store',
  version: '1.0.0',
});

// Register all tool groups
registerDealTools(server);
registerArtifactTools(server);
registerEventTools(server);
registerPastProjectTools(server);
registerApprovalTools(server);

const port = parseInt(process.env['PORT'] ?? '3100');
server.listen(port);
console.log(`Deal Store MCP server running on port ${port}`);
```

Each tool file (`deals.ts`, `artifacts.ts`, etc.) exports a `register*Tools(server: McpServer)` function. Jules fills in the implementations.

---

### 3.8 API Server Skeleton

#### `packages/api/src/index.ts`

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authRoutes } from './routes/auth.js';
import { dealRoutes } from './routes/deals.js';
import { artifactRoutes } from './routes/artifacts.js';
import { approvalRoutes } from './routes/approvals.js';
import { scribeRoutes } from './routes/scribe.js';
import { settingsRoutes } from './routes/settings.js';
import { webhookRoutes } from './routes/webhooks.js';

const app = new Hono();

app.use('*', logger());
app.use('/api/*', cors());

app.route('/api/auth', authRoutes);
app.route('/api/deals', dealRoutes);
app.route('/api/deals', artifactRoutes);
app.route('/api/approvals', approvalRoutes);
app.route('/api/deals', scribeRoutes);
app.route('/api/settings', settingsRoutes);
app.route('/api/webhooks', webhookRoutes);

app.get('/health', (c) => c.json({ status: 'ok' }));

const port = parseInt(process.env['PORT'] ?? '3200');
console.log(`Closepilot API running on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
```

---

### 3.9 Web Scaffold

#### `packages/web/src/app/layout.tsx`

```typescript
import type { Metadata } from 'next';
import './globals.css';
import { Nav } from '@/components/nav';

export const metadata: Metadata = {
  title: 'Closepilot',
  description: 'Autonomous deal flow engine',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900">
        <div className="flex h-screen">
          <Nav />
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
```

#### `packages/web/src/app/page.tsx`

```typescript
import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/dashboard');
}
```

#### `packages/web/src/app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

#### `packages/web/src/components/nav.tsx`

```typescript
import Link from 'next/link';

export function Nav() {
  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col py-6 px-4">
      <div className="mb-8">
        <span className="text-xl font-bold text-brand-600">Closepilot</span>
      </div>
      <nav className="flex flex-col gap-1">
        <Link href="/dashboard" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100">
          Pipeline
        </Link>
        <Link href="/approvals" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100">
          Approvals
        </Link>
        <Link href="/settings" className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100">
          Settings
        </Link>
      </nav>
    </aside>
  );
}
```

#### `packages/web/src/lib/api-client.ts`

```typescript
const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3200';

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('cp_token') : null;

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error((error as any).message ?? response.statusText);
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
};
```

#### `packages/web/src/lib/auth.ts`

```typescript
export interface Session {
  userId: string;
  orgId: string;
  email: string;
  name: string;
}

export function getSession(): Session | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('cp_token');
  if (!token) return null;
  try {
    // Decode JWT payload (base64 url)
    const payload = JSON.parse(
      atob(token.split('.')[1]!.replace(/-/g, '+').replace(/_/g, '/'))
    );
    return {
      userId: payload.user_id,
      orgId: payload.org_id,
      email: payload.email,
      name: payload.name,
    };
  } catch {
    return null;
  }
}

export function saveToken(token: string): void {
  localStorage.setItem('cp_token', token);
}

export function clearSession(): void {
  localStorage.removeItem('cp_token');
}
```

---

### 3.10 Scripts

#### `scripts/setup.sh`

```bash
#!/bin/bash
set -e

echo "==> Setting up Closepilot development environment"

# Ensure corepack + pnpm
corepack enable
corepack prepare pnpm@9 --activate

# Install all workspace dependencies
echo "==> Installing dependencies"
pnpm install --frozen-lockfile

# Build foundational packages in order
echo "==> Building @closepilot/core"
pnpm --filter @closepilot/core build

echo "==> Building @closepilot/db"
pnpm --filter @closepilot/db build

echo "==> Building @closepilot/mcp-client"
pnpm --filter @closepilot/mcp-client build

# Run core tests to verify setup
echo "==> Running core package tests"
pnpm --filter @closepilot/core test -- --run

echo ""
echo "==> Setup complete. All foundational packages built and tested."
```

#### `scripts/test-all.sh`

```bash
#!/bin/bash
set -e

echo "==> Running all tests"
pnpm -r test -- --run

if [ $? -eq 0 ]; then
  echo "==> All tests passed"
else
  echo "==> Tests failed"
  exit 1
fi
```

---

## 4. GitHub Repo Creation

### Step-by-step process (Phase 0, end of CC-08)

Claude Code handles steps 1-4. Human operator handles steps 5-6.

```
1. [Claude Code] git init in /closepilot root
2. [Claude Code] git add all foundation files
3. [Claude Code] git commit -m "feat: initialize closepilot monorepo — foundation (CC-01 through CC-08)"
4. [Claude Code] Print the command for the human to run

5. [Human] gh repo create closepilot/closepilot --private --source=. --remote=origin
   OR: Create repo manually at github.com, then:
   git remote add origin https://github.com/<your-handle>/closepilot.git
   git branch -M main
   git push -u origin main

6. [Human] Confirm push → launch Jules sessions
```

### Required before any Jules session starts

- [ ] `main` branch exists on GitHub
- [ ] `AGENTS.md` is in the repo root (written by CC-07)
- [ ] `scripts/setup.sh` is in the repo (written by CC-08)
- [ ] `packages/core/dist/` is NOT in the repo (Jules builds it themselves)
- [ ] `.env` is NOT committed (only `.env.example`)

---

## 5. Updated Repository Structure

Full structure including all additions from this document:

```
closepilot/
├── AGENTS.md                              # Jules context file
├── CLAUDE.md                              # Claude Code context file
├── CLOSEPILOT-TECHNICAL-SPEC.md          # Primary spec (do not modify)
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .env.example
├── .gitignore
│
├── docs/
│   └── superpowers/
│       └── specs/
│           └── 2026-04-15-closepilot-foundation-design.md  # This file
│
├── infra/
│   ├── managed-agents/
│   │   ├── scout.yaml
│   │   ├── scheduler.yaml                # (CC-22)
│   │   ├── prep.yaml                     # (CC-22)
│   │   ├── scribe.yaml                   # (CC-22)
│   │   └── proposal.yaml                 # (CC-22)
│   └── routines/
│       ├── prep-routine.yaml             # (CC-23)
│       └── chase-routine.yaml            # (CC-23)
│
├── scripts/
│   ├── setup.sh
│   ├── seed.ts
│   └── test-all.sh
│
└── packages/
    ├── core/
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/
    │       ├── index.ts
    │       ├── errors.ts
    │       ├── constants.ts
    │       ├── deal-state-machine.ts      # J-106
    │       └── types/
    │           ├── index.ts
    │           ├── common.ts
    │           ├── deal.ts
    │           ├── artifacts.ts
    │           ├── agents.ts
    │           ├── approval.ts
    │           ├── icp.ts
    │           └── digest.ts
    │
    ├── db/
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── drizzle.config.ts
    │   └── src/
    │       ├── index.ts
    │       ├── connection.ts
    │       ├── schema/
    │       │   ├── index.ts
    │       │   ├── organizations.ts
    │       │   ├── users.ts
    │       │   ├── deals.ts
    │       │   ├── deal-artifacts.ts
    │       │   ├── deal-events.ts
    │       │   ├── past-projects.ts
    │       │   └── approval-queue.ts
    │       ├── migrations/                # Generated by drizzle-kit
    │       ├── seeds/
    │       │   ├── sample-projects.ts     # J-107
    │       │   ├── sample-icp.ts          # J-107
    │       │   └── test-deals.ts          # J-107
    │       └── queries/
    │           ├── deals.ts               # stub (CC-03)
    │           ├── artifacts.ts           # stub (CC-03)
    │           ├── events.ts              # stub (CC-03)
    │           ├── approvals.ts           # stub (CC-03)
    │           ├── past-projects.ts       # stub (CC-03)
    │           └── similarity.ts          # J-108
    │
    ├── mcp-client/                        # NEW
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/
    │       └── index.ts                   # callTool()
    │
    ├── mcp-server/
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── Dockerfile
    │   └── src/
    │       ├── index.ts                   # skeleton (CC-04)
    │       └── tools/
    │           ├── deals.ts               # J-101
    │           ├── artifacts.ts           # J-102
    │           ├── events.ts              # J-103
    │           ├── past-projects.ts       # J-104
    │           ├── approvals.ts           # J-105
    │           └── __tests__/
    │               ├── deals.test.ts
    │               ├── artifacts.test.ts
    │               ├── events.test.ts
    │               ├── past-projects.test.ts
    │               └── approvals.test.ts
    │
    ├── agents/
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/
    │       ├── shared/
    │       │   ├── claude-client.ts       # generateText(), generateJson()
    │       │   └── mcp-tools.ts           # typed deal-store/gmail/calendar/drive wrappers
    │       ├── scout/ ...                 # J-201 through J-205
    │       ├── scheduler/ ...             # J-206 through J-208
    │       ├── prep/ ...                  # J-209 through J-211
    │       ├── scribe/ ...                # J-212 through J-214
    │       ├── proposal/ ...              # J-215 through J-219
    │       └── chase/ ...                 # J-220 through J-223 + J-307 template
    │
    ├── api/
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── Dockerfile
    │   └── src/
    │       ├── index.ts                   # Hono server skeleton
    │       ├── middleware/
    │       │   ├── auth.ts
    │       │   └── org-context.ts
    │       └── routes/
    │           ├── auth.ts
    │           ├── deals.ts
    │           ├── artifacts.ts
    │           ├── approvals.ts
    │           ├── scribe.ts
    │           ├── settings.ts
    │           └── webhooks.ts
    │
    └── web/
        ├── package.json
        ├── tsconfig.json
        ├── next.config.ts
        ├── tailwind.config.ts
        └── src/
            ├── app/
            │   ├── globals.css
            │   ├── layout.tsx
            │   ├── page.tsx               # redirect → /dashboard
            │   ├── auth/page.tsx          # J-301
            │   ├── dashboard/page.tsx     # J-302
            │   ├── deals/[id]/
            │   │   ├── page.tsx           # J-303
            │   │   ├── scribe/page.tsx    # J-305
            │   │   └── proposal/page.tsx  # J-308
            │   ├── approvals/page.tsx     # J-304
            │   └── settings/page.tsx      # J-306
            ├── components/
            │   ├── nav.tsx
            │   ├── deal-card.tsx          # J-302
            │   ├── pipeline-board.tsx     # J-302
            │   ├── approval-item.tsx      # J-304
            │   ├── artifact-viewer.tsx    # J-303
            │   └── timeline-event.tsx     # J-303
            └── lib/
                ├── api-client.ts
                └── auth.ts
```

---

## 6. Updated File Ownership Matrix

Additions to the matrix in the primary spec (Appendix A):

| File Path | Owner | Notes |
|-----------|-------|-------|
| `packages/mcp-client/src/index.ts` | CC-04 | New package — thin callTool wrapper |
| `packages/agents/src/shared/claude-client.ts` | CC-05 | New — Claude API wrapper |
| `packages/agents/src/shared/mcp-tools.ts` | CC-05 | New — typed deal-store/Gmail/Calendar/Drive wrappers |
| `packages/db/src/connection.ts` | CC-03 | New — drizzle connection pool |
| `packages/db/src/queries/deals.ts` | CC-03 | Stub — CRUD operations |
| `packages/db/src/queries/artifacts.ts` | CC-03 | Stub — artifact operations |
| `packages/db/src/queries/events.ts` | CC-03 | Stub — event log operations |
| `packages/db/src/queries/approvals.ts` | CC-03 | Stub — approval queue operations |
| `packages/db/src/queries/past-projects.ts` | CC-03 | Stub — project lookups |
| `packages/db/src/queries/similarity.ts` | J-108 | Stub initially by CC-03, implemented by J-108 |
| `packages/core/src/errors.ts` | CC-02 | ClosepilotError hierarchy |
| `packages/core/src/constants.ts` | CC-02 | Stage labels, agent names, thresholds |
| `packages/api/src/index.ts` | CC-06 | Hono server entry |
| `packages/api/src/middleware/auth.ts` | CC-06 | JWT Bearer verification |
| `packages/api/src/middleware/org-context.ts` | CC-06 | Multi-tenant org resolution |
| `packages/api/src/routes/*.ts` | CC-06 | All route skeletons (7 files) |
| `packages/web/src/app/layout.tsx` | CC-07 | Root layout with sidebar |
| `packages/web/src/app/page.tsx` | CC-07 | Root redirect |
| `packages/web/src/app/globals.css` | CC-07 | Tailwind base styles |
| `packages/web/src/components/nav.tsx` | CC-07 | Sidebar nav component |
| `packages/web/src/lib/api-client.ts` | CC-07 | Typed fetch wrapper |
| `packages/web/src/lib/auth.ts` | CC-07 | JWT decode + session helpers |
| `docker-compose.yml` | CC-08 | Local dev stack |
| `.env.example` | CC-01 | Environment variable template |
| `scripts/setup.sh` | CC-08 | Jules environment setup |
| `scripts/test-all.sh` | CC-08 | Cross-package test runner |
| `AGENTS.md` | CC-07 | Jules context file (content in primary spec §15) |
| `CLAUDE.md` | CC-07 | Claude Code context file |
| `infra/managed-agents/*.yaml` | CC-22 | Phase 4 — created after Jules PRs merged |
| `infra/routines/*.yaml` | CC-23 | Phase 4 — Routines configuration |

**GOLDEN RULE: Jules tasks NEVER touch CC-owned files. CC tasks NEVER touch J-owned files.**

---

## 7. Phase 0 Execution Checklist

All items below must be complete before launching any Jules session.

```
CC-01: Initialize monorepo
  [ ] pnpm-workspace.yaml
  [ ] Root package.json
  [ ] tsconfig.base.json
  [ ] .gitignore
  [ ] .env.example
  [ ] docker-compose.yml

CC-02: TypeScript interfaces + core package
  [ ] packages/core/package.json + tsconfig.json
  [ ] packages/core/src/types/common.ts
  [ ] packages/core/src/types/deal.ts
  [ ] packages/core/src/types/artifacts.ts
  [ ] packages/core/src/types/agents.ts
  [ ] packages/core/src/types/approval.ts
  [ ] packages/core/src/types/icp.ts
  [ ] packages/core/src/types/digest.ts
  [ ] packages/core/src/types/index.ts
  [ ] packages/core/src/errors.ts
  [ ] packages/core/src/constants.ts
  [ ] packages/core/src/index.ts
  [ ] pnpm --filter @closepilot/core build → PASSES

CC-03: Database schema + query stubs
  [ ] packages/db/package.json + tsconfig.json + drizzle.config.ts
  [ ] packages/db/src/schema/organizations.ts
  [ ] packages/db/src/schema/users.ts
  [ ] packages/db/src/schema/deals.ts
  [ ] packages/db/src/schema/deal-artifacts.ts
  [ ] packages/db/src/schema/deal-events.ts
  [ ] packages/db/src/schema/past-projects.ts
  [ ] packages/db/src/schema/approval-queue.ts
  [ ] packages/db/src/schema/index.ts
  [ ] packages/db/src/connection.ts
  [ ] packages/db/src/queries/deals.ts (stub)
  [ ] packages/db/src/queries/artifacts.ts (stub)
  [ ] packages/db/src/queries/events.ts (stub)
  [ ] packages/db/src/queries/approvals.ts (stub)
  [ ] packages/db/src/queries/past-projects.ts (stub)
  [ ] packages/db/src/queries/similarity.ts (stub)
  [ ] packages/db/src/index.ts
  [ ] pnpm --filter @closepilot/db build → PASSES

CC-04: MCP client + MCP server skeleton
  [ ] packages/mcp-client/package.json + tsconfig.json
  [ ] packages/mcp-client/src/index.ts (callTool implementation)
  [ ] packages/mcp-server/package.json + tsconfig.json
  [ ] packages/mcp-server/src/index.ts (server skeleton, registers all tools)
  [ ] packages/mcp-server/src/tools/deals.ts (registerDealTools stub — empty implementations, no tests)
  [ ] packages/mcp-server/src/tools/artifacts.ts (stub)
  [ ] packages/mcp-server/src/tools/events.ts (stub)
  [ ] packages/mcp-server/src/tools/past-projects.ts (stub)
  [ ] packages/mcp-server/src/tools/approvals.ts (stub)
  [ ] pnpm --filter @closepilot/mcp-client build → PASSES
  [ ] pnpm --filter @closepilot/mcp-server build → PASSES

CC-05: Agents package scaffold + shared utilities
  [ ] packages/agents/package.json + tsconfig.json
  [ ] packages/agents/src/shared/claude-client.ts
  [ ] packages/agents/src/shared/mcp-tools.ts
  [ ] Empty index.ts stubs for all 6 agents (so package builds)
  [ ] pnpm --filter @closepilot/agents build → PASSES

CC-06: API skeleton
  [ ] packages/api/package.json + tsconfig.json
  [ ] packages/api/src/index.ts (Hono server)
  [ ] packages/api/src/middleware/auth.ts
  [ ] packages/api/src/middleware/org-context.ts
  [ ] packages/api/src/routes/auth.ts (empty handlers)
  [ ] packages/api/src/routes/deals.ts (empty handlers)
  [ ] packages/api/src/routes/artifacts.ts (empty handlers)
  [ ] packages/api/src/routes/approvals.ts (empty handlers)
  [ ] packages/api/src/routes/scribe.ts (empty handlers)
  [ ] packages/api/src/routes/settings.ts (empty handlers)
  [ ] packages/api/src/routes/webhooks.ts (empty handlers)
  [ ] pnpm --filter @closepilot/api build → PASSES

CC-07: Web scaffold + AGENTS.md + CLAUDE.md
  [ ] packages/web/package.json + tsconfig.json + next.config.ts + tailwind.config.ts
  [ ] packages/web/src/app/layout.tsx
  [ ] packages/web/src/app/page.tsx
  [ ] packages/web/src/app/globals.css
  [ ] packages/web/src/components/nav.tsx
  [ ] packages/web/src/lib/api-client.ts
  [ ] packages/web/src/lib/auth.ts
  [ ] AGENTS.md (content from primary spec §15)
  [ ] CLAUDE.md (project-level Claude Code instructions)
  [ ] pnpm --filter @closepilot/web build → PASSES

CC-08: Scripts + git init + GitHub push
  [ ] scripts/setup.sh (executable: chmod +x)
  [ ] scripts/test-all.sh (executable: chmod +x)
  [ ] scripts/seed.ts (skeleton with sample data structure)
  [ ] Test setup.sh in clean environment
  [ ] git init
  [ ] git add -A
  [ ] git commit -m "feat: initialize closepilot monorepo — foundation (CC-01 through CC-08)"
  [ ] Human: gh repo create + git push -u origin main
  [ ] Verify repo is accessible at github.com
  [ ] LAUNCH JULES SESSIONS (Batch 1: J-101 through J-108)
```

---

*This document supplements `CLOSEPILOT-TECHNICAL-SPEC.md`. All interface contracts, agent logic, Jules session prompts, and deployment configuration remain in the primary spec.*
