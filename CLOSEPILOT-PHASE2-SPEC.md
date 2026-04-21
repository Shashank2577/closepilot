# Closepilot Phase 2 Spec
## Infrastructure, Observability, Hardening, and Production Deploy

> Repo: Shashank2577/closepilot | Branch: main
> Tech: TypeScript 5.3 (ESM, `.js` import extensions), pnpm 8 workspaces, Node 20, Vitest 4, Hono 3, Next.js 15, Drizzle ORM (PostgreSQL 16), MCP (stdio)

---

## Status of Phase 2

| Session | Title | Task | Status |
| --- | --- | --- | --- |
| 1 | Docker + Monitoring + AGENTS.md | **J-116** | IN_PROGRESS (Jules) |
| 2 | E2E Integration Test Suite | **J-117** | IN_PROGRESS (Jules) |
| 3 | Observability (OpenTelemetry + Metrics + Structured Tracing) | **J-118** | To be dispatched |
| 4 | Production Hardening (Security + Rate Limiting + Env Validation + Graceful Shutdown) | **J-119** | To be dispatched |
| 5 | Production Deployment (Fly.io + CI/CD + Migrations + Runbook) | **J-120** | To be dispatched |

Sessions 3-5 depend on Sessions 1-2 merging. The tasks in this document are fully specified below with acceptance criteria, file-level plans, edge cases, verification commands, and PR templates.

---

## Shared Global Conventions (applies to all sessions)

- **ESM**: TypeScript imports always use `.js` extensions. The `moduleResolution` is `bundler`/`nodenext`.
- **No `any`**: Only acceptable as `// eslint-disable-next-line` with a comment explaining the SDK-level type gap.
- **Vitest only**: Do not introduce `jest`, `ava`, `mocha`, `tap`, or `node:test`.
- **Hono testing**: Use `app.request('/path', { method, body })` — never `fetch` against a live port.
- **No barrel files**: Import directly from source modules.
- **Types only in `@closepilot/core`**: Do not duplicate `Deal`, `DealStage`, `AgentType`, etc., elsewhere.
- **Agents never import `@closepilot/db`**: All DB access goes through MCP tools or the API.
- **Env vars**: Read through a validated schema (zod). No direct `process.env.X` access in business logic after J-119 lands.
- **Every PR must**: (a) pass `pnpm build`, `pnpm typecheck`, `pnpm test`; (b) include a `CHANGELOG.md` snippet; (c) update `AGENTS.md` if it introduces new env vars, commands, or conventions.

---

## Session 3 — Observability (J-118)

**Goal.** Make Closepilot production-legible: every request, every agent step, every DB query is observable with structured logs, distributed traces, and Prometheus metrics. Operators must be able to answer: "Where did this deal stall? Why is latency high? Which agent is failing?"

**Prerequisite.** J-116 merged (logger + health endpoint in place).

**Out of scope.** Error reporting to third-party services (Sentry/Datadog) — that's a future toggle. Grafana dashboard JSON files — operator concern.

### 3.1 Deliverables

#### 3.1.1 OpenTelemetry auto-instrumentation (`packages/api`)

Add deps to `packages/api/package.json`:
```
"@opentelemetry/sdk-node": "^0.52.0",
"@opentelemetry/auto-instrumentations-node": "^0.49.0",
"@opentelemetry/exporter-trace-otlp-http": "^0.52.0",
"@opentelemetry/resources": "^1.25.0",
"@opentelemetry/semantic-conventions": "^1.25.0"
```

Create `packages/api/src/telemetry.ts`:
- Export `initTelemetry()` that sets up the NodeSDK with HTTP + Hono + pg auto-instrumentations.
- Honor env vars: `OTEL_EXPORTER_OTLP_ENDPOINT` (default `http://localhost:4318/v1/traces`), `OTEL_SERVICE_NAME` (default `closepilot-api`), `OTEL_ENABLED` (default `false` — MUST opt-in).
- When `OTEL_ENABLED=false`, export a no-op `initTelemetry()` that logs `telemetry disabled` at debug level.
- Register `process.on('SIGTERM', () => sdk.shutdown())`.

Wire into `packages/api/src/index.ts` at the very top (before any other imports) via `import './telemetry.js'` — OTel requires early registration.

#### 3.1.2 Prometheus metrics endpoint (`packages/api`)

Add `prom-client@^15.1.3` to `packages/api/package.json`.

