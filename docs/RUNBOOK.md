# Closepilot Operator Runbook

This runbook provides actionable, copy-pasteable commands for operators managing the Closepilot infrastructure under duress.

*Note: Fly.io app names are globally unique. If deployment fails because the app names (`closepilot-api`, `closepilot-web`, `closepilot-mcp`) are taken, the operator must choose unique alternatives and manually update `app = "..."` at the top of all `fly.*.toml` files before proceeding.*

## Deploy

Pushes to the `main` branch with passing CI will automatically trigger the deployment pipeline to Fly.io.

### Watch Deployments
```bash
flyctl status -a closepilot-api
flyctl status -a closepilot-web
flyctl status -a closepilot-mcp
```

### Verify Deployment
```bash
curl -f https://closepilot-api.fly.dev/api/version
curl -f https://closepilot-api.fly.dev/api/health
```

## Rollback

### List Releases
```bash
flyctl releases list -a closepilot-api
```

### Rollback to specific release
```bash
flyctl releases rollback <n> -a closepilot-api
flyctl releases rollback <n> -a closepilot-web
flyctl releases rollback <n> -a closepilot-mcp
```

### Verify Rollback
```bash
curl -f https://closepilot-api.fly.dev/api/version
```

## Hot migration

### 1. Generate Migration Locally
```bash
pnpm --filter @closepilot/db db:generate
```

### 2. Review SQL
```bash
cat packages/db/drizzle/*
```

### 3. Emergency Manual Run
```bash
flyctl ssh console -c fly.api.toml --command 'node dist/migrate.js'
```

## Emergency stop

### Scale Down to Zero
```bash
flyctl scale count 0 -a closepilot-api
flyctl scale count 0 -a closepilot-mcp
flyctl scale count 0 -a closepilot-web
```

### Restart Service
```bash
flyctl scale count 1 -a closepilot-api
flyctl scale count 1 -a closepilot-mcp
flyctl scale count 1 -a closepilot-web
```

## On-call triage checklist

### High Latency
```bash
curl -f https://closepilot-api.fly.dev/metrics | grep closepilot_api_request_duration_seconds
```

### Errors
```bash
flyctl logs -a closepilot-api | grep ERROR
```

### Stuck Deal
```bash
curl -f https://closepilot-api.fly.dev/api/activities?dealId=X
```

## Secrets rotation

### Set Secret
```bash
flyctl secrets set KEY=value -a closepilot-api
```

### Deploy to Apply
```bash
flyctl deploy -c fly.api.toml --remote-only
```

## Disaster recovery

### 1. Download Backup
Download the latest backup artifact from GitHub Actions.

### 2. Restore Database
```bash
export DATABASE_URL="postgresql://user:password@hostname:5432/dbname"
./scripts/restore.sh backup-YYYYMMDDTHHMMSSZ.sql.gz
```

### 3. Verify Restoration
```bash
psql "$DATABASE_URL" -c "SELECT count(*) FROM deals;"
```
