import { gmail_v1, google } from 'googleapis';
import type {
  EmailMessage,
  Thread,
  GmailQuery,
  EmailContext,
  EmailAddress,
  Attachment,
} from '@closepilot/core';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Gmail MCP Tools Implementation
 * Provides full Gmail API integration with OAuth authentication
 */

// Environment variables for OAuth
const GMAIL_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GMAIL_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GMAIL_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

// OAuth2 client for Gmail
function getOAuth2Client(accessToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET,
    GMAIL_REDIRECT_URI
  );
  oauth2Client.setCredentials({ access_token: accessToken });
  return oauth2Client;
}

// Get Gmail API client
async function getGmailClient(accessToken: string): Promise<gmail_v1.Gmail> {
  const auth = getOAuth2Client(accessToken);
  const gmail = google.gmail({ version: 'v1', auth });
  return gmail;
}

// Parse email address from RFC 2822 format
function parseEmailAddress(addressStr?: string): EmailAddress | undefined {
  if (!addressStr) return undefined;
  const match = addressStr.match(/(?:"?([^"]*)"?\s)?(?:<)?([^>]+@[^>]+)(?:>)?/);
  if (!match) return { email: addressStr };
  return {
    name: match[1]?.trim() || undefined,
    email: match[2].trim(),
  };
}

// Parse email addresses from header
function parseEmailAddresses(header?: string[]): EmailAddress[] {
  if (!header || header.length === 0) return [];
  return header
    .flatMap(h => h.split(',').map(s => parseEmailAddress(s.trim())))
    .filter((a): a is EmailAddress => a !== undefined);
}

// Extract message body from MIME message
function extractMessageBody(message: gmail_v1.Schema$Message): {
  body: string;
  htmlBody?: string;
} {
  let body = '';
  let htmlBody: string | undefined;

  const traverseParts = (parts: gmail_v1.Schema$MessagePart[]) => {
    for (const part of parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        body = Buffer.from(part.body.data, 'base64').toString('utf-8');
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        htmlBody = Buffer.from(part.body.data, 'base64').toString('utf-8');
      } else if (part.parts) {
        traverseParts(part.parts);
      }
    }
  };

  if (message.payload?.body?.data) {
    body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
  }

  if (message.payload?.parts) {
    traverseParts(message.payload.parts);
  }

  return { body, htmlBody };
}

// Extract attachments from message
function extractAttachments(message: gmail_v1.Schema$Message): Attachment[] {
  const attachments: Attachment[] = [];

  const traverseParts = (parts: gmail_v1.Schema$MessagePart[]) => {
    for (const part of parts) {
      if (part.filename && part.body?.attachmentId) {
        attachments.push({
          id: part.body.attachmentId,
          filename: part.filename,
          mimeType: part.mimeType || 'application/octet-stream',
          size: part.body.size || 0,
        });
      }
      if (part.parts) {
        traverseParts(part.parts);
      }
    }
  };

  if (message.payload?.parts) {
    traverseParts(message.payload.parts);
  }

  return attachments;
}

// Convert Gmail message to EmailMessage
function toEmailMessage(message: gmail_v1.Schema$Message): EmailMessage {
  const headers = message.payload?.headers || [];
  const getHeader = (name: string) =>
    headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value;

  const { body, htmlBody } = extractMessageBody(message);

  const toHeader = getHeader('To');
  const ccHeader = getHeader('Cc');

  return {
    id: message.id || '',
    threadId: message.threadId || '',
    from: parseEmailAddress(getHeader('From')) || { email: '' },
    to: parseEmailAddresses(toHeader ? [toHeader] : []),
    cc: parseEmailAddresses(ccHeader ? [ccHeader] : []),
    subject: getHeader('Subject') || '',
    body,
    htmlBody,
    timestamp: new Date(parseInt(message.internalDate || '0')),
    labels: message.labelIds || undefined,
    attachments: extractAttachments(message),
  };
}
}

// Build Gmail query string from GmailQuery
function buildGmailQuery(query: GmailQuery): string {
  const parts: string[] = [];

  if (query.query) parts.push(query.query);
  if (query.from) parts.push(`from:${query.from}`);
  if (query.to) parts.push(`to:${query.to}`);
  if (query.subject) parts.push(`subject:${query.subject}`);
  if (query.hasAttachment) parts.push('has:attachment');
  if (query.label) parts.push(`label:${query.label}`);
  if (query.after) {
    const date = new Date(query.after);
    parts.push(`after:${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`);
  }
  if (query.before) {
    const date = new Date(query.before);
    parts.push(`before:${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`);
  }

  return parts.join(' ');
}

/**
 * Register Gmail tools with MCP server
 */
export function registerGmailTools(server: any): void {
  server.setRequestHandler('tools/call', async (request: any) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'search_emails':
          return await handleSearchEmails(args);
        case 'get_thread':
          return await handleGetThread(args);
        case 'get_message':
          return await handleGetMessage(args);
        case 'send_email':
          return await handleSendEmail(args);
        case 'extract_email_context':
          return await handleExtractEmailContext(args);
        case 'get_recent_threads':
          return await handleGetRecentThreads(args);
        case 'watch_emails':
          return await handleWatchEmails(args);
        case 'stop_watching':
          return await handleStopWatching(args);
        default:
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: `Unknown tool: ${name}` }),
              },
            ],
          };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: error instanceof Error ? error.message : 'Unknown error',
            }),
          },
        ],
      };
    }
  });

  console.log('Gmail MCP tools registered');
}

/**
 * Search emails with filters
 */
