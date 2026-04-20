# Technical Specification: J-W1-API-DEFS

## Objective
Enforce strict typing and consistency in the API layer in `@closepilot/api` by replacing raw string literals with the `DealStage` enum, updating Zod schemas to use `z.nativeEnum`, normalizing error responses, ensuring explicit return types for route handlers, and updating tests.

## Changes Required

### 1. Error Normalization (`packages/api/src/lib/errors.ts`)
Create a new file `packages/api/src/lib/errors.ts` to hold a helper function `errorResponse`.
The normalized error structure should be:
```typescript
{ error: string, code?: string, details?: unknown }
```

### 2. Replace String Literals & Update Zod Schemas (`packages/api/src/routes/deals.ts`, `approvals.ts`, `activities.ts`)
- Import `DealStage` from `@closepilot/core`.
- Update `dealStageUpdateSchema` and `listDealsQuerySchema` in `deals.ts` to use `z.nativeEnum(DealStage)`.
- Replace string comparisons like `stage === 'ingestion'` or `stage: 'failed'` with `DealStage` enum values (e.g. `DealStage.INGESTION`, `DealStage.FAILED`). Note that `DealStage` members are uppercase but the values are lowercase (e.g. `DealStage.INGESTION` = `'ingestion'`). So when the work order says `DealStage.Ingestion`, it means `DealStage.INGESTION` based on the enum definition. Wait, let me double check the enum definition in `@closepilot/core/src/types/deal.ts`:
```typescript
export enum DealStage {
  INGESTION = 'ingestion',
  ENRICHMENT = 'enrichment',
  SCOPING = 'scoping',
  PROPOSAL = 'proposal',
  CRM_SYNC = 'crm_sync',
  COMPLETED = 'completed',
  FAILED = 'failed',
}
```
Yes, the members are uppercase. The work order mentioned `DealStage.Ingestion`, but I will use the actual enum members `DealStage.INGESTION`, etc.

### 3. Normalize Error Responses Across Routes
- Import the new `errorResponse` helper in `deals.ts`, `approvals.ts`, and `activities.ts`.
- Replace all ad-hoc error responses like `c.json({ error: '...' })` or `errorResponse(message, status, details)` with the new normalized structure. Note: the old `errorResponse` in `deals.ts` returned an object which didn't necessarily match the new `{ error, code, details }` exact structure (it was just returning an object). The new helper will just return the object `{ error, code, details }` and we will do `c.json(errorResponse(...), status)`.
Wait, Hono's `c.json` takes the payload and the status. So `errorResponse(message: string, code?: string, details?: unknown)` is perfect. We can do `c.json(errorResponse('Msg', 'CODE', details), 400)`.

### 4. Explicit TypeScript Return Types
- Ensure all route handlers in `deals.ts`, `approvals.ts`, and `activities.ts` have explicit return types. Since they return Hono Responses, we can use `Response` or `Promise<Response>` or let Hono infer, but the requirement is "explicit TypeScript return types". We will type them as `async (c): Promise<Response> => { ... }`.
Actually, Hono's `Context` handles response types. We'll add `Promise<Response>` to the handlers.

### 5. Vitest Tests (`packages/api/src/routes/deals.test.ts`)
- Update existing tests to use `DealStage` enum instead of strings.
- Add tests to ensure invalid stage values are rejected by the Zod schema.
- Test that error responses follow the normalized structure.
