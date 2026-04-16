# agents/orchestrator

The coordination layer for the Closepilot pipeline. Watches the deal store for deals in each stage, dispatches them to the appropriate agent, handles errors and retries, manages the approval gates, and ensures nothing falls through the cracks.

## Status

✅ Complete — pipeline coordination, approval management, error handling, and stage transitions implemented.

## What it does

The orchestrator runs as a long-lived process and drives the entire pipeline:

```
                    ┌──────────────────────────┐
                    │        Orchestrator       │
                    │                          │
   Poll DB ────────►│  ingestion stage deals    │────► Ingestion agent
                    │  enrichment stage deals   │────► Enrichment agent
                    │  scoping stage deals      │────► Scoping agent
                    │  proposal stage deals     │────► Proposal agent
                    │  crm_sync stage deals     │────► CRM Sync agent
                    │                          │
                    │  pending approvals        │────► Notify human
                    │                          │
                    │  error recovery           │────► Retry / escalate
                    └──────────────────────────┘
```

## Key responsibilities

### Stage polling
Every N seconds, queries the deal store for deals in each actionable stage and dispatches them to the appropriate agent. Prevents double-processing with in-memory locks.

### Approval management
- Watches for pending approvals
- Sends notifications (email or webhook) to the configured approver
- Blocks stage advancement until approval is received
- Times out stale approvals and escalates

### Error handling
- Catches agent failures and logs them as activities
- Retries transient failures with exponential backoff
- After max retries, moves deal to `FAILED` stage with error context
- Alerts configured channel on repeated failures

### Activity logging
Every agent invocation, approval request, stage transition, and error is written to the activities table for full auditability.

## Configuration

```typescript
interface OrchestratorConfig {
  pollIntervalMs: number;     // How often to check for work (default: 30s)
  maxRetries: number;         // Per-deal retry limit (default: 3)
  approverEmail: string;      // Who gets approval notifications
  notificationWebhook?: string; // Optional Slack/webhook URL
}
```

## Running

```bash
pnpm dev    # tsx watch src/index.ts — starts the orchestration loop
pnpm test   # vitest
```

## Environment

```env
ANTHROPIC_API_KEY=
DATABASE_URL=
APPROVER_EMAIL=owner@mycompany.com
NOTIFICATION_WEBHOOK=https://hooks.slack.com/...
```
