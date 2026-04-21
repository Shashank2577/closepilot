FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

# ── Dependency install ─────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
COPY tsconfig.base.json ./
COPY packages/core/package.json ./packages/core/
COPY packages/web/package.json ./packages/web/

RUN pnpm install --frozen-lockfile --filter "@closepilot/web..."

# ── Build ──────────────────────────────────────────────────────────────────
FROM deps AS builder
WORKDIR /app

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

COPY packages/core/ ./packages/core/
COPY packages/web/ ./packages/web/

RUN pnpm --filter "@closepilot/core" build && \
    pnpm --filter "@closepilot/web" build

# ── Runtime ────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ARG GIT_SHA
ARG BUILT_AT
ENV GIT_SHA=${GIT_SHA} BUILT_AT=${BUILT_AT} NODE_ENV=production

# Next.js standalone output
COPY --from=builder /app/packages/web/.next/standalone ./
COPY --from=builder /app/packages/web/.next/static ./packages/web/.next/static
COPY --from=builder /app/packages/web/public ./packages/web/public

EXPOSE 3002
ENV PORT=3002
CMD ["node", "packages/web/server.js"]
