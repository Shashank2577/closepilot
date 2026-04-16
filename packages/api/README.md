# @closepilot/api

Hono-based REST API that the Next.js web UI calls to read and write deal data. Agents do not use this API — they use the MCP server directly.

## Status

✅ Complete — all routes implemented for deals, activities, and approvals.

## Endpoints

### Deals

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/deals` | List all deals, optional `?stage=` filter |
| `GET` | `/api/deals/:id` | Get a single deal |
| `POST` | `/api/deals` | Create a deal |
| `PUT` | `/api/deals/:id` | Update a deal |
| `DELETE` | `/api/deals/:id` | Delete a deal |

### Activities

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/activities` | List recent activities across all deals |
| `GET` | `/api/activities/stream` | SSE stream of real-time agent activities |
| `GET` | `/api/activities/:dealId` | Activities for a specific deal |
| `POST` | `/api/activities` | Log an activity |

### Approvals

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/approvals/pending` | List all pending approvals |
| `POST` | `/api/approvals/:id/approve` | Approve a request |
| `POST` | `/api/approvals/:id/reject` | Reject a request with a reason |

## Activity streaming

The `/api/activities/stream` endpoint uses Server-Sent Events (SSE) to push real-time agent activity to the web UI. It maintains a 30-second heartbeat to keep connections alive.

```typescript
// Client-side usage
const source = new EventSource('/api/activities/stream');
source.onmessage = (event) => {
  const activity = JSON.parse(event.data);
  // update UI
};
```

## Running

```bash
pnpm dev    # tsx watch — hot reload on port 3001
pnpm build  # tsc
pnpm test   # vitest
```

## Environment

```env
DATABASE_URL=postgresql://localhost:5432/closepilot
PORT=3001
```
