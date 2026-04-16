import { searchEmails, getThread, extractEmailContext } from '../gmail';
import { google } from 'googleapis';
import Anthropic from '@anthropic-ai/sdk';
import { simpleParser } from 'mailparser';

// Mock simpleParser
jest.mock('mailparser', () => ({
  simpleParser: jest.fn().mockResolvedValue({
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
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '{"isLeadInquiry":true,"extractedRequirements":["Test"],"companyMentioned":"Acme Corp","budgetMentioned":"$100k","timelineMentioned":"ASAP","urgency":"high"}'
          }
        ]
      })
    }
  }));
});

// Mock Google APIs
jest.mock('googleapis', () => {
  const mGmail = {
    users: {
      messages: {
        list: jest.fn().mockResolvedValue({
          data: { messages: [{ id: 'msg1' }], nextPageToken: 'token123' }
        }),
        get: jest.fn().mockResolvedValue({
          data: {
            id: 'msg1',
            threadId: 'thread1',
            raw: Buffer.from('mock-email-content').toString('base64url'),
            labelIds: ['INBOX']
          }
        })
      },
      threads: {
        list: jest.fn().mockResolvedValue({
          data: { threads: [{ id: 'thread1' }], nextPageToken: 'token456' }
        }),
        get: jest.fn().mockResolvedValue({
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
        OAuth2: jest.fn().mockImplementation(() => ({
          setCredentials: jest.fn()
        }))
      },
      gmail: jest.fn().mockReturnValue(mGmail)
    }
  };
});

describe('Gmail Tools', () => {
  afterEach(() => {
    jest.clearAllMocks();
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
