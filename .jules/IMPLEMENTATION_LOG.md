# Implementation Log - Track 4: Asynchronous Orchestration

## MCP Transport
Currently, agents use stdio MCP transport. For workers running in background processes, they continue using stdio.
Future improvement: Consider implementing SSE transport for distributed workers to allow scaling across multiple machines.

## Redis Connection
A singleton Redis connection is used for BullMQ, configured with `maxRetriesPerRequest: null` as required by BullMQ.

## Job Types
Jobs are defined as a discriminated union: 'RunIngestion' | 'RunEnrichment' | 'RunScoping' | 'RunProposal' | 'RunCRMSync'.
DealId is passed as string to maintain consistency with the Deal entity in @closepilot/core (which uses UUID strings). Although the work order suggested 'number', using string avoids type mismatches across the system.

## Orchestrator Refactor
The orchestrator now enqueues jobs to BullMQ instead of calling agents directly.
It transitions the deal to the target stage immediately after enqueueing, as it hands off the execution to the worker.

## Worker Implementation
The worker process listens for jobs and dispatches them to the appropriate agent.
It now correctly fetches the deal context using `DealStoreTools` before invoking agent methods.
The worker handles:
- **Ingestion**: Calls `startIngestionAgent`.
- **Enrichment**: Instantiates `EnrichmentAgent` and calls `process()`.
- **Scoping**: Instantiates `ScopingAgent` and calls `processDeal()`.
- **Proposal**: Instantiates `ProposalAgent` and calls `process()`.
- **CRM Sync**: Instantiates `CRMSyncAgent` and calls `processDeal()`.

## Dependencies
The `@closepilot/orchestrator` package.json has been updated with the necessary workspace dependencies for all agents to ensure proper module resolution in the monorepo.

## Fixed Issues
- Fixed a type error in `agent-dispatcher.ts` where `durationMs` was missing from `AgentOutput`.
- Fixed existing orchestrator tests that were failing due to the change in execution model.
