/**
 * Closepilot Ingestion Agent
 *
 * Monitors Gmail for new B2B lead inquiries and automatically creates deals in the system.
 *
 * Responsibilities:
 * - Polls Gmail every 5 minutes for new emails
 * - Classifies emails using Claude AI to identify lead inquiries
 * - Extracts lead information (name, email, company, title)
 * - Creates deals in the database
 * - Extracts initial context (requirements, budget, timeline, urgency)
 * - Sets deal stage to 'enrichment' for next agent
 * - Logs all activities for audit trail
 *
 * Usage:
 * ```typescript
 * import { startIngestionAgent } from '@closepilot/agents-ingestion';
 * import { secrets } from '@closepilot/core';
 *
 * await startIngestionAgent({
 *   anthropicApiKey: secrets.getAnthropicKey(),
 *   pollIntervalMinutes: 5,
 * });
 * ```
 */

// Export main components
export { EmailClassifier, createEmailClassifier } from './email-classifier.js';
export { LeadExtractor, createLeadExtractor } from './lead-extractor.js';
export { GmailMonitor, createGmailMonitor } from './monitor.js';

// Export types
export type { ClassifierConfig, ClassificationResult } from './email-classifier.js';
export type { ExtractedLead } from './lead-extractor.js';
export type { MonitorConfig, ProcessingStats } from './monitor.js';

import { GmailMonitor, createGmailMonitor } from './monitor.js';
import { GmailTools, DealStoreTools, DealStoreClient } from '@closepilot/mcp-client';
import { secrets } from '@closepilot/core';

/**
 * Start the Ingestion Agent
 *
 * @param config - Configuration for the agent
 * @returns The monitor instance for control (stop/start/getStats)
 */
export async function startIngestionAgent(config: {
  anthropicApiKey: string;
  pollIntervalMinutes?: number;
  gmailQuery?: string;
  processUnreadOnly?: boolean;
  maxEmailsPerBatch?: number;
  mcpServerCommand?: string;
}): Promise<GmailMonitor> {
  // Validate required environment
  if (!config.anthropicApiKey) {
    throw new Error('ANTHROPIC_API_KEY is required');
  }

  // Initialize MCP clients
  const dealStoreClient = new DealStoreClient(config.mcpServerCommand);
  await dealStoreClient.connect();

  // Create tool wrappers
  const gmailTools = new GmailTools(dealStoreClient);
  const dealStoreTools = new DealStoreTools(dealStoreClient);

  // Create and start monitor
  const monitor = createGmailMonitor(gmailTools, dealStoreTools, {
    anthropicApiKey: config.anthropicApiKey,
    pollIntervalMinutes: config.pollIntervalMinutes || 5,
    gmailQuery: config.gmailQuery,
    processUnreadOnly: config.processUnreadOnly !== false,
    maxEmailsPerBatch: config.maxEmailsPerBatch || 20,
  });

  monitor.start(config.pollIntervalMinutes || 5);

  console.log('Closepilot Ingestion Agent started successfully');
  console.log('Monitoring Gmail for new lead inquiries...');

  return monitor;
}

/**
 * CLI entry point
 */
export async function main(): Promise<void> {
  try {
    const anthropicApiKey = secrets.getAnthropicKey();

    const pollInterval = parseInt(process.env.POLL_INTERVAL_MINUTES || '5', 10);
    const gmailQuery = process.env.GMAIL_QUERY;

    const monitor = await startIngestionAgent({
      anthropicApiKey,
      pollIntervalMinutes: pollInterval,
      gmailQuery,
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\nShutting down Ingestion Agent...');
      monitor.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\nShutting down Ingestion Agent...');
      monitor.stop();
      process.exit(0);
    });

    // Keep process running
    console.log('Press Ctrl+C to stop the agent');
  } catch (error) {
    console.error('Failed to start Ingestion Agent:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}
