const fs = require('fs');

let gmailTest = fs.readFileSync('packages/mcp-server/src/tools/__tests__/gmail.test.ts', 'utf8');

// I replaced `jest.mock('googleapis')` with `vi.mock('googleapis')` but it seems `getMock` and `listMock` are NOT correctly returning mocked values, maybe `mocks.getMock` is undefined?
// In my code:
// `const mocks = vi.hoisted(() => ({ getMock: vi.fn(), listMock: vi.fn(), ... }))`
// `vi.mock('googleapis', () => ({ ... get: mocks.getMock ... }))`
// Let's log it. Let me just re-write the test simply:
gmailTest = `import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchEmails, getMessage } from '../gmail.js';

// I will mock 'googleapis' fully without vi.hoisted if that's an issue.
vi.mock('googleapis', () => {
  return {
    google: {
      auth: { OAuth2: class { setCredentials() {} } },
      gmail: () => ({
        users: {
          messages: {
            list: vi.fn().mockResolvedValue({ data: { messages: [{ id: 'msg1' }] } }),
            get: vi.fn().mockResolvedValue({
              data: {
                id: 'msg1', threadId: 'thread1', snippet: 'Test snippet',
                payload: {
                  headers: [{ name: 'Subject', value: 'Test Subject' }, { name: 'From', value: 'sender@example.com' }, { name: 'Date', value: '2024-05-01T10:00:00Z' }],
                  parts: [{ mimeType: 'text/plain', body: { data: Buffer.from('Test body').toString('base64') } }]
                }
              }
            })
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

describe('gmail tools', () => {
  it('listEmails returns emails', async () => {
    const emails = await searchEmails({ maxResults: 1 }, { clientId: 'test', clientSecret: 'test', accessToken: 'test', refreshToken: 'test' } as any);
    expect(emails.messages.length).toBeGreaterThan(0);
    expect(emails.messages[0].id).toBe('msg1');
  });

  it('getEmail returns email details', async () => {
    const email = await getMessage('msg1', { clientId: 'test', clientSecret: 'test', accessToken: 'test', refreshToken: 'test' } as any);
    expect(email?.id).toBe('msg1');
    expect(email?.subject).toBe('Test Subject');
  });
});
`;

fs.writeFileSync('packages/mcp-server/src/tools/__tests__/gmail.test.ts', gmailTest);
