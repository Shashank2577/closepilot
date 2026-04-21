# @closepilot/mcp-client

Client-side wrappers around the MCP tools exposed by `@closepilot/mcp-server`. Agents import from this package to interact with the deal store and Google services without knowing about the underlying MCP protocol.

## Status

✅ Complete — typed wrappers for all 50+ server tools.

## What's in here

### `DealStoreTools`
The primary interface agents use to read and write deal data:

```typescript
import { DealStoreTools } from '@closepilot/mcp-client';

const tools = new DealStoreTools(mcpClient);

await tools.createDeal({ leadEmail: 'cto@acme.com', ... });
await tools.updateDeal(dealId, { stage: DealStage.ENRICHMENT });
await tools.createActivity(dealId, { agentType: 'ingestion', description: '...' });
await tools.createApproval(dealId, { approverEmail: 'owner@myco.com', ... });
```

### `GmailTools`
```typescript
import { GmailTools } from '@closepilot/mcp-client';

const gmail = new GmailTools(mcpClient);

const threads = await gmail.getRecentThreads(20);
const context = await gmail.extractEmailContext(threadId);
await gmail.sendEmail({ to: '...', subject: '...', body: '...' });
```

### `CalendarTools`
```typescript
import { CalendarTools } from '@closepilot/mcp-client';

const cal = new CalendarTools(mcpClient);

const slots = await cal.findAvailableSlots({ attendees, windowStart, windowEnd, duration });
await cal.scheduleMeeting({ title, attendees, proposedTimes });
```

### `DriveTools`
```typescript
import { DriveTools } from '@closepilot/mcp-client';

const drive = new DriveTools(mcpClient);

const doc = await drive.generateDocument({ templateId, data });
await drive.shareDocument(docId, ['client@acme.com'], 'reader');
```

## Usage in agents

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { DealStoreTools, GmailTools } from '@closepilot/mcp-client';

const transport = new StdioClientTransport({
  command: 'node',
  args: ['../../mcp-server/dist/index.js'],
});

const client = new Client({ name: 'my-agent', version: '1.0.0' }, { capabilities: {} });
await client.connect(transport);

const dealTools = new DealStoreTools(client);
const gmailTools = new GmailTools(client);
```

## Build

```bash
pnpm build   # tsc
pnpm test    # vitest
```
