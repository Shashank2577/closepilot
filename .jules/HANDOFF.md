# Track 3 — Enterprise RBAC & Security (Handoff)
Successfully implemented all aspects of the RBAC and Security track.
- Added `UserRole` and `AuthUser` to `@closepilot/core`.
- Defined schema for users and orgs, linking them to deals in `@closepilot/db`.
- Created JWT-based `authMiddleware` and `requireRole` in `@closepilot/api`.
- Protected the DELETE deal route.
- Set up a React `UserContext` and a generic `useRBAC` hook for Next.js app in `@closepilot/web`.
- Implemented view restriction on `DealModal.tsx` delete button utilizing RBAC hook.
