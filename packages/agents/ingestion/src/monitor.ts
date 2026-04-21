import { CronJob } from 'cron';
import type { EmailMessage } from '@closepilot/core';
import { GmailTools, DealStoreTools } from '@closepilot/mcp-client';
import { DealStage } from '@closepilot/core';
import { EmailClassifier } from './email-classifier';
import { LeadExtractor } from './lead-extractor';

/**
 * Configuration for the ingestion monitor
 */
export interface MonitorConfig {
  anthropicApiKey: string;
  pollIntervalMinutes?: number; // Default: 5 minutes
  gmailQuery?: string; // Gmail search query to filter emails
  processUnreadOnly?: boolean; // Default: true
  maxEmailsPerBatch?: number; // Default: 20
}

/**
 * Processing statistics
 */
export interface ProcessingStats {
  emailsProcessed: number;
  leadsFound: number;
  dealsCreated: number;
  errors: number;
  lastRunTime: Date;
}

/**
 * Gmail Monitor
 * Polls Gmail for new emails and processes them into deals
 */
export class GmailMonitor {
  private classifier: EmailClassifier;
  private extractor: LeadExtractor;
  private gmailTools: GmailTools;
  private dealStoreTools: DealStoreTools;
  private cronJob: CronJob | null = null;
  private isRunning = false;
  private stats: ProcessingStats = {
    emailsProcessed: 0,
    leadsFound: 0,
    dealsCreated: 0,
    errors: 0,
    lastRunTime: new Date(),
  };

  // Track processed emails to avoid duplicates
  private processedEmailIds = new Set<string>();

  constructor(
    gmailTools: GmailTools,
    dealStoreTools: DealStoreTools,
    config: MonitorConfig
  ) {
    this.classifier = new EmailClassifier({ anthropicApiKey: config.anthropicApiKey });
    this.extractor = new LeadExtractor(this.classifier);
    this.gmailTools = gmailTools;
    this.dealStoreTools = dealStoreTools;
  }

  /**
   * Start the monitoring process
   */
  start(pollIntervalMinutes = 5): void {
    if (this.isRunning) {
      console.log('Monitor is already running');
      return;
    }

    console.log(`Starting Gmail monitor (polling every ${pollIntervalMinutes} minutes)`);

    // Create cron job: run every N minutes
    const cronPattern = `*/${pollIntervalMinutes} * * * *`;
    this.cronJob = new CronJob(
      cronPattern,
      () => this.processNewEmails(),
      null,
      true,
      null,
      null,
      true // Run immediately on start
    );

    this.isRunning = true;
    console.log('Gmail monitor started successfully');
  }

  /**
   * Stop the monitoring process
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('Monitor is not running');
      return;
    }

    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }

    this.isRunning = false;
    console.log('Gmail monitor stopped');
  }

  /**
   * Process new emails from Gmail
   */
  private async processNewEmails(): Promise<void> {
    if (this.isRunning) {
      console.log('Already processing emails, skipping this cycle');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log('Starting email processing cycle...');

      // Get recent threads
      const { threads } = await this.gmailTools.getRecentThreads(20);
      console.log(`Found ${threads.length} recent threads`);

      // Extract unique email IDs
      const emailsToProcess = this.extractUnprocessedEmails(threads);
      console.log(`Processing ${emailsToProcess.length} new emails`);

      // Process each email
      for (const email of emailsToProcess) {
        await this.processEmail(email);
      }

      const duration = Date.now() - startTime;
      this.stats.lastRunTime = new Date();
      console.log(`Email processing cycle completed in ${duration}ms`);
      this.logStats();
    } catch (error) {
      console.error('Error processing emails:', error);
      this.stats.errors++;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Extract unprocessed emails from threads
   */
  private extractUnprocessedEmails(threads: any[]): EmailMessage[] {
    const emails: EmailMessage[] = [];

    for (const thread of threads) {
      for (const message of thread.messages || []) {
        if (!this.processedEmailIds.has(message.id)) {
          emails.push(message);
          this.processedEmailIds.add(message.id);
        }
      }
    }

    return emails;
  }

  /**
   * Process a single email
   */
  private async processEmail(email: EmailMessage): Promise<void> {
    try {
      console.log(`Processing email: ${email.subject} from ${email.from.email}`);
      this.stats.emailsProcessed++;

      // Classify email
      const classification = await this.classifier.classifyEmail(email);

      if (!classification.isLeadInquiry) {
        console.log(`Email not classified as lead inquiry (confidence: ${classification.confidence})`);
        return;
      }

      console.log(`Email classified as lead inquiry (confidence: ${classification.confidence})`);
      this.stats.leadsFound++;

      // Extract lead information
      const lead = await this.extractor.extractLead(email);

      if (!lead || !this.extractor.validateLead(lead)) {
        console.log('Failed to extract valid lead information');
        return;
      }

      // Check if deal already exists for this thread
      const existingDeals = await this.dealStoreTools.queryDealsByDateRange(
        new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        new Date()
      );

      const duplicate = existingDeals.find((d: any) => d.threadId === lead.threadId);
      if (duplicate) {
        console.log(`Deal already exists for thread ${lead.threadId}, skipping`);
        return;
      }

      // Create deal
      const dealInput = this.extractor.toDealInput(lead);
      const deal = await this.dealStoreTools.createDeal(dealInput);

      // Update deal stage to enrichment
      await this.dealStoreTools.updateDealStage(
        deal.id,
        DealStage.ENRICHMENT,
        'Lead inquiry processed by Ingestion Agent'
      );

      // Extract and store initial context
      const context = await this.classifier.extractInitialContext(email);

      // TODO: Log activity when DealStore has logEvent method
      console.log(`[INGESTION] Lead inquiry received from ${lead.name} (${lead.email}). Company: ${lead.company || 'N/A'}. Urgency: ${lead.urgency}. Requirements: ${lead.requirements?.join(', ') || 'None specified'}`);

      this.stats.dealsCreated++;
      console.log(`Successfully created deal ${deal.id} for lead ${lead.name}`);
    } catch (error) {
      console.error(`Error processing email ${email.id}:`, error);
      this.stats.errors++;
    }
  }

  /**
   * Get current statistics
   */
  getStats(): ProcessingStats {
    return { ...this.stats };
  }

  /**
   * Log current statistics
   */
  private logStats(): void {
    console.log('--- Processing Statistics ---');
    console.log(`Emails processed: ${this.stats.emailsProcessed}`);
    console.log(`Leads found: ${this.stats.leadsFound}`);
    console.log(`Deals created: ${this.stats.dealsCreated}`);
    console.log(`Errors: ${this.stats.errors}`);
    console.log(`Last run: ${this.stats.lastRunTime.toISOString()}`);
    console.log('-----------------------------');
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      emailsProcessed: 0,
      leadsFound: 0,
      dealsCreated: 0,
      errors: 0,
      lastRunTime: new Date(),
    };
  }

  /**
   * Get processed email IDs
   */
  getProcessedEmailIds(): Set<string> {
    return new Set(this.processedEmailIds);
  }

  /**
   * Clear processed email IDs (for testing or reset)
   */
  clearProcessedEmails(): void {
    this.processedEmailIds.clear();
  }
}

/**
 * Factory function to create a Gmail monitor
 */
export function createGmailMonitor(
  gmailTools: GmailTools,
  dealStoreTools: DealStoreTools,
  config: MonitorConfig
): GmailMonitor {
  return new GmailMonitor(gmailTools, dealStoreTools, config);
}
