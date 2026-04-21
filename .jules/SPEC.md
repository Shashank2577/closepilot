# Track 3 — Enterprise RBAC & Security Spec

## 3.1 Role & Permission Types
File: `packages/core/src/types/rbac.ts`
Definitions: `UserRole` enum (`ADMIN`, `MANAGER`, `REP`), `AuthUser` interface.
Export from `packages/core/src/index.ts`.

## 3.2 Database Schema
File: `packages/db/src/schema/users.ts`
Tables: `organizations` and `users`.
Changes: Add `orgId` to `deals` in `packages/db/src/schema/deals.ts`.
Export from `packages/db/src/schema/index.ts` and `packages/db/src/index.ts`.

## 3.3 Auth Middleware
File: `packages/api/src/middleware/auth.ts`
Package: add `jose` to `packages/api/package.json`.
Implement `authMiddleware` and `requireRole` guard factory.

## 3.4 Protect Existing Routes
File: `packages/api/src/routes/deals.ts`
Apply `requireRole([UserRole.ADMIN, UserRole.MANAGER])` to the DELETE route.

## 3.5 UI Access Control Hook
Files: `packages/web/lib/auth/roles.ts`, `packages/web/lib/auth/UserContext.tsx`
Create `useRBAC` hook and `UserContext` provider.

## 3.6 Apply RBAC in UI
File: `packages/web/components/deals/DealModal.tsx` or similar.
Look for a delete button (or add one if it doesn't exist) and wrap it with `useRBAC(UserRole.MANAGER)`.

## 3.7 Tests
File: `packages/api/src/middleware/auth.test.ts`
Write required test cases for `authMiddleware` and `requireRole`.
