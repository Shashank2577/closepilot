import { google } from 'googleapis';
import { simpleParser } from 'mailparser';
import Anthropic from '@anthropic-ai/sdk';
import type { EmailMessage, Thread, GmailQuery, EmailContext, EmailAddress } from '@closepilot/core';

// Initialize Anthropic Client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Initialize OAuth2 Client
const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI
);

// Set credentials if refresh token is provided
if (process.env.GMAIL_REFRESH_TOKEN) {
  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });
}

const gmailAPI = google.gmail({ version: 'v1', auth: oauth2Client });

/**
 * Register Gmail integration tools with MCP server
 */
export function registerGmailTools(server: any): void {
  // Note: ListTools is handled centrally in index.ts for this app architecture
  // But we provide the tool handlers here for CallToolRequestSchema

  // We'll expose the handlers through a map that index.ts can use
  // Or we could attach them directly to the server object if it supported that
  console.log('Gmail tools registered');
}

// Map of handlers that index.ts can import and use
export const gmailToolHandlers: Record<string, (args: any) => Promise<any>> = {
  search_emails: async (args) => {
    return await searchEmails(args);
  },
  get_thread: async (args) => {
    return await getThread(args.threadId);
  },
  get_message: async (args) => {
    return await getMessage(args.messageId);
  },
  send_email: async (args) => {
    return await sendEmail(args);
  },
  extract_email_context: async (args) => {
    return await extractEmailContext(args.messageId);
  },
  get_recent_threads: async (args) => {
    return await getRecentThreads(args.limit);
  },
  watch_emails: async (args) => {
    return await watchEmails(args.topic);
  },
  stop_watching: async (args) => {
    await stopWatching();
    return { success: true };
  }
};

// Helper to build Gmail search string
function buildGmailQueryString(query: GmailQuery): string {
  const parts: string[] = [];
  if (query.query) parts.push(query.query);
  if (query.from) parts.push(`from:${query.from}`);
  if (query.to) parts.push(`to:${query.to}`);
  if (query.subject) parts.push(`subject:${query.subject}`);
  if (query.hasAttachment) parts.push('has:attachment');
  if (query.label) parts.push(`label:${query.label}`);
  if (query.after) parts.push(`after:${Math.floor(query.after.getTime() / 1000)}`);
  if (query.before) parts.push(`before:${Math.floor(query.before.getTime() / 1000)}`);
  return parts.join(' ');
}

// Stub implementations that will be replaced
export async function searchEmails(query: GmailQuery): Promise<{ messages: EmailMessage[], nextPageToken?: string }> {
  const queryString = buildGmailQueryString(query);
  const response = await gmailAPI.users.messages.list({
    userId: 'me',
    q: queryString,
    maxResults: 20, // Default limit
    pageToken: query.pageToken,
  });

  const messages = response.data.messages || [];
  const detailedMessages: EmailMessage[] = [];

  for (const message of messages) {
    if (message.id) {
      // Fetch details for each message
      const msgDetail = await getMessage(message.id);
      if (msgDetail) {
        detailedMessages.push(msgDetail);
      }
    }
  }

  return {
    messages: detailedMessages,
    nextPageToken: response.data.nextPageToken || undefined,
  };
}

// Helper to parse email address string like "Name <email@domain.com>" or "email@domain.com"
function parseEmailAddress(addressStr: string): EmailAddress {
  const match = addressStr.match(/(?:(.*)\s+)?<?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?/);
  if (match) {
    const name = match[1]?.replace(/^["']|["']$/g, '').trim();
    return {
      email: match[2],
      ...(name ? { name } : {})
    };
  }
  return { email: addressStr };
}

// Helper to parse multiple email addresses separated by comma
function parseEmailAddresses(addressesStr: string): EmailAddress[] {
  if (!addressesStr) return [];
  return addressesStr.split(',').map(s => parseEmailAddress(s.trim()));
}

export async function getMessage(messageId: string): Promise<EmailMessage | null> {
  try {
    const response = await gmailAPI.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'raw',
    });

    if (!response.data.raw) {
      return null;
    }

    // Decode base64url encoded raw email
    const decodedEmail = Buffer.from(response.data.raw, 'base64url').toString('utf-8');

    // Use mailparser to parse the raw email
    const parsed = await simpleParser(decodedEmail);

    // Extract required headers
    const fromHeader = parsed.headers.get('from');
    const toHeader = parsed.headers.get('to');
    const ccHeader = parsed.headers.get('cc');

    const fromAddressStr = fromHeader ? (typeof fromHeader === 'string' ? fromHeader : (fromHeader as any).text || '') : '';
    const toAddressesStr = toHeader ? (typeof toHeader === 'string' ? toHeader : (toHeader as any).text || '') : '';
    const ccAddressesStr = ccHeader ? (typeof ccHeader === 'string' ? ccHeader : (ccHeader as any).text || '') : '';
    const subject = parsed.subject || '';

    return {
      id: response.data.id!,
      threadId: response.data.threadId!,
      from: parseEmailAddress(fromAddressStr),
      to: parseEmailAddresses(toAddressesStr),
      ...(ccAddressesStr ? { cc: parseEmailAddresses(ccAddressesStr) } : {}),
      subject,
      body: parsed.text || '',
      ...(parsed.html ? { htmlBody: parsed.html } : {}),
      timestamp: parsed.date || new Date(),
      labels: response.data.labelIds || [],
      ...(parsed.attachments.length > 0 ? {
        attachments: parsed.attachments.map(att => ({
          id: att.contentId || '',
          filename: att.filename || 'unknown',
          mimeType: att.contentType,
          size: att.size || 0,
        }))
      } : {})
    };
  } catch (error) {
    console.error(`Error fetching message ${messageId}:`, error);
    return null;
  }
}

