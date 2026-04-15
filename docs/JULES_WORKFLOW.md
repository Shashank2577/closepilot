# Closepilot Jules Workflow

This document describes the parallel development workflow using Google Jules AI agents for implementing Closepilot features.

## Overview

Closepilot uses 15 parallel Jules sessions to implement features simultaneously. Each session works on an isolated feature branch, following the file ownership matrix to avoid conflicts.

## File Ownership Matrix

Each Jules session has exclusive ownership over specific files:

| Session | Feature | Files Owned |
|---------|---------|-------------|
| J-101 | Deal Store MCP Tools | `packages/mcp-server/src/tools/deal-store.ts`, `packages/db/src/queries/*.ts` |
| J-102 | Gmail Integration | `packages/mcp-server/src/tools/gmail.ts`, `packages/mcp-client/src/tools/gmail.ts` |
| J-103 | Calendar Integration | `packages/mcp-server/src/tools/calendar.ts`, `packages/mcp-client/src/tools/calendar.ts` |
| J-104 | Drive Integration | `packages/mcp-server/src/tools/drive.ts`, `packages/mcp-client/src/tools/drive.ts` |
| J-105 | Ingestion Agent | `packages/agents/ingestion/` |
| J-106 | Enrichment Agent | `packages/agents/enrichment/` |
| J-107 | Scoping Agent | `packages/agents/scoping/` |
| J-108 | Proposal Agent | `packages/agents/proposal/` |
| J-109 | CRM Sync Agent | `packages/agents/crm-sync/` |
| J-110 | Orchestrator Agent | `packages/agents/orchestrator/` |
| J-111 | API Endpoints | `packages/api/src/routes/*.ts` |
| J-112 | Web UI Components | `packages/web/app/`, `packages/web/components/` |
| J-113 | Authentication Flow | `packages/web/app/auth/` |
| J-114 | Approval Queue UI | `packages/web/app/approvals/` |
| J-115 | Activity Streaming | `packages/api/src/routes/activities.ts`, `packages/web/components/activity/` |

## Development Workflow

### 1. Setup

Each Jules session starts by:

```bash
# Clone the repository
git clone <repository-url>
cd closepilot

# Run setup script
./scripts/setup.sh

# Create feature branch
git checkout -b jules/J-XXX-feature-name
```

### 2. Implementation

- Read the foundation design document: `docs/superpowers/specs/2026-04-15-closepilot-foundation-design.md`
- Implement the assigned feature following the type definitions in `@closepilot/core`
- Use the mock utilities in `@closepilot/mcp-client/src/mocks.ts` for testing
- Write tests for the implementation
- Update documentation as needed

### 3. Testing

Before submitting a PR:

```bash
# Run all tests
./scripts/test-all.sh

# Run linting
./scripts/lint-all.sh

# Build all packages
./scripts/build-all.sh
```

### 4. Pull Request

Create a PR with:

- Title: `[J-XXX] Brief description of changes`
- Description: Include what was implemented and how to test it
- Labels: `jules`, `J-XXX`, feature-specific labels
- Assignees: Code owners for the modified files

### 5. Review and Merge

- Code owners review the PR
- Tests must pass
- No conflicts with other PRs (enforced by file ownership matrix)
- After approval, merge to `main` branch

## Integration Points

### Shared Types

All agents use type definitions from `@closepilot/core`:
- `Deal`, `DealStage`, `DealInput`
- `AgentInput`, `AgentOutput`, `AgentHandoff`
- Service-specific types (Gmail, Calendar, Drive)

### MCP Client

Agents use `@closepilot/mcp-client` to interact with the Deal Store:
- `DealStoreClient` for database operations
- `GmailTools` for email operations
- `CalendarTools` for scheduling
- `DriveTools` for documents

### Mock Utilities

Use `MockDealStoreClient` for testing without real MCP server:

```typescript
import { createMockDealStoreClient } from '@closepilot/mcp-client';

const client = await createMockDealStoreClient();
// Test your implementation
```

## Communication

Agents coordinate through:
- **Approval Queue**: Human approval required for critical actions
- **Stage Transitions**: Handoff between agents via deal stage updates
- **Activity Logs**: Track all agent actions in database

## Success Criteria

Each Jules session is successful when:
1. All assigned files are implemented
2. Tests pass (including integration tests with mock MCP client)
3. Code follows TypeScript best practices
4. Documentation is updated
5. PR is approved by code owners

## Next Steps

After all 15 Jules sessions complete:
1. Integration testing across all features
2. End-to-end testing with real MCP server
3. Performance testing
4. Security audit
5. Production deployment

## Questions?

Refer to:
- Foundation design: `docs/superpowers/specs/2026-04-15-closepilot-foundation-design.md`
- Technical specification: `CLOSEPILOT-TECHNICAL-SPEC.md`
- Type definitions: `packages/core/src/types/`
