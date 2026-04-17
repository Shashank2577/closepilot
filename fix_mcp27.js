const fs = require('fs');

let gmailTest = fs.readFileSync('packages/mcp-server/src/tools/__tests__/gmail.test.ts', 'utf8');

gmailTest = `import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  listMock: vi.fn(),
  getMock: vi.fn()
}));

vi.mock('googleapis', () => {
  return {
    google: {
      auth: { OAuth2: class { setCredentials() {} } },
      gmail: () => ({
        users: {
          messages: {
            list: mocks.listMock,
            get: mocks.getMock
          }
        }
      })
    }
  }
});

vi.mock('@anthropic-ai/sdk', () => ({ default: class { messages = { create: vi.fn().mockResolvedValue({ content: [{ text: JSON.stringify({ category: 'lead', priority: 'high', summary: 'Test summary' }) }] }) } } }));

vi.mock('mailparser', () => ({
  simpleParser: vi.fn().mockResolvedValue({
    headers: new Map(), subject: 'Test Subject', from: { text: 'sender@example.com' }, to: { text: 'recipient@example.com' }, date: new Date(), text: 'Test body', html: '<p>Test body</p>'
  })
}));

import { searchEmails, getMessage } from '../gmail.js';

describe('gmail tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listEmails returns emails', async () => {
    mocks.listMock.mockResolvedValueOnce({ data: { messages: [{ id: 'msg1' }] } });
    mocks.getMock.mockResolvedValueOnce({
      data: {
        id: 'msg1', threadId: 'thread1', snippet: 'Test snippet',
        payload: { headers: [{ name: 'Subject', value: 'Test Subject' }, { name: 'From', value: 'sender@example.com' }, { name: 'Date', value: '2024-05-01T10:00:00Z' }] }
      }
    });

    const emails = await searchEmails({ maxResults: 1 }, { clientId: 'test', clientSecret: 'test', accessToken: 'test', refreshToken: 'test' } as any);
    expect(emails.messages.length).toBeGreaterThan(0);
    expect(emails.messages[0].id).toBe('msg1');
  });

  it('getEmail returns email details', async () => {
    mocks.getMock.mockResolvedValueOnce({
      data: {
        id: 'msg1', threadId: 'thread1', snippet: 'Test snippet',
        payload: {
          headers: [{ name: 'Subject', value: 'Test Subject' }, { name: 'From', value: 'sender@example.com' }, { name: 'Date', value: '2024-05-01T10:00:00Z' }],
          parts: [{ mimeType: 'text/plain', body: { data: Buffer.from('Test body').toString('base64') } }]
        }
      }
    });

    const email = await getMessage('msg1', { clientId: 'test', clientSecret: 'test', accessToken: 'test', refreshToken: 'test' } as any);
    expect(email?.id).toBe('msg1');
    expect(email?.subject).toBe('Test Subject');
  });
});
`;

fs.writeFileSync('packages/mcp-server/src/tools/__tests__/gmail.test.ts', gmailTest);
