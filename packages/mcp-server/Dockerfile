FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ── Build Stage ─────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

# Copy all files
COPY . .

# Install all workspace dependencies
RUN pnpm install --frozen-lockfile

# ── Runtime Stage ───────────────────────────────────────────────────────────
FROM base AS runner
RUN apk add --no-cache tini curl
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 closepilot

# Copy everything from builder
COPY --from=builder /app .

RUN chown -R closepilot:nodejs /app
USER closepilot

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["npx", "tsx", "packages/mcp-server/src/index.ts"]
