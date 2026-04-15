# Closepilot - Parallel Jules Development

This document provides quick access for Jules AI agents to begin parallel development work on Closepilot.

## Quick Start for Jules Agents

Each Jules agent should:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Shashank2577/closepilot.git
   cd closepilot
   ```

2. **Run setup:**
   ```bash
   ./scripts/setup.sh
   ```

3. **Create your feature branch:**
   ```bash
   git checkout -b jules/J-XXX-feature-name
   ```

4. **Implement your assigned feature:**
   - Read the foundation design document
   - Follow type definitions in `@closepilot/core`
   - Use mock utilities for testing
   - Write tests as you go

5. **Submit PR:**
   ```bash
   git add .
   git commit -m "feat: implement [your feature]"
   git push origin jules/J-XXX-feature-name
   gh pr create --title "[J-XXX] Brief description" --body "See docs/JULES_WORKFLOW.md"
   ```

## Session Assignments

| Session | Feature | Branch Pattern | Files to Modify |
|---------|---------|----------------|-----------------|
| J-101 | Deal Store MCP Tools | `jules/J-101-deal-store-tools` | `packages/mcp-server/src/tools/deal-store.ts`, `packages/db/src/queries/*.ts` |
| J-102 | Gmail Integration | `jules/J-102-gmail-integration` | `packages/mcp-server/src/tools/gmail.ts`, `packages/mcp-client/src/tools/gmail.ts` |
| J-103 | Calendar Integration | `jules/J-103-calendar-integration` | `packages/mcp-server/src/tools/calendar.ts`, `packages/mcp-client/src/tools/calendar.ts` |
| J-104 | Drive Integration | `jules/J-104-drive-integration` | `packages/mcp-server/src/tools/drive.ts`, `packages/mcp-client/src/tools/drive.ts` |
| J-105 | Ingestion Agent | `jules/J-105-ingestion-agent` | `packages/agents/ingestion/` |
| J-106 | Enrichment Agent | `jules/J-106-enrichment-agent` | `packages/agents/enrichment/` |
| J-107 | Scoping Agent | `jules/J-107-scoping-agent` | `packages/agents/scoping/` |
| J-108 | Proposal Agent | `jules/J-108-proposal-agent` | `packages/agents/proposal/` |
| J-109 | CRM Sync Agent | `jules/J-109-crm-sync-agent` | `packages/agents/crm-sync/` |
| J-110 | Orchestrator Agent | `jules/J-110-orchestrator-agent` | `packages/agents/orchestrator/` |
| J-111 | API Endpoints | `jules/J-111-api-endpoints` | `packages/api/src/routes/*.ts` |
| J-112 | Web UI Components | `jules/J-112-web-ui` | `packages/web/app/`, `packages/web/components/` |
| J-113 | Authentication Flow | `jules/J-113-auth-flow` | `packages/web/app/auth/` |
| J-114 | Approval Queue UI | `jules/J-114-approval-queue` | `packages/web/app/approvals/` |
| J-115 | Activity Streaming | `jules/J-115-activity-streaming` | `packages/api/src/routes/activities.ts`, `packages/web/components/activity/` |

## Key Resources

- **Foundation Design**: `docs/superpowers/specs/2026-04-15-closepilot-foundation-design.md`
- **Jules Workflow**: `docs/JULES_WORKFLOW.md`
- **Type Definitions**: `packages/core/src/types/`
- **Mock Utilities**: `packages/mcp-client/src/mocks.ts`

## Testing

Use mock utilities to test without real MCP server:

```typescript
import { createMockDealStoreClient } from '@closepilot/mcp-client';

const client = await createMockDealStoreClient();
// Test your implementation
```

## No Conflicts Guaranteed

The file ownership matrix ensures zero conflicts between Jules sessions. Each session has exclusive ownership over its assigned files.

## Progress Tracking

- Monitor PRs: https://github.com/Shashank2577/closepilot/pulls
- CI/CD status: https://github.com/Shashank2577/closepilot/actions

Let's build Closepilot together! 🚀
