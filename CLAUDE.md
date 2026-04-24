# Closepilot — Claude Instructions

## Handoff System

**Always read the project handoff before starting any work.**

Handoffs live inside this repo at:
```
.handoffs/project.md          ← persistent context: stack, arch, decisions (read this first)
.handoffs/handoff-YYYY-MM-DD.md  ← today's state: what's happening, next steps, session log
```

If today's file doesn't exist, read the most recent one in `.handoffs/`.

Use the `close-handoff` skill at the end of every session. It writes to `.handoffs/` in this repo (not to a shared vault file).

## Project Context

Closepilot is an autonomous B2B deal flow engine. See `.handoffs/project.md` for:
- Full tech stack (TS, Hono, Next.js 15, BullMQ, Drizzle, PostgreSQL 16 + pgvector, Redis, Fly.io)
- Package structure (11 packages — which are real vs fake vs empty)
- Active phases (Sprint A is next)
- Persistent architectural decisions

## Key Shortcuts

- API: `pnpm api:dev` (port 3001)
- Web: `pnpm web:dev` (port 3003)
- Worker: `pnpm --filter orchestrator dev`
- Docker infra: `docker compose up -d` (Postgres:5432, Redis:6379)
- Production spec: `docs/PRODUCTION-SPEC.md`
- Honest status: `docs/STATUS.md`