Create `packages/api/src/metrics.ts`:
- Default registry with `collectDefaultMetrics({ prefix: 'closepilot_api_' })`.
- Custom counters:
  - `closepilot_api_requests_total{method,route,status}` — incremented in request middleware
  - `closepilot_api_deals_created_total` — incremented on POST /api/deals success
  - `closepilot_api_approvals_resolved_total{decision}` — incremented on POST /api/approvals
- Custom histograms:
  - `closepilot_api_request_duration_seconds{method,route,status}` — buckets `[0.01,0.05,0.1,0.25,0.5,1,2,5]`
  - `closepilot_api_db_query_duration_seconds{query}` — recorded in a DB wrapper

Expose `GET /metrics` in `packages/api/src/index.ts` that returns `registry.metrics()` as `text/plain; version=0.0.4`. Protect it with a token check against `METRICS_BEARER_TOKEN` if that env var is set; otherwise open.

#### 3.1.3 Request ID propagation

Create `packages/api/src/middleware/requestId.ts`:
- Read `x-request-id` header or generate a UUIDv4.
- Store on Hono context: `c.set('requestId', id)`.
- Add `x-request-id` to response headers.
- Add `requestId` field to every log line via a per-request logger child: `const log = logger.child({ requestId })` and attach `c.set('logger', log)`.

Update existing routes to pull the request-scoped logger from context instead of the module-level `logger`.

#### 3.1.4 DB query timing

Create `packages/db/src/instrument.ts`:
- Wraps the Drizzle client so every `.execute`, `.query`, `.insert`, `.update`, `.delete` is timed.
- Emits `closepilot_api_db_query_duration_seconds` histogram if `prom-client` default registry is available, else no-op.
- Emits a debug-level log line for queries that exceed 500ms.

Do **not** change public API of `@closepilot/db`. The instrumented client must be behavior-preserving.

#### 3.1.5 Agent step spans (`packages/agents/orchestrator`)

For each stage transition, create an OTel span:
```typescript
tracer.startActiveSpan(`deal.stage.${stage}`, async (span) => {
  span.setAttribute('deal.id', dealId);
  span.setAttribute('deal.stage', stage);
  try { /* run stage handler */ }
  catch (e) { span.recordException(e); span.setStatus({ code: SpanStatusCode.ERROR }); throw e; }
  finally { span.end(); }
});
```

Use `@opentelemetry/api` (peer only) — no new SDK init in the orchestrator; it inherits from whichever process starts it.

### 3.2 Acceptance Criteria

- **Given** the API is running with `OTEL_ENABLED=true` and an OTLP collector at `http://localhost:4318`, **when** I `POST /api/deals`, **then** at least one trace is exported containing a root HTTP span with child spans for any DB queries.
- **Given** the API is running, **when** I `GET /metrics`, **then** response is 200 with content type `text/plain; version=0.0.4` and body contains `closepilot_api_requests_total` and `process_cpu_user_seconds_total`.
- **Given** `METRICS_BEARER_TOKEN=secret`, **when** I `GET /metrics` without the header, **then** response is 401.
- **Given** I make a request without `x-request-id`, **when** I inspect the response headers and server logs, **then** both contain the same UUIDv4.
- **Given** I make a request with `x-request-id: custom-abc`, **when** I inspect response + logs, **then** both contain `custom-abc` verbatim.
- **Given** `OTEL_ENABLED=false`, **when** the API starts, **then** no OTel SDK is registered (no `@opentelemetry/sdk-node` in the process module graph for production runtime), and a single debug log `telemetry disabled` is emitted.
- **Given** the orchestrator processes a deal through all 5 stages, **when** I collect traces, **then** there are 5 child spans named `deal.stage.{ENRICHMENT,SCOPING,PROPOSAL,CRM_SYNC,COMPLETED}` attached to a parent `deal.process` span with `deal.id` attribute set.
- `pnpm build` passes. `pnpm test` passes (no regressions). The API starts cleanly with both `OTEL_ENABLED=true` and `false`.
- `AGENTS.md` "Environment Variables" section updated with `OTEL_ENABLED`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_SERVICE_NAME`, `METRICS_BEARER_TOKEN`.

### 3.3 Tests (new, in `packages/api/src/`)

- `src/middleware/__tests__/requestId.test.ts` (4 cases): generates UUID when header absent; honors header when present; echoes header in response; rejects malformed header (too long) with a generated UUID fallback.
- `src/__tests__/metrics.test.ts` (3 cases): `/metrics` returns Prometheus text format; token gate returns 401 without header and 200 with; counters increment on deal create.
- `src/__tests__/telemetry.test.ts` (2 cases): `OTEL_ENABLED=false` yields no-op init; `OTEL_ENABLED=true` calls the SDK start method (use `vi.mock('@opentelemetry/sdk-node')`).

### 3.4 Verification commands (include in PR body)

```bash
pnpm install
pnpm build
pnpm test
pnpm --filter @closepilot/api test
OTEL_ENABLED=false pnpm --filter @closepilot/api start &
sleep 2 && curl -s http://localhost:3001/metrics | grep closepilot_api_requests_total
curl -s http://localhost:3001/api/health
curl -s -D- http://localhost:3001/api/deals -X POST -H 'content-type: application/json' -d '{}' | grep -i x-request-id
```

### 3.5 PR template

```markdown
## Summary
J-118 — Observability: OpenTelemetry tracing, Prometheus metrics, request IDs, DB timing, orchestrator spans.

