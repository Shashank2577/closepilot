# Implementation Log
1. Created RBAC types in `packages/core/src/types/rbac.ts` and exported in `packages/core/src/index.ts`.
2. Created schema in `packages/db/src/schema/users.ts` and added `orgId` to `deals.ts`.
3. Added AuthMiddleware and requireRole in `packages/api/src/middleware/auth.ts`. Created `packages/api/src/types.ts`.
4. Protected API Route for `DELETE /api/deals/:id`. Fixed API test to include JWT.
5. Added Web Hooks in `packages/web/lib/auth/roles.ts` and `UserContext.tsx`.
6. Modified `DealModal.tsx` to use hook and restrict visibility of delete button.