async function handleSearchEmails(args: any) {
  const { accessToken, query } = args;
  const gmail = await getGmailClient(accessToken);
  const gmailQuery = buildGmailQuery(query);

  const response = await gmail.users.messages.list({
    userId: 'me',
    q: gmailQuery,
    maxResults: query.maxResults || 50,
  });

  const messages: EmailMessage[] = [];

  if (response.data.messages) {
    for (const msgRef of response.data.messages) {
      const msg = await gmail.users.messages.get({
        userId: 'me',
        id: msgRef.id!,
        format: 'full',
      });
      messages.push(toEmailMessage(msg.data));
    }
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(messages),
      },
    ],
  };
}

/**
 * Get full thread with all messages
 */
async function handleGetThread(args: any) {
  const { accessToken, threadId } = args;
  const gmail = await getGmailClient(accessToken);

  const response = await gmail.users.threads.get({
    userId: 'me',
    id: threadId,
    format: 'full',
  });

  const threadData = response.data;
  const messages = (threadData.messages || []).map(msg => toEmailMessage(msg));

  // Extract unique participants
  const participantSet = new Set<string>();
  messages.forEach(msg => {
    participantSet.add(msg.from.email);
    msg.to.forEach(t => participantSet.add(t.email));
  });

  const participants = Array.from(participantSet).map(email => ({ email }));

  const thread: Thread = {
    id: threadData.id || '',
    messages,
    participants,
    subject: messages[0]?.subject || '',
    lastMessageAt: messages[messages.length - 1]?.timestamp || new Date(),
    messageCount: messages.length,
    labels: threadData.messages?.[0]?.labelIds || undefined,
  };

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(thread),
      },
    ],
  };
}

/**
 * Get single email message
 */
async function handleGetMessage(args: any) {
  const { accessToken, messageId } = args;
  const gmail = await getGmailClient(accessToken);

  const response = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });

  const message = toEmailMessage(response.data);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(message),
      },
    ],
  };
}

/**
 * Send email
 */
async function handleSendEmail(args: any) {
  const { accessToken, to, subject, body, cc, threadId } = args;
  const gmail = await getGmailClient(accessToken);

  // Build email message
  const emailLines = [
    `To: ${Array.isArray(to) ? to.join(', ') : to}`,
    cc ? `Cc: ${Array.isArray(cc) ? cc.join(', ') : cc}` : '',
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    '',
    body,
  ].filter(Boolean).join('\r\n');

  const encodedEmail = Buffer.from(emailLines)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedEmail,
      threadId,
    },
  });

  const sentMessage = toEmailMessage(response.data);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(sentMessage),
      },
    ],
  };
}

/**
 * Extract email context using Claude API
 */
async function handleExtractEmailContext(args: any) {
  const { accessToken, messageId } = args;
  const gmail = await getGmailClient(accessToken);

  const response = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });

  const message = toEmailMessage(response.data);

  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }

  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  const prompt = `Analyze this email and extract lead qualification information:

From: ${message.from.name ? `${message.from.name} <${message.from.email}>` : message.from.email}
Subject: ${message.subject}
Body: ${message.body}

Please extract:
1. Is this a B2B lead inquiry? (yes/no)
2. What are the requirements or needs mentioned?
3. What company is mentioned?
4. Any budget information?
5. Any timeline information?
6. What is the urgency level? (low/medium/high)

Respond in JSON format with these fields:
{
  "isLeadInquiry": boolean,
  "extractedRequirements": string[],
  "companyMentioned": string | null,
  "budgetMentioned": string | null,
  "timelineMentioned": string | null,
  "urgency": "low" | "medium" | "high"
}`;

  const claudeResponse = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const responseText =
    claudeResponse.content[0].type === 'text'
      ? claudeResponse.content[0].text
      : '{}';

  const context: EmailContext = JSON.parse(responseText);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(context),
      },
    ],
  };
}

/**
 * Get recent threads from inbox
 */
async function handleGetRecentThreads(args: any) {
  const { accessToken, limit = 20 } = args;
  const gmail = await getGmailClient(accessToken);

  const response = await gmail.users.threads.list({
    userId: 'me',
    labelIds: ['INBOX'],
    maxResults: limit,
  });

  const threads: Thread[] = [];

  if (response.data.threads) {
    for (const threadRef of response.data.threads) {
      const thread = await gmail.users.threads.get({
        userId: 'me',
        id: threadRef.id!,
        format: 'full',
      });

      const messages = (thread.data.messages || []).map(msg =>
        toEmailMessage(msg)
      );

      const participantSet = new Set<string>();
      messages.forEach(msg => {
        participantSet.add(msg.from.email);
        msg.to.forEach(t => participantSet.add(t.email));
      });

      const participants = Array.from(participantSet).map(email => ({ email }));

      threads.push({
        id: thread.data.id || '',
        messages,
        participants,
        subject: messages[0]?.subject || '',
        lastMessageAt: messages[messages.length - 1]?.timestamp || new Date(),
        messageCount: messages.length,
        labels: thread.data.messages?.[0]?.labelIds || undefined,
      });
    }
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(threads),
      },
    ],
  };
}

/**
 * Watch for new emails (push notifications)
 */
async function handleWatchEmails(args: any) {
  const { accessToken, topic } = args;
  const gmail = await getGmailClient(accessToken);

  const response = await gmail.users.watch({
    userId: 'me',
    requestBody: {
      topicName: topic,
      labelIds: ['INBOX'],
    },
  });

  const historyId = response.data.historyId || '';

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ historyId }),
      },
    ],
  };
}

/**
 * Stop watching for new emails
 */
async function handleStopWatching(args: any) {
  const { accessToken } = args;
  const gmail = await getGmailClient(accessToken);

  await gmail.users.stop({ userId: 'me' });

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ success: true }),
      },
    ],
  };
}
