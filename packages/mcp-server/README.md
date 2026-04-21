# @closepilot/mcp-server

The MCP (Model Context Protocol) server that exposes the Closepilot deal store and Google service integrations as tools for AI agents. All agents in the pipeline communicate exclusively through this server — they never touch the database or external APIs directly.

## Status

✅ Complete — 50+ tools across four categories, stdio transport, production-ready.

## What it exposes

### Deal Store tools
CRUD operations and queries on the PostgreSQL deal database:

| Tool | Description |
|------|-------------|
| `create_deal` | Create a new deal from a lead |
| `get_deal` | Fetch a deal by ID |
| `list_deals` | List deals with optional stage filter |
| `update_deal` | Update deal fields (stage, enrichment, proposal, etc.) |
| `delete_deal` | Delete a deal |
| `query_deals_by_stage` | Get all deals in a specific pipeline stage |
| `create_activity` | Log an agent action to the audit trail |
| `get_activities` | Fetch activity history for a deal |
| `create_approval` | Request human approval for a deal action |
| `get_pending_approvals` | List approvals awaiting response |

### Gmail tools
| Tool | Description |
|------|-------------|
| `search_emails` | Search Gmail with a query string |
| `get_thread` | Fetch a full email thread |
| `get_message` | Fetch a single email message |
| `send_email` | Send an email |
| `extract_email_context` | Use AI to extract structured context from an email thread |
| `watch_emails` | Set up Gmail push notifications |
| `get_recent_threads` | Fetch recent threads for polling |

### Google Calendar tools
| Tool | Description |
|------|-------------|
| `create_calendar_event` | Create an event with optional Google Meet link |
| `get_calendar_event` | Fetch an event by ID |
| `update_calendar_event` | Update event details |
| `delete_calendar_event` | Delete an event |
| `check_availability` | Check free/busy for attendees across a time window |
| `list_upcoming_events` | List events in a date range |
| `find_available_slots` | Find open time slots for all attendees |
| `schedule_meeting` | Schedule a meeting from a list of proposed times |

### Google Drive tools
| Tool | Description |
|------|-------------|
| `list_templates` | List available document templates |
| `get_template` | Fetch a template by ID |
| `generate_document` | Generate a document from a template with data |
| `get_document` | Fetch a document by ID |
| `update_document_status` | Update a document's status |
| `create_folder` | Create a Drive folder |
| `list_folder` | List folder contents |
| `copy_document` | Copy a document to a new location |
| `share_document` | Share a document with specified emails |
| `get_drive_download_url` | Get a download URL for a document |

## Architecture

The server runs as a stdio MCP process. Agents connect via `@closepilot/mcp-client` which spawns this process and communicates over stdin/stdout.

```
Agent process
    │
    │ spawn + stdio
    ▼
mcp-server (this package)
    │
    ├── @closepilot/db      (Deal Store reads/writes)
    ├── googleapis          (Gmail, Calendar, Drive)
    └── Anthropic SDK       (email context extraction)
```

## Running

```bash
# Development (watch mode)
pnpm dev

# Production
node dist/index.js
```

## Testing

```bash
pnpm test   # vitest — runs drive, gmail, calendar, deal-store test suites
```

## Environment

```env
DATABASE_URL=

# Google OAuth tokens (per-user, from web auth flow)
GOOGLE_ACCESS_TOKEN=
GOOGLE_REFRESH_TOKEN=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Google Service Account (for Drive/Docs server operations)
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
```
