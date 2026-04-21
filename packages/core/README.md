# @closepilot/core

Shared TypeScript type definitions for the entire Closepilot deal lifecycle. Every other package in the monorepo imports from here — no business logic, just types.

## Status

✅ Complete — all types defined and used across the monorepo.

## What's in here

### Deal types (`types/deal.ts`)

The central `DealStage` enum that drives the entire pipeline:

```
ingestion → enrichment → scoping → proposal → crm_sync → completed
                                                        ↘ failed
```

Key interfaces:
- `Deal` — the core entity with all lifecycle fields
- `DealInput` — create/update input shape
- `CompanyResearch` — enrichment output (funding, industry, tech stack, etc.)
- `ProspectResearch` — contact-level research (role, LinkedIn, pain points)
- `ProjectScope` — scoping output (requirements, complexity, timeline, budget)
- `Requirement` — individual extracted requirement
- `Proposal` — full proposal structure with line items and pricing
- `PricingBreakdown` — itemised cost breakdown

### Agent types (`types/agent.ts`)

Communication contracts between the orchestrator and individual agents:

- `AgentInput<TContext>` — typed input wrapper with deal reference and context
- `AgentOutput<TData>` — typed output wrapper with success flag, next stage, and approval requirements
- `AgentType` — enum of all agent identifiers

### Integration types

- `types/gmail.ts` — `EmailMessage`, `EmailContext`, `Thread`, `GmailLabel`
- `types/calendar.ts` — `CalendarEvent`, `MeetingInput`, `TimeSlot`, `MeetingSuggestion`, `AvailabilityCheck`
- `types/drive.ts` — `DriveDocument`, `DocumentTemplate`, `GeneratedDocument`

## Usage

```typescript
import { DealStage, Deal, Proposal } from '@closepilot/core';

const deal: Deal = {
  id: 'deal-123',
  stage: DealStage.SCOPING,
  leadEmail: 'cto@acme.com',
  // ...
};
```

## Build

```bash
pnpm build   # tsc
```

No runtime dependencies — only `zod` for schema validation utilities.