export async function getThread(threadId: string): Promise<Thread | null> {
  try {
    const response = await gmailAPI.users.threads.get({
      userId: 'me',
      id: threadId,
    });

    const thread = response.data;
    if (!thread || !thread.messages || thread.messages.length === 0) {
      return null;
    }

    const messages: EmailMessage[] = [];
    for (const msg of thread.messages) {
      if (msg.id) {
        const fullMsg = await getMessage(msg.id);
        if (fullMsg) messages.push(fullMsg);
      }
    }

    if (messages.length === 0) return null;

    const lastMessage = messages[messages.length - 1];

    // Extract participants from all messages
    const participantsMap = new Map<string, { email: string; name?: string }>();
    messages.forEach((msg) => {
      participantsMap.set(msg.from.email, msg.from);
      msg.to.forEach((to) => participantsMap.set(to.email, to));
      if (msg.cc) {
        msg.cc.forEach((cc) => participantsMap.set(cc.email, cc));
      }
    });

    return {
      id: thread.id!,
      messages,
      participants: Array.from(participantsMap.values()),
      subject: lastMessage.subject,
      lastMessageAt: lastMessage.timestamp,
      messageCount: messages.length,
      labels: thread.messages[0].labelIds || [], // Using labels from the first message
    };
  } catch (error) {
    console.error(`Error fetching thread ${threadId}:`, error);
    return null;
  }
}

export async function getRecentThreads(limit: number = 20, pageToken?: string): Promise<{ threads: Thread[], nextPageToken?: string }> {
  try {
    const response = await gmailAPI.users.threads.list({
      userId: 'me',
      maxResults: limit,
      pageToken,
    });

    const threads = response.data.threads || [];
    const detailedThreads: Thread[] = [];

    for (const thread of threads) {
      if (thread.id) {
        const fullThread = await getThread(thread.id);
        if (fullThread) {
          detailedThreads.push(fullThread);
        }
      }
    }

    return {
      threads: detailedThreads,
      nextPageToken: response.data.nextPageToken || undefined,
    };
  } catch (error) {
    console.error('Error fetching recent threads:', error);
    return { threads: [] };
  }
}

export async function watchEmails(topic: string): Promise<string> {
  try {
    const response = await gmailAPI.users.watch({
      userId: 'me',
      requestBody: {
        topicName: topic,
        labelIds: ['INBOX'], // Watch the inbox by default
      },
    });

    if (!response.data.historyId) {
      throw new Error('Watch request successful but no historyId returned');
    }

    return response.data.historyId;
  } catch (error) {
    console.error('Error setting up watch:', error);
    throw error;
  }
}

export async function extractEmailContext(messageId: string): Promise<EmailContext> {
  try {
    const message = await getMessage(messageId);
    if (!message) {
      throw new Error(`Message not found: ${messageId}`);
    }

    const emailContent = `
Subject: ${message.subject}
From: ${message.from.name ? `${message.from.name} <${message.from.email}>` : message.from.email}
Body:
${message.body}
    `.trim();

    const prompt = `
You are an expert sales assistant. Please analyze the following email and extract lead context.
Respond with a valid JSON object matching this schema exactly, and nothing else.

Schema:
{
  "isLeadInquiry": boolean,
  "extractedRequirements": string[] | undefined,
  "companyMentioned": string | undefined,
  "budgetMentioned": string | undefined,
  "timelineMentioned": string | undefined,
  "urgency": "low" | "medium" | "high"
}

Email:
${emailContent}
`;

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
    });

    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';

    // Find the JSON object in the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from Claude response');
    }

    const context: EmailContext = JSON.parse(jsonMatch[0]);
    return context;
  } catch (error) {
    console.error('Error extracting email context:', error);
    throw error;
  }
}

export async function stopWatching(): Promise<void> {
  try {
    await gmailAPI.users.stop({
      userId: 'me',
    });
  } catch (error) {
    console.error('Error stopping watch:', error);
    throw error;
  }
}

export async function sendEmail(params: {
  to: string[];
  subject: string;
  body: string;
  cc?: string[];
  threadId?: string;
}): Promise<EmailMessage> {
  try {
    const to = params.to.join(', ');
    const cc = params.cc ? `\nCc: ${params.cc.join(', ')}` : '';
    const subject = params.subject;

    // Construct raw email according to RFC 2822
    let messageParts = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
    ];

    if (params.cc && params.cc.length > 0) {
      messageParts.push(`Cc: ${params.cc.join(', ')}`);
    }

    if (params.threadId) {
      // Best effort thread reply headers
      // In a real robust implementation, we would fetch the thread to get the In-Reply-To and References headers
      // But adding threadId to the API request is often enough for Gmail to thread it
    }

    messageParts.push(''); // Empty line between headers and body
    messageParts.push(params.body);

    const rawMessage = messageParts.join('\n');

    // Convert to base64url format required by Gmail API
    const encodedMessage = Buffer.from(rawMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const requestBody: any = {
      raw: encodedMessage,
    };

    if (params.threadId) {
      requestBody.threadId = params.threadId;
    }

    const response = await gmailAPI.users.messages.send({
      userId: 'me',
      requestBody,
    });

    if (!response.data.id) {
      throw new Error('Failed to send email: No message ID returned');
    }

    // Fetch the fully constructed sent message
    const sentMessage = await getMessage(response.data.id);
    if (!sentMessage) {
      throw new Error('Email was sent but could not be retrieved');
    }

    return sentMessage;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}
