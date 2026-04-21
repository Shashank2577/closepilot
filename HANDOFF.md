# Handoff Document: Closepilot Phase 2

## Current Status
- **Last Session Focus**: Session 4 — Production Hardening (J-119).
- **Status**: **Completed**. All hardening measures specified in `CLOSEPILOT-PHASE2-SPEC.md` are implemented, tested, and verified.
- **Current Branch**: `feat/dev-setup-port-fixes` (Note: Hardening changes were applied here; suggest merging before starting the next session).

## Accomplishments (J-119)
1.  **Environment Validation**:
    *   Centralized schema-based validation in `packages/core/src/env.ts` using Zod.
    *   Covers API, MCP, Web, and Agent environment variables.
    *   Ensures fail-fast behavior on startup with descriptive error messages.
2.  **API Hardening**:
    *   **Rate Limiting**: Per-IP token bucket middleware (120 RPM / 30 burst) with `Retry-After` headers.
    *   **Body Limits**: Enforced 256KB request body limit.
    *   **Security Headers**: Added HSTS, CSP, X-Frame-Options, and X-Content-Type-Options.
    *   **CORS**: Tightened to validated `CORS_ORIGINS` from environment.
3.  **Observability & Reliability**:
    *   **Graceful Shutdown**: SIGTERM/SIGINT handlers in API and MCP servers for clean exit (draining connections, closing DB pools).
    *   **Log Redaction**: Automatic masking of sensitive fields (keys, tokens, passwords) in all log outputs.
    *   **Metrics**: Wired up `dealsCreatedTotal` and `approvalsResolvedTotal` metrics in the API.
4.  **UI Verification**:
    *   Fixed a bug in `ApprovalList.tsx` where it was using relative paths instead of `NEXT_PUBLIC_API_URL`.
    *   Verified the Dashboard and Approval Queue using `gstack` with real deal/approval data.

## Next Session: Session 5 — Production Deployment (J-120)
The primary goal is to get the system ready for a live production environment.

### Immediate Tasks:
- [ ] **Dockerization**: Refine `Dockerfile`s for production (multi-stage builds, non-root users).
- [ ] **Fly.io Configuration**: Create `fly.toml` for API, MCP, and Web services.
- [ ] **Migrations**: Set up a robust path for production database migrations using `drizzle-kit`.
- [ ] **CI/CD**: Finalize the GitHub Actions pipeline (`.github/workflows/ci.yml`) to run tests and auto-deploy to Fly.io on main branch pushes.
- [ ] **Runbook**: Create `docs/RUNBOOK.md` covering deployment, scaling, secrets management, and recovery.

## Technical Notes
*   **Environment Sync**: For local development, ensure `.env` is copied to `packages/api/.env` and `packages/mcp-server/.env` if `tsx` is run from those subdirectories.
*   **Database**: Use `pnpm db:push` for development schema updates. Production will transition to migrations in J-120.
*   **Ports**: Local defaults are API (3003), Web (3002), and MCP (3000 stdio/health).

## Known Issues
*   The UI icons appear oversized in some headless browser views (Tailwind/SVG rendering issue), but the application logic and data binding are fully functional.
