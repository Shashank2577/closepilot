# Closepilot Ingestion Agent

Autonomous agent that monitors Gmail for new B2B lead inquiries and automatically creates deals in the Closepilot system.

## Overview

The Ingestion Agent is the first step in the Closepilot deal flow pipeline. It continuously monitors your Gmail inbox, identifies potential B2B lead inquiries using AI, and automatically creates deals in the system for further processing.

## Features

- **Gmail Monitoring**: Polls Gmail every 5 minutes (configurable) for new emails
- **AI-Powered Classification**: Uses Claude AI to classify emails as lead inquiries vs. non-leads
- **Lead Information Extraction**: Automatically extracts:
  - Contact name and email
  - Company name
  - Job title
  - Initial requirements
  - Budget mentions
  - Timeline mentions
  - Urgency level
- **Deal Creation**: Automatically creates deals in the database
- **Stage Management**: Sets deal stage to 'enrichment' for handoff to the next agent
- **Audit Logging**: Logs all activities for complete traceability
- **Duplicate Prevention**: Tracks processed emails to avoid creating duplicate deals

## Installation

```bash
pnpm install
```

## Configuration

The agent requires the following environment variables:

```bash
# Required
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Optional
POLL_INTERVAL_MINUTES=5  # Default: 5
GMAIL_QUERY=is:unread    # Gmail search query to filter emails
```

## Usage

### Start the Agent

```bash
# Build the package
pnpm build

# Start the agent
pnpm start
```

### Programmatic Usage

```typescript
import { startIngestionAgent } from '@closepilot/agents-ingestion';

const monitor = await startIngestionAgent({
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  pollIntervalMinutes: 5,
  gmailQuery: 'is:unread',
});

// Get processing statistics
const stats = monitor.getStats();
console.log('Emails processed:', stats.emailsProcessed);
console.log('Deals created:', stats.dealsCreated);

// Stop the agent
monitor.stop();
```

### Using Individual Components

```typescript
import {
  EmailClassifier,
  LeadExtractor,
  createEmailClassifier,
  createLeadExtractor,
} from '@closepilot/agents-ingestion';

// Create classifier
const classifier = createEmailClassifier({
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
});

// Classify an email
const result = await classifier.classifyEmail(emailMessage);
console.log('Is lead inquiry:', result.isLeadInquiry);
console.log('Confidence:', result.confidence);

// Extract lead information
const extractor = createLeadExtractor(classifier);
const lead = await extractor.extractLead(emailMessage);
console.log('Lead name:', lead.name);
console.log('Lead company:', lead.company);
```

## Architecture

### Components

1. **EmailClassifier** (`email-classifier.ts`)
   - Uses Claude AI to classify emails
   - Extracts lead information
   - Determines context and urgency

2. **LeadExtractor** (`lead-extractor.ts`)
   - Transforms classified emails into structured lead data
   - Validates lead information
   - Scores lead quality

3. **GmailMonitor** (`monitor.ts`)
   - Orchestrates the monitoring loop
   - Manages cron-based polling
   - Tracks processing statistics
   - Prevents duplicate processing

### Data Flow

```
Gmail → New Email → Classifier → Lead? → Extractor → Deal Store → Deal Created
                              ↓
                           Non-Lead → Skip
```

### Integration Points

- **Gmail MCP Tools** (J-102): Fetches emails and threads
- **Deal Store MCP Tools** (J-101): Creates and manages deals
- **Claude API**: Powers classification and extraction

## Monitoring

The agent provides real-time statistics:

```typescript
const stats = monitor.getStats();
// {
//   emailsProcessed: 150,
//   leadsFound: 25,
//   dealsCreated: 25,
//   errors: 2,
//   lastRunTime: Date
// }
```

Logs are output to console with details about:
- Emails processed
- Classification results
- Deal creation status
- Errors and warnings

## Error Handling

The agent handles errors gracefully:
- Classification failures: Emails are skipped with logged error
- Extraction failures: Emails are marked as invalid leads
- Deal creation failures: Logged but don't stop processing
- Network errors: Automatic retry on next poll cycle

## Development

```bash
# Watch mode for development
pnpm dev

# Type checking
pnpm typecheck

# Build
pnpm build
```

## Testing

```bash
# Run tests
pnpm test
```

## Dependencies

- `@closepilot/core`: Type definitions
- `@closepilot/mcp-client`: MCP client for Gmail and Deal Store
- `@anthropic-ai/sdk`: Claude API client
- `cron`: Task scheduling

## Future Enhancements

- [ ] Support for multiple email inboxes
- [ ] Custom classification rules
- [ ] Webhook notifications for new deals
- [ ] Dashboard for monitoring and stats
- [ ] Integration with other email providers
- [ ] Advanced lead scoring
- [ ] Custom extraction templates

## License

MIT

## Contributing

This is part of the Closepilot monorepo. Please follow the main project's contribution guidelines.
