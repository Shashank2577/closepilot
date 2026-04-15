/**
 * Email message from Gmail
 */
export interface EmailMessage {
  id: string;
  threadId: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  subject: string;
  body: string;
  htmlBody?: string;
  timestamp: Date;
  labels?: string[];
  attachments?: Attachment[];
}

/**
 * Email address
 */
export interface EmailAddress {
  email: string;
  name?: string;
}

/**
 * Email attachment
 */
export interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

/**
 * Gmail thread
 */
export interface Thread {
  id: string;
  messages: EmailMessage[];
  participants: EmailAddress[];
  subject: string;
  lastMessageAt: Date;
  messageCount: number;
  labels?: string[];
}

/**
 * Query for searching Gmail
 */
export interface GmailQuery {
  query?: string;
  from?: string;
  to?: string;
  subject?: string;
  hasAttachment?: boolean;
  label?: string;
  after?: Date;
  before?: Date;
}

/**
 * Context for email processing
 */
export interface EmailContext {
  isLeadInquiry: boolean;
  extractedRequirements?: string[];
  companyMentioned?: string;
  budgetMentioned?: string;
  timelineMentioned?: string;
  urgency: 'low' | 'medium' | 'high';
}
