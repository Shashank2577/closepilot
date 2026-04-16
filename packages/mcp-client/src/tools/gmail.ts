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
   * Search emails
   */
  async searchEmails(query: GmailQuery): Promise<{ messages: EmailMessage[], nextPageToken?: string }> {
    const response = await this.client.callTool('search_emails', {
      query: query.query || '',
      from: query.from,
      to: query.to,
      subject: query.subject,
      hasAttachment: query.hasAttachment,
      label: query.label,
      after: query.after?.toISOString(),
      before: query.before?.toISOString(),
      pageToken: query.pageToken,
    });
    // The server returns JSON text in response.content[0].text
    if (response.content && response.content.length > 0 && response.content[0].type === 'text') {
      try {
        return JSON.parse(response.content[0].text) as { messages: EmailMessage[], nextPageToken?: string };
      } catch (e) {
        return { messages: [] };
      }
    }
    // Fallback for simple content array or empty
    return { messages: response.content as any };
  }

  /**
   * Get a thread by ID
   */
  async getThread(threadId: string): Promise<Thread | null> {
    const response = await this.client.callTool('get_thread', { threadId });
    if (response.content && response.content.length > 0 && response.content[0].type === 'text') {
      try {
        return JSON.parse(response.content[0].text) as Thread | null;
      } catch (e) {
        return null;
      }
    }
    return response.content as any;
  }

  /**
   * Get an email message by ID
   */
  async getMessage(messageId: string): Promise<EmailMessage | null> {
    const response = await this.client.callTool('get_message', { messageId });
    if (response.content && response.content.length > 0 && response.content[0].type === 'text') {
      try {
        return JSON.parse(response.content[0].text) as EmailMessage | null;
      } catch (e) {
        return null;
      }
    }
    return response.content as any;
  }

  /**
   * Send an email
   */
  async sendEmail(params: {
    to: string[];
    subject: string;
    body: string;
    cc?: string[];
    threadId?: string;
  }): Promise<EmailMessage> {
    const response = await this.client.callTool('send_email', params);
    if (response.content && response.content.length > 0 && response.content[0].type === 'text') {
      return JSON.parse(response.content[0].text) as EmailMessage;
    }
    return response.content as any;
  }

  /**
   * Extract context from an email for lead qualification
   */
  async extractEmailContext(messageId: string): Promise<EmailContext> {
    const response = await this.client.callTool('extract_email_context', {
      messageId,
    });
    if (response.content && response.content.length > 0 && response.content[0].type === 'text') {
      return JSON.parse(response.content[0].text) as EmailContext;
    }
    return response.content as any;
  }

  /**
   * Get recent threads from inbox
   */
  async getRecentThreads(limit = 20, pageToken?: string): Promise<{ threads: Thread[], nextPageToken?: string }> {
    const response = await this.client.callTool('get_recent_threads', { limit, pageToken });
    if (response.content && response.content.length > 0 && response.content[0].type === 'text') {
      try {
        return JSON.parse(response.content[0].text) as { threads: Thread[], nextPageToken?: string };
      } catch (e) {
        return { threads: [] };
      }
    }
    return { threads: response.content as any };
  }

  /**
   * Watch for new emails (set up push notifications)
   */
  async watchEmails(topic: string): Promise<string> {
    const response = await this.client.callTool('watch_emails', { topic });
    if (response.content && response.content.length > 0 && response.content[0].type === 'text') {
      return JSON.parse(response.content[0].text);
    }
    return response.content as any;
  }

  /**
   * Stop watching for new emails
   */
  async stopWatching(): Promise<void> {
    await this.client.callTool('stop_watching', {});
  }
}