## Changes
- `packages/api/src/telemetry.ts` — OTel NodeSDK init, opt-in via OTEL_ENABLED
- `packages/api/src/metrics.ts` — prom-client registry + counters/histograms
- `packages/api/src/middleware/requestId.ts` — UUID + header propagation
- `packages/api/src/index.ts` — wired telemetry, /metrics, requestId middleware
- `packages/db/src/instrument.ts` — query duration histogram
- `packages/agents/orchestrator/src/index.ts` — span per stage
- `AGENTS.md` — new env vars documented
- `CHANGELOG.md` — entry under "Phase 2 / Observability"

## Test plan
- [x] pnpm build passes
- [x] pnpm test passes (including new telemetry/metrics/requestId suites)
- [x] GET /metrics returns prom format
- [x] OTEL_ENABLED=false yields no-op
- [x] x-request-id echoed on responses
- [x] AGENTS.md env var table updated
```

---

## Session 4 — Production Hardening (J-119)

**Goal.** Harden the API and MCP server for untrusted input, shared environments, and long-running production duty. This session is explicitly about *not* being a prototype anymore.

**Prerequisite.** J-118 merged (metrics + request IDs in place so hardening can emit metrics on throttles/validation failures).

**Out of scope.** SSO for the web app. Tenant isolation. Those are post-Phase-2.

### 4.1 Deliverables

#### 4.1.1 Env schema validation (`packages/core/src/env.ts` — new)

Create a single env schema using `zod`:
```typescript
export const ApiEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  API_PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(['development','test','production']).default('development'),
  LOG_LEVEL: z.enum(['debug','info','warn','error']).default('info'),
  ANTHROPIC_API_KEY: z.string().min(10),
  OTEL_ENABLED: z.coerce.boolean().default(false),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  METRICS_BEARER_TOKEN: z.string().min(16).optional(),
  RATE_LIMIT_RPM: z.coerce.number().int().positive().default(120),
  RATE_LIMIT_BURST: z.coerce.number().int().positive().default(30),
  CORS_ORIGINS: z.string().transform(s => s.split(',').map(x => x.trim()).filter(Boolean)).default('http://localhost:3002'),
  REQUEST_BODY_LIMIT_KB: z.coerce.number().int().positive().default(256),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
});

