1. **Schema Updates**
   - Modify `packages/db/src/schema/deals.ts` to convert `companyResearch`, `prospectResearch`, `projectScope`, and `proposal` from `text` to `jsonb`.
   - Add GIN indexes for `companyResearch` and `prospectResearch` to the `deals` table.

2. **Query Refactoring**
   - Modify `packages/db/src/queries/deals.ts`:
     - Refactor `getDealStats` to use a SQL-level `GROUP BY` and `COUNT` query via Drizzle, instead of an in-memory loop.
     - Implement pagination logic correctly in `getDeals` based on the work order instructions. (Wait, work order says: "Implement it with proper pagination support: parameters offset and limit, return deals array with total count". I need to modify `getDeals` to return total count as well).

3. **Vitest Tests**
   - Update `packages/db/src/queries/__tests__/deals.test.ts` to test the new SQL logic for `getDealStats` and pagination for `getDeals`.

4. **Verify & Push DB**
   - Set up a dummy database in the sandbox using Docker so `pnpm db:push` will work.
   - Run `pnpm typecheck` and `pnpm test` for the workspace to ensure zero errors.

5. **Pre-commit Instructions**
   - Run pre-commit instructions before submitting.
