import type { EmailMessage, Thread, GmailQuery, EmailContext } from '@closepilot/core';

/**
 * Register Gmail integration tools with MCP server
 * These are stub implementations - will be completed by Jules session J-102
 */
export function registerGmailTools(server: any): void {
  // Stub functions for tool registration
  // Actual implementation will:
  // - Search emails using Gmail API
  // - Get threads and messages
  // - Send emails
  // - Extract context using AI

  console.log('Gmail tools registered (stubs)');
}

// Stub implementations that will be replaced
export async function searchEmails(query: GmailQuery): Promise<EmailMessage[]> {
  throw new Error('Not implemented - Jules J-102 will implement');
}

export async function getThread(threadId: string): Promise<Thread | null> {
  throw new Error('Not implemented - Jules J-102 will implement');
}

export async function sendEmail(params: {
  to: string[];
  subject: string;
  body: string;
}): Promise<EmailMessage> {
  throw new Error('Not implemented - Jules J-102 will implement');
}
