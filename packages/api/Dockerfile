FROM node:20-alpine AS base
RUN npm install -g pnpm@8

# ── Install all workspace deps ──────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/core/package.json         packages/core/package.json
COPY packages/db/package.json           packages/db/package.json
COPY packages/api/package.json          packages/api/package.json
RUN pnpm install --frozen-lockfile

# ── Build ───────────────────────────────────────────────────────────────────
FROM deps AS builder
WORKDIR /app
COPY packages/core   packages/core
COPY packages/db     packages/db
COPY packages/api    packages/api
RUN pnpm --filter @closepilot/core build
RUN pnpm --filter @closepilot/db   build
RUN pnpm --filter @closepilot/api  build

# Deploy to a clean directory with only production deps
RUN pnpm --filter @closepilot/api deploy --prod /deploy

# ── Runtime ─────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /deploy .
EXPOSE 3001
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
