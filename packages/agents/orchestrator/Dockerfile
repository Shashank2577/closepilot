FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

# ── Dependency install ─────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
COPY tsconfig.base.json ./
COPY packages/core/package.json ./packages/core/
COPY packages/db/package.json ./packages/db/
COPY packages/mcp-client/package.json ./packages/mcp-client/
COPY packages/agents/orchestrator/package.json ./packages/agents/orchestrator/
COPY packages/agents/ingestion/package.json ./packages/agents/ingestion/ 2>/dev/null || true
COPY packages/agents/enrichment/package.json ./packages/agents/enrichment/ 2>/dev/null || true
COPY packages/agents/scoping/package.json ./packages/agents/scoping/ 2>/dev/null || true
COPY packages/agents/proposal/package.json ./packages/agents/proposal/ 2>/dev/null || true
COPY packages/agents/crm-sync/package.json ./packages/agents/crm-sync/ 2>/dev/null || true

RUN pnpm install --frozen-lockfile --filter "@closepilot/orchestrator..."

# ── Build ──────────────────────────────────────────────────────────────────
FROM deps AS builder
WORKDIR /app

COPY packages/core/ ./packages/core/
COPY packages/db/ ./packages/db/
COPY packages/mcp-client/ ./packages/mcp-client/
COPY packages/agents/ ./packages/agents/

RUN pnpm --filter "@closepilot/core" build && \
    pnpm --filter "@closepilot/db" build && \
    pnpm --filter "@closepilot/mcp-client" build && \
    pnpm --filter "@closepilot/orchestrator..." build

# ── Runtime ────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ARG GIT_SHA
ARG BUILT_AT
ENV GIT_SHA=${GIT_SHA}
ENV BUILT_AT=${BUILT_AT}
ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml* ./

# Copy built dist artifacts for each package
COPY --from=builder /app/packages/core/package.json ./packages/core/
COPY --from=builder /app/packages/core/dist/ ./packages/core/dist/
COPY --from=builder /app/packages/db/package.json ./packages/db/
COPY --from=builder /app/packages/db/dist/ ./packages/db/dist/
COPY --from=builder /app/packages/mcp-client/package.json ./packages/mcp-client/
COPY --from=builder /app/packages/mcp-client/dist/ ./packages/mcp-client/dist/
COPY --from=builder /app/packages/agents/ ./packages/agents/

RUN pnpm install --prod --frozen-lockfile --filter "@closepilot/orchestrator..."

CMD ["node", "packages/agents/orchestrator/dist/worker.js"]
