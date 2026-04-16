FROM node:20-alpine AS base
RUN npm install -g pnpm@8

# ── Install all workspace deps ──────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/core/package.json   packages/core/package.json
COPY packages/web/package.json    packages/web/package.json
RUN pnpm install --frozen-lockfile

# ── Build ───────────────────────────────────────────────────────────────────
FROM deps AS builder
WORKDIR /app
COPY packages/core   packages/core
COPY packages/web    packages/web

# Build args for public env vars baked into the Next.js bundle
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN pnpm --filter @closepilot/core build
RUN pnpm --filter @closepilot/web  build

# ── Runtime (Next.js standalone) ────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy standalone output
COPY --from=builder /app/packages/web/.next/standalone ./
COPY --from=builder /app/packages/web/.next/static     ./packages/web/.next/static
COPY --from=builder /app/packages/web/public           ./packages/web/public

EXPOSE 3002
ENV PORT=3002
ENV HOSTNAME=0.0.0.0
CMD ["node", "packages/web/server.js"]