export type ApiEnv = z.infer<typeof ApiEnvSchema>;
export function loadApiEnv(source = process.env): ApiEnv { /* parse + friendly error */ }
```

Create parallel schemas: `McpEnvSchema`, `WebEnvSchema`. The `loadXxxEnv` function must print a clean human-readable error (no raw zod dump) and `process.exit(1)` on invalid env in production; in tests/dev it throws.

Replace all direct `process.env.X` reads in `packages/api/src/`, `packages/mcp-server/src/`, and `packages/agents/**/src/` with a single `env = loadApiEnv()` call at startup. Business logic receives `env` via argument or closure, never reads `process.env` directly.

#### 4.1.2 Rate limiting middleware (`packages/api/src/middleware/rateLimit.ts`)

In-memory token bucket per IP (since this is a single-instance deployment for now; Redis-backed limiter is a future toggle):
- `RATE_LIMIT_RPM` requests per minute, burst of `RATE_LIMIT_BURST`.
- Identify client by `X-Forwarded-For` (first IP) or `c.env.incoming.socket.remoteAddress`.
- Exempt `/api/health`, `/metrics`.
- On exceed: 429 with `Retry-After` header (seconds until next token), increment `closepilot_api_rate_limited_total{route}`.

#### 4.1.3 Request body size limit

Hono middleware that reads `Content-Length`, rejects with 413 if over `REQUEST_BODY_LIMIT_KB * 1024`. Applies to all POST/PUT/PATCH.

#### 4.1.4 Security headers

Middleware that sets on every response:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (only when `NODE_ENV=production`)
- `Content-Security-Policy: default-src 'self'` on the `/api` prefix (the web UI has its own CSP).

#### 4.1.5 CORS allowlist tightening

Replace whatever blanket-cors is in `packages/api/src/middleware/cors.ts` with a per-origin allowlist sourced from `env.CORS_ORIGINS`. On disallowed origin, return 403, not a silent no-CORS.

#### 4.1.6 Zod request validation

For every `POST`/`PATCH` route in `packages/api/src/routes/*.ts`:
- Define a Zod schema for the body in the same file.
- Use a `validate(schema)` helper (new, in `packages/api/src/lib/validate.ts`) that returns 400 with `{ error: 'validation_failed', issues: [...] }` on parse failure.
- The existing deal/approval/activity shapes must be preserved — only the validation layer is new.

#### 4.1.7 Graceful shutdown

In `packages/api/src/index.ts`:
- On `SIGTERM` or `SIGINT`: stop accepting new connections, wait up to `env.SHUTDOWN_TIMEOUT_MS` for in-flight requests, then `db.end()`, then `process.exit(0)`.
- If timeout elapses, force exit with code 1 and log `shutdown timed out`.

Same pattern in `packages/mcp-server/src/index.ts`:
- Close the health HTTP server first, then the MCP stdio transport.

#### 4.1.8 Secrets redaction in logs

Augment `packages/api/src/logger.ts`:
- Redact keys matching `/authorization|api[_-]?key|password|token|secret|cookie/i` before serialization — replace value with `"[REDACTED]"`.
- Add a unit test that logs `{ apiKey: 'sk-xxx', nested: { token: 'abc' } }` and asserts both are redacted.

### 4.2 Acceptance Criteria

- Invalid env (e.g., `DATABASE_URL=notaurl`) → API exits with `process.exit(1)` and a readable error listing the bad keys.
- 125 requests in 60 seconds from one IP (default `RATE_LIMIT_RPM=120`) → at least 5 return 429 with `Retry-After` header.
- POST `/api/deals` with body >256KB (default) → 413.
- GET `/api/health` → headers include `x-content-type-options: nosniff`, `x-frame-options: DENY`.
- Request from origin not in `CORS_ORIGINS` → 403.
- POST `/api/deals` with malformed JSON body → 400 with `{ error: 'validation_failed', issues: [...] }`.
- `kill -SIGTERM <pid>` on the running API → completes in-flight requests, closes DB, exits 0 within `SHUTDOWN_TIMEOUT_MS`.
- No `process.env.X` reads remain in `packages/api/src/**` outside `env.ts` / `telemetry.ts` bootstrap files (verify with `grep -RE "process\.env\." packages/api/src/ | grep -v 'env.ts\|telemetry.ts'` → empty).
- Log a payload containing `{ authorization: 'Bearer xxx' }` → output contains `[REDACTED]`, never the raw value.
- `pnpm build` and `pnpm test` pass.
- `AGENTS.md` "Environment Variables" updated with all new vars + defaults.

### 4.3 Tests

- `packages/core/src/__tests__/env.test.ts` (6 cases): valid env parses; invalid URL errors; coerces numbers from strings; defaults apply; production error exits; test/dev error throws.
- `packages/api/src/middleware/__tests__/rateLimit.test.ts` (4 cases): under limit passes; over limit 429; burst allowed; health/metrics exempt.
- `packages/api/src/middleware/__tests__/bodyLimit.test.ts` (2 cases): under limit passes; over limit 413.
- `packages/api/src/middleware/__tests__/cors.test.ts` (3 cases): allowed origin passes with CORS headers; disallowed origin 403; null origin handled.
- `packages/api/src/middleware/__tests__/securityHeaders.test.ts` (1 case): all headers present.
- `packages/api/src/lib/__tests__/validate.test.ts` (3 cases): valid body passes; invalid body 400; extra fields stripped.
- `packages/api/src/__tests__/logger.redact.test.ts` (2 cases): top-level redaction; deep nested redaction.
- `packages/api/src/__tests__/shutdown.test.ts` (2 cases): SIGTERM drains and exits 0; timeout forces exit 1.

### 4.4 Verification commands

```bash
pnpm install && pnpm build && pnpm test
# Env validation
DATABASE_URL=notaurl pnpm --filter @closepilot/api start 2>&1 | grep -i 'DATABASE_URL'
# Rate limit
for i in {1..150}; do curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3001/api/deals; done | sort | uniq -c
# Body limit
head -c 300000 /dev/urandom | base64 | curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:3001/api/deals -H 'content-type: application/json' --data-binary @-
# Security headers
curl -sD- http://localhost:3001/api/health | grep -iE 'x-(content-type|frame)-options'
# CORS
curl -sD- -H 'Origin: http://evil.example' http://localhost:3001/api/deals | grep -i '^HTTP/'
# Shutdown
kill -TERM $(pgrep -f 'node.*closepilot-api') && echo drained
# process.env grep (should be empty)
grep -RE "process\.env\." packages/api/src/ | grep -v 'env.ts\|telemetry.ts'
```

### 4.5 PR template

```markdown
## Summary
J-119 — Production hardening: env validation (zod), rate limiting, body size limit, security headers, CORS allowlist, request validation, graceful shutdown, secrets redaction.

## Changes
- `packages/core/src/env.ts` — ApiEnvSchema, McpEnvSchema, WebEnvSchema
- `packages/api/src/middleware/{rateLimit,bodyLimit,securityHeaders,cors}.ts`
- `packages/api/src/lib/validate.ts`
- `packages/api/src/index.ts` — wired hardening + SIGTERM handler
- `packages/mcp-server/src/index.ts` — SIGTERM handler
- `packages/api/src/logger.ts` — redaction
- `AGENTS.md`, `CHANGELOG.md`

## Test plan
- [x] env schema rejects invalid input with friendly error
- [x] 429 at 121st req/min
- [x] 413 on oversize body
- [x] security headers present
- [x] CORS allowlist enforced
- [x] zod request validation returns 400 with issues
- [x] SIGTERM drains cleanly
- [x] secrets redacted in logs
- [x] no process.env reads outside env.ts
```

---

## Session 5 — Production Deployment (J-120)

**Goal.** Make Closepilot deployable to a single cloud host with: GitHub Actions pipeline, versioned schema migrations, backup/restore, a runbook the operator can follow under duress, and health checks a platform can hook into.

**Prerequisites.** J-116, J-117, J-118, J-119 all merged.

**Deployment target.** Fly.io (primary) + Oracle Cloud Free Tier (alternative). Both documented. Pick Fly.io for the CI deploy workflow because it has the cleanest GHA story.

### 5.1 Deliverables

#### 5.1.1 Drizzle migrations (no more `db:push` in prod)

- Add `drizzle-kit generate` and `drizzle-kit migrate` scripts to `packages/db/package.json`:
  ```json
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:push": "drizzle-kit push"
  ```
- Create `packages/db/drizzle.config.ts` with `schema: 'src/schema.ts'`, `out: 'drizzle/'`, `dialect: 'postgresql'`, `dbCredentials: { url: process.env.DATABASE_URL! }`.
- Generate the initial baseline migration (`drizzle/0000_init.sql`) that matches the current deployed schema.
- Create a tiny migration runner at `packages/db/src/migrate.ts` that calls `drizzle-orm/node-postgres/migrator` `migrate(db, { migrationsFolder: './drizzle' })` and exits.
- Add `packages/db/package.json` script `migrate:run: node dist/migrate.js`.

#### 5.1.2 Fly.io deploy config

Create at repo root:
- `fly.api.toml` — app name `closepilot-api`, region `ord` (primary) + `iad` (standby), `[services]` on port 3001, `[http_service.concurrency] { type='requests', hard_limit=200, soft_limit=150 }`, `[[services.http_checks]]` against `/api/health` every 10s. Env: `NODE_ENV=production`, `LOG_LEVEL=info`, `OTEL_ENABLED=false` (operator opts in per-environment).
- `fly.web.toml` — app name `closepilot-web`, port 3002, `/api/health` proxy health check. NEXT_PUBLIC_API_URL as build arg.
- `fly.mcp.toml` — internal-only app (`internal_port=3000`), not publicly exposed. Health check `/health`.

Use the existing Dockerfiles — Fly autodetects them.

#### 5.1.3 GitHub Actions deploy pipeline

Create `.github/workflows/deploy.yml`:
- Trigger: push to `main` AND all of {test, type-check, docker-build, e2e} jobs in `ci.yml` succeed (use `workflow_run` with `conclusion == 'success'`).
- Steps:
  1. Checkout
  2. Install Fly CLI via `superfly/flyctl-actions/setup-flyctl@master`
  3. `flyctl deploy -c fly.api.toml --remote-only` with `FLY_API_TOKEN` secret
  4. `flyctl ssh console -c fly.api.toml --command 'node dist/migrate.js'` (run migration)
  5. `flyctl deploy -c fly.mcp.toml --remote-only`
  6. `flyctl deploy -c fly.web.toml --remote-only`
  7. Post-deploy smoke: `curl -f https://closepilot-api.fly.dev/api/health`
  8. On failure: post a Slack message if `SLACK_WEBHOOK_URL` secret set; mark deploy as failed.

Also add `.github/workflows/deploy-manual.yml` that takes a `ref` input and deploys on-demand (for emergency rollback).

#### 5.1.4 Backup & restore

- `scripts/backup.sh` — `pg_dump "$DATABASE_URL" | gzip > "backup-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"`.
- `scripts/restore.sh` — takes a `.sql.gz` file, runs `gunzip -c ... | psql "$DATABASE_URL"` with a confirmation prompt.
- Scheduled GHA cron at `.github/workflows/backup.yml` that runs nightly at 03:00 UTC, uploads to the repo's Actions artifact store with 30-day retention. (For production-grade retention, operator should swap to S3 — documented in the runbook.)

#### 5.1.5 Runbook at `docs/RUNBOOK.md`

Must cover:
- **Deploy**: push to main → how to watch the Actions run → how to verify prod health.
- **Rollback**: `flyctl releases list -a closepilot-api`, `flyctl releases rollback <n> -a closepilot-api`.
- **Hot migration**: how to generate a new migration (`pnpm --filter @closepilot/db db:generate`), review the SQL in `drizzle/`, merge, let CI apply it.
- **Emergency stop**: how to take the API offline (`flyctl scale count 0 -a closepilot-api`) and bring it back.
- **On-call triage checklist**: high latency → check `/metrics`; errors → check logs via `flyctl logs -a closepilot-api`; deal stuck → check activities + orchestrator spans.
- **Secrets rotation**: `flyctl secrets set X=newvalue -a closepilot-api` then deploy.
- **Disaster recovery**: full restore from backup (step-by-step).

This document is not prose-heavy — operator-under-pressure readable. Use fenced code blocks for every command.

#### 5.1.6 Staging environment

- `fly.api.staging.toml`, `fly.web.staging.toml`, `fly.mcp.staging.toml` — same configs, `staging` app suffix, `LOG_LEVEL=debug`, `OTEL_ENABLED=true`.
- Staging deploy job in `.github/workflows/deploy-staging.yml` triggered on pushes to `staging` branch.
- Runbook entry: how to promote from staging to prod.

#### 5.1.7 Version stamping

Expose build/deploy version in the API:
- `GET /api/version` → `{ version, gitSha, builtAt, node: process.version }`.
- `version` read from root `package.json`. `gitSha` injected via Docker build arg `GIT_SHA` (set in GHA from `$GITHUB_SHA`). `builtAt` set at build time.

### 5.2 Acceptance Criteria

- **Given** a push to `main` with passing CI, **when** the deploy workflow runs, **then** three Fly apps deploy in order (api → mcp → web), the migrate step runs, and the final smoke check passes.
- **Given** a bad deploy, **when** I run `flyctl releases rollback <n>`, **then** the previous image is serving traffic within 90 seconds.
- **Given** `drizzle/0000_init.sql` exists and matches the current schema, **when** I run `pnpm --filter @closepilot/db migrate:run` against a fresh DB, **then** all tables exist and `SELECT * FROM __drizzle_migrations` has one row.
- **Given** `GET /api/version`, **then** response is 200 with non-empty `version`, `gitSha` (40-char hex), `builtAt` (ISO 8601).
- **Given** a failed deploy, **when** `SLACK_WEBHOOK_URL` is set, **then** a Slack message is posted naming the workflow run and failing step.
- **Given** `scripts/backup.sh` runs, **then** a gzipped SQL file is produced and its size is > 1KB.
- **Given** `scripts/restore.sh backup.sql.gz` runs against a fresh DB, **then** the schema + data match the source DB (verify with `SELECT count(*) FROM deals`).
- `docs/RUNBOOK.md` has operator-executable code blocks for every listed scenario.
- Staging workflow is green on the `staging` branch.
- No committed `.env`, no secrets in `fly.*.toml` (only names, not values).
- `pnpm build`, `pnpm test`, `pnpm typecheck` still pass.

### 5.3 Tests

- `packages/db/src/__tests__/migrate.test.ts` (2 cases): migrator runs idempotently (second run no-ops); migrator fails cleanly on invalid DATABASE_URL.
- `packages/api/src/__tests__/version.test.ts` (1 case): `/api/version` returns expected shape.
- `docs/RUNBOOK.md` is included in a docs lint step (`.github/workflows/ci.yml` already has one or add markdownlint-cli2 if missing).

### 5.4 Verification commands

```bash
pnpm install && pnpm build && pnpm test
# Migration runner
DATABASE_URL=$TEST_DB_URL pnpm --filter @closepilot/db db:generate
DATABASE_URL=$TEST_DB_URL pnpm --filter @closepilot/db migrate:run
psql "$TEST_DB_URL" -c '\dt' | grep deals
psql "$TEST_DB_URL" -c 'SELECT * FROM __drizzle_migrations'
# Fly configs
flyctl doctor -c fly.api.toml && flyctl doctor -c fly.web.toml && flyctl doctor -c fly.mcp.toml
# Version endpoint
curl -s http://localhost:3001/api/version | jq .
# Backup/restore
./scripts/backup.sh && ls -lh backup-*.sql.gz
./scripts/restore.sh backup-*.sql.gz  # (on a test DB)
# Runbook markdown
npx markdownlint-cli2 docs/RUNBOOK.md
```

### 5.5 PR template

```markdown
## Summary
J-120 — Production deploy: Drizzle migrations, Fly.io configs for api/mcp/web, CI deploy pipeline, backup/restore, staging env, version endpoint, runbook.

## Changes
- `packages/db/drizzle.config.ts` + `drizzle/0000_init.sql` + `src/migrate.ts`
- `fly.{api,web,mcp}.toml` + `fly.{api,web,mcp}.staging.toml`
- `.github/workflows/{deploy,deploy-manual,deploy-staging,backup}.yml`
- `scripts/{backup,restore}.sh`
- `docs/RUNBOOK.md`
- `packages/api/src/routes/version.ts` + wiring
- `AGENTS.md`, `CHANGELOG.md`

## Test plan
- [x] drizzle baseline migration applies cleanly
- [x] migrate:run is idempotent
- [x] /api/version returns sha + builtAt
- [x] fly.*.toml pass flyctl doctor
- [x] deploy workflow runs on a test branch
- [x] backup.sh produces a restorable file
- [x] RUNBOOK.md passes markdownlint
- [x] staging deploy green

## Required GitHub secrets (operator to set)
- FLY_API_TOKEN
- SLACK_WEBHOOK_URL (optional)
```

---

## Execution Order & Parallelism

- **J-116** (in progress) → **J-117** (in progress): already dispatched, no action needed until PRs land.
- **J-118** (observability): depends on J-116 merged.
- **J-119** (hardening): depends on J-118 merged (consumes the metrics registry for rate-limit counters).
- **J-120** (deploy): depends on J-117 merged (E2E must be green before first prod deploy) AND J-119 (hardening before public exposure).

Parallelism opportunity: **J-118 and J-119 can be dispatched simultaneously** if the operator accepts minor merge conflicts in `packages/api/src/index.ts` — they touch the same file. Recommended: run J-118 first, merge, then J-119.

## What Is NOT in Phase 2

- Production dogfood with real Gmail credentials (manual operator step after J-120 merges).
- Slack/webhook alerting beyond deploy notifications.
- Real load testing against a scaled cluster.
- Multi-tenant isolation.
- Replacing the in-memory rate limiter with Redis.
- SSO or external identity provider integration.
- Grafana dashboard authoring.
