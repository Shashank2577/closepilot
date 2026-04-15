import type {
  EmailMessage,
  Thread,
  GmailQuery,
  EmailContext,
} from '@closepilot/core';
import { DealStoreClient } from '../client.js';

/**
 * Gmail MCP Tools
 * Typed wrappers for Gmail operations
 */
export class GmailTools {
  constructor(private client: DealStoreClient) {}

  /**
   * Search emails with advanced filters
   * @param query Gmail query with filters (from, to, subject, hasAttachment, labels, date range)
   * @returns Array of matching email messages
   */
  async searchEmails(query: GmailQuery): Promise<EmailMessage[]> {
    const response = await this.client.callTool('search_emails', {
      query: query.query || '',
      from: query.from,
      to: query.to,
      subject: query.subject,
      hasAttachment: query.hasAttachment,
      label: query.label,
      after: query.after?.toISOString(),
      before: query.before?.toISOString(),
      maxResults: 50,
    });
    return response.content as EmailMessage[];
  }

  /**
   * Get a thread by ID with all messages
   * @param threadId Gmail thread ID
   * @returns Thread with all messages and participants
   */
  async getThread(threadId: string): Promise<Thread | null> {
    const response = await this.client.callTool('get_thread', { threadId });
    return response.content as Thread | null;
  }

  /**
   * Get an email message by ID
   * @param messageId Gmail message ID
   * @returns Email message with full details
   */
  async getMessage(messageId: string): Promise<EmailMessage | null> {
    const response = await this.client.callTool('get_message', { messageId });
    return response.content as EmailMessage | null;
  }

  /**
   * Send an email
   * @param params Email parameters (to, subject, body, cc, threadId for replies)
   * @returns Sent email message
   */
  async sendEmail(params: {
    to: string[];
    subject: string;
    body: string;
    cc?: string[];
    threadId?: string;
  }): Promise<EmailMessage> {
    const response = await this.client.callTool('send_email', params);
    return response.content as EmailMessage;
  }

  /**
   * Extract context from an email for lead qualification using Claude AI
   * @param messageId Gmail message ID
   * @returns Extracted lead qualification context (requirements, budget, timeline, urgency)
   */
  async extractEmailContext(messageId: string): Promise<EmailContext> {
    const response = await this.client.callTool('extract_email_context', {
      messageId,
    });
    return response.content as EmailContext;
  }

  /**
   * Get recent threads from inbox
   * @param limit Maximum number of threads to retrieve (default: 20)
   * @returns Array of recent threads
   */
  async getRecentThreads(limit = 20): Promise<Thread[]> {
    const response = await this.client.callTool('get_recent_threads', { limit });
    return response.content as Thread[];
  }

  /**
   * Watch for new emails (set up push notifications via Google Cloud Pub/Sub)
   * @param topic Google Cloud Pub/Sub topic name for push notifications
   * @returns historyId for tracking changes
   */
  async watchEmails(topic: string): Promise<string> {
    const response = await this.client.callTool('watch_emails', { topic });
    return response.content as string; // Returns history ID
  }

  /**
   * Stop watching for new emails
   */
  async stopWatching(): Promise<void> {
    await this.client.callTool('stop_watching', {});
  }
}
