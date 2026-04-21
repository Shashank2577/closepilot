# Closepilot Operations Runbook

This document provides instructions for deploying, scaling, and maintaining the Closepilot system in a production environment.

## Architecture Overview
Closepilot consists of four main components:
- **PostgreSQL Database**: Persistent storage for deals, activities, and approvals.
- **API Server (Hono)**: REST API for the web UI and external integrations.
- **MCP Server**: Tool gateway for AI agents to interact with Google services and the database.
- **Web UI (Next.js)**: Dashboard for managing deal flows and approvals.

## Deployment Procedure

### 1. Database Migrations
Migrations are managed using `drizzle-kit`. Before deploying new code, ensure migrations are generated and applied.

```bash
# Generate new migrations if schema changed
pnpm --filter @closepilot/db db:migrate

# Apply migrations to production (on Fly.io or RDS)
# This is usually done in the CI/CD pipeline or as a pre-deploy hook
pnpm --filter @closepilot/db db:push 
```

### 2. Docker Images
Images are built using multi-stage builds and run as non-root users.

```bash
# Build all images
docker compose build
```

### 3. Fly.io Deployment
Each service is deployed to Fly.io using its own `fly.toml` configuration.

```bash
# Deploy API
fly deploy --config packages/api/fly.toml

# Deploy Web
fly deploy --config packages/web/fly.toml

# Deploy MCP Server
fly deploy --config packages/mcp-server/fly.toml
```

## Scaling
- **Horizontal Scaling**: All services are stateless (except for the database) and can be scaled horizontally by increasing the `count` in Fly.io.
- **Database Scaling**: Vertical scaling via Fly.io machine sizes or migrating to a managed service like AWS RDS.

## Secrets Management
All sensitive configuration must be managed via Fly.io secrets or a dedicated secrets manager.

**Required Secrets:**
- `DATABASE_URL`: Connection string for PostgreSQL.
- `GOOGLE_CLIENT_ID`: OAuth client ID.
- `GOOGLE_CLIENT_SECRET`: OAuth client secret.
- `GOOGLE_REFRESH_TOKEN`: System-level refresh token for agents.
- `ANTHROPIC_API_KEY`: API key for Claude.
- `NEXT_PUBLIC_API_URL`: Public URL of the API server (for Web UI).

```bash
# Set a secret
fly secrets set KEY=VALUE
```

## Monitoring & Health Checks
- **Health Checks**: All services expose a `/health` endpoint. Docker and Fly.io are configured to restart containers if health checks fail.
- **Logs**: Structured logs are redacted for sensitive information. View logs using `fly logs`.
- **Metrics**: Prometheus metrics are available on the API server.

## Recovery Procedures
- **Database Backup**: Periodic backups are handled by the database provider.
- **Rollback**: To rollback a deployment on Fly.io:
  ```bash
  fly releases rollback
  ```
