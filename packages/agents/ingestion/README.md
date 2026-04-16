# agents/ingestion

The first agent in the Closepilot pipeline. Monitors Gmail for incoming lead emails, classifies them with Claude AI, extracts structured lead data, and creates deals in the deal store.

## Status

✅ Complete — email classification, lead extraction, Gmail polling, and deal creation all implemented.

## What it does

```
Gmail Inbox
    │
    ▼ (poll every 5 min)
EmailClassifier (Claude AI)
    │
    ├─── Not a lead → skip
    │
    └─── Lead email
             │
             ▼
         LeadExtractor (Claude AI)
             │
             ▼
         Deal created in store
             │
             ▼
         Activity logged
```

## Components

### `GmailMonitor`
Polls Gmail on a configurable interval (default: 5 minutes). Tracks processed message IDs to avoid duplicates. Exposes stats: emails processed, leads found, deals created, errors, last run time.

### `EmailClassifier`
Sends email content to Claude (`claude-3-5-sonnet`) and classifies whether it's a genuine B2B service inquiry. Returns:
- `isLead: boolean`
- `confidence: number` (0–1)
- `reason: string`
- `extractedContext: EmailContext`

Only emails with confidence > 0.7 proceed to lead extraction.

### `LeadExtractor`
Takes a classified email and extracts structured data:
- Lead name, email, company, phone, role
- Project description and requirement signals
- Budget range and timeline indicators
- Lead quality score (0–100)

## Usage

```typescript
import { startIngestionAgent } from './src/index';

await startIngestionAgent({
  pollIntervalMs: 5 * 60 * 1000,
  mcpServerPath: '../mcp-server/dist/index.js',
});
```

Or run directly:

```bash
pnpm dev    # tsx watch src/index.ts
```

## Configuration

```env
ANTHROPIC_API_KEY=
GOOGLE_ACCESS_TOKEN=
GOOGLE_REFRESH_TOKEN=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
DATABASE_URL=
```

## Testing

```bash
pnpm test   # vitest
```
