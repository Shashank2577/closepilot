import { describe, it, expect, vi, afterEach } from 'vitest';
import { searchEmails, getThread, extractEmailContext } from '../gmail';

// Mock simpleParser
vi.mock('mailparser', () => ({
  simpleParser: vi.fn().mockResolvedValue({
    headers: {
      get: (key: string) => {
        if (key === 'from') return 'test@example.com';
        if (key === 'to') return 'recipient@example.com';
        if (key === 'cc') return '';
        return '';
      }
    },
    subject: 'Test Subject',
    text: 'Test Body',
    date: new Date('2024-01-01T00:00:00Z'),
    attachments: []
  })
}));

// Mock Anthropic
vi.mock('@anthropic-ai/sdk', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MockAnthropic = vi.fn(function(this: any) {
    this.messages = {
      create: vi.fn().mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '{"isLeadInquiry":true,"extractedRequirements":["Test"],"companyMentioned":"Acme Corp","budgetMentioned":"$100k","timelineMentioned":"ASAP","urgency":"high"}'
          }
        ]
      })
    };
  });
  return { default: MockAnthropic };
});

// Mock Google APIs
vi.mock('googleapis', () => {
  const mGmail = {
    users: {
      messages: {
        list: vi.fn().mockResolvedValue({
          data: { messages: [{ id: 'msg1' }], nextPageToken: 'token123' }
        }),
        get: vi.fn().mockResolvedValue({
          data: {
            id: 'msg1',
            threadId: 'thread1',
            raw: Buffer.from('mock-email-content').toString('base64url'),
            labelIds: ['INBOX']
          }
        })
      },
      threads: {
        list: vi.fn().mockResolvedValue({
          data: { threads: [{ id: 'thread1' }], nextPageToken: 'token456' }
        }),
        get: vi.fn().mockResolvedValue({
          data: {
            id: 'thread1',
            messages: [{ id: 'msg1', labelIds: ['INBOX'] }]
          }
        })
      }
    }
  };

  return {
    google: {
      auth: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        OAuth2: vi.fn(function(this: any) { this.setCredentials = vi.fn(); })
      },
      gmail: vi.fn().mockReturnValue(mGmail)
    }
  };
});

describe('Gmail Tools', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('searchEmails', () => {
    it('should search emails and return detailed messages with pagination', async () => {
      const response = await searchEmails({ query: 'test' });
      expect(response.messages).toHaveLength(1);
      expect(response.messages[0].id).toBe('msg1');
      expect(response.messages[0].subject).toBe('Test Subject');
      expect(response.messages[0].from.email).toBe('test@example.com');
      expect(response.nextPageToken).toBe('token123');
    });
  });

  describe('getThread', () => {
    it('should get thread and return details', async () => {
      const thread = await getThread('thread1');
      expect(thread).toBeDefined();
      expect(thread?.id).toBe('thread1');
      expect(thread?.messages).toHaveLength(1);
      expect(thread?.subject).toBe('Test Subject');
    });
  });

  describe('extractEmailContext', () => {
    it('should extract context using Claude', async () => {
      const context = await extractEmailContext('msg1');
      expect(context.isLeadInquiry).toBe(true);
      expect(context.companyMentioned).toBe('Acme Corp');
    });
  });
});
