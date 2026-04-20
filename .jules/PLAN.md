1. **Create `packages/api/src/lib/errors.ts` and verify**
   - Create a new file `packages/api/src/lib/errors.ts`.
   - Implement `export function errorResponse(error: string, code?: string, details?: unknown) { return { error, code, details }; }`
   - Use `read_file` to verify the file was created and contents are correct.

2. **Update `packages/api/src/routes/deals.ts`**
   - Import `errorResponse` from `../lib/errors.js`.
   - Remove the old `errorResponse` helper at line 72.
   - Update `dealStageUpdateSchema` to use `z.nativeEnum(DealStage)` for the `stage` field instead of `z.enum(['ingestion', ...])`.
   - Update `listDealsQuerySchema` to use `z.nativeEnum(DealStage)` for the `stage` field instead of `z.enum(['ingestion', ...])`.
   - In `/stage/:stage` route handler (line 136), replace the `validStages` array `['ingestion', 'enrichment', 'scoping', 'proposal', 'crm_sync', 'completed', 'failed']` with `Object.values(DealStage)`.
   - Add explicit return types to all route handlers (e.g. `async (c): Promise<Response> =>`).
   - Update all usages of `c.json(errorResponse(...), 500)` to match the new `errorResponse` signature `errorResponse('...', undefined, ...)`.

3. **Update `packages/api/src/routes/approvals.ts`**
   - Import `errorResponse` from `../lib/errors.js`.
   - Add explicit return types to all route handlers (`Promise<Response>`).
   - Update all inline error responses (e.g. `c.json({ error: '...' }, 400)`) to `c.json(errorResponse('...'), 400)`.

4. **Update `packages/api/src/routes/activities.ts`**
   - Import `errorResponse` from `../lib/errors.js`.
   - Add explicit return types to all route handlers (`Promise<Response>`).
   - Update all inline error responses (e.g. `c.json({ error: '...' }, 400)`) to `c.json(errorResponse('...'), 400)`.
   - In the `POST /api/activities` route handler (lines 137-144), replace the `{ error: 'Missing required fields', required: [...] }` shape with `errorResponse('Missing required fields', undefined, { required: [...] })`.

5. **Update `packages/api/src/routes/deals.test.ts`**
   - Replace literal stages with enum values in tests: e.g. `'ingestion'` to `DealStage.INGESTION` in `http://localhost/api/deals/stage/ingestion` using template literals `http://localhost/api/deals/stage/${DealStage.INGESTION}`.
   - Replace literal `'scoping'` with `DealStage.SCOPING` in test payloads.
   - Replace literal `'failed'` with `DealStage.FAILED`.
   - Add a specific test in `deals.test.ts` to assert that error responses follow the new `{ error, code, details }` normalized structure.

6. **Verify and Hardening**
   - Run `pnpm typecheck` and `pnpm test` in `packages/api`.

7. **Pre-commit Checks**
   - Complete pre commit steps to make sure proper testing, verifications, reviews and reflections are done.
