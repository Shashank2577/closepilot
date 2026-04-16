# @closepilot/web

Next.js 15 web application — the human-facing control panel for the Closepilot pipeline. Used for reviewing deals, approving agent actions, and monitoring the real-time activity stream.

## Status

✅ Complete — all pages and components built, Google OAuth working, activity streaming live.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard — deal pipeline stats and recent activity |
| `/deals/[id]` | Deal detail view with full timeline |
| `/approvals` | Approval queue — review and act on pending agent requests |
| `/auth/signin` | Google OAuth sign-in |
| `/auth/callback` | OAuth callback handler |
| `/auth/refresh` | Token refresh endpoint |
| `/auth/logout` | Sign-out handler |
| `/api/user` | Current user info API route |

## Key components

### Deal management
- **`KanbanBoard`** — drag-and-drop deal board across pipeline stages using `@dnd-kit`
- **`DealCard`** — compact deal card with stage badge, company, and lead info
- **`DealModal`** — full deal detail panel with proposal preview and enrichment data
- **`DealStats`** — pipeline summary metrics (total, by stage, conversion rate)

### Approvals
- **`ApprovalList`** — table of all pending approvals with deal context
- **`ApprovalModal`** — review modal with approve / reject actions and comment field
- **`ApprovalBadge`** — inline status badge (`pending` / `approved` / `rejected`)
- **`ApprovalHistory`** — past approval decisions with timestamps

### Activity stream
- **`ActivityFeed`** — paginated list of agent activities across all deals
- **`ActivityTimeline`** — per-deal chronological activity view
- **`ActivityItem`** — single activity entry with agent icon, description, and relative time
- **`useActivityStream`** — React hook connecting to the SSE endpoint for real-time updates

### Auth
- **`AuthNav`** — top-nav auth state: shows sign-in button or user menu
- **`UserMenu`** — avatar dropdown with email and sign-out
- **`TokenRefresher`** — background component that silently refreshes Google OAuth tokens

## Authentication

Uses Google OAuth 2.0 with server-side session cookies. The flow:

1. User clicks Sign In → `/auth/signin` redirects to Google consent screen
2. Google redirects to `/auth/callback` with an auth code
3. Callback exchanges code for access + refresh tokens, sets `HttpOnly` cookies
4. `TokenRefresher` component polls `/auth/refresh` to keep tokens alive
5. Middleware protects all non-auth routes; unauthenticated users are redirected

## Real-time activity

The `useActivityStream` hook connects to `/api/activities/stream` via the browser's `EventSource` API. It:
- Reconnects automatically on disconnect
- Shows a live connection indicator dot in the UI
- Prepends new activities to the feed without polling

## Running

```bash
pnpm dev    # next dev → port 3002
pnpm build  # next build
pnpm test   # vitest + @testing-library
```

## Environment

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3002/auth/callback
SESSION_SECRET=
```
