# J-W1-DB Optimization Spec

1. **Schema Upgrades**:
   - `packages/db/src/schema/deals.ts`
   - Convert `companyResearch`, `prospectResearch`, `projectScope`, and `proposal` from `text` to `jsonb`.
   - Add GIN indexes for `companyResearch` and `prospectResearch`.
   - Ensure to run `pnpm db:push` to generate/apply migrations to development schema.

2. **Queries**:
   - `packages/db/src/queries/deals.ts`
   - `getDealStats`: Refactor to use SQL `GROUP BY` and `COUNT`.
   - `getDeals`: Ensure pagination uses `limit` and `offset`, and modify it to return both the deals array and the total count. Update the return type appropriately (e.g. `{ items: Deal[], total: number }`).

3. **Tests**:
   - `packages/db/src/queries/__tests__/deals.test.ts`
   - Update tests for `getDealStats` to expect the SQL-based logic.
   - Update tests for `getDeals` to expect the total count.
   - Validate with `pnpm test` and `pnpm typecheck`.

4. **API**:
   - The route using `getDeals` (`packages/api/src/routes/deals.ts`) will naturally serialize the updated return object containing the count. (Or we'll adjust the API to match).
