const fs = require('fs');

let gmailTest = fs.readFileSync('packages/mcp-server/src/tools/__tests__/gmail.test.ts', 'utf8');

gmailTest = `import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  getMock: vi.fn(),
  listMock: vi.fn(),
  modifyMock: vi.fn(),
  sendMock: vi.fn()
}));

vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: class { setCredentials() {} },
    },
    gmail: vi.fn(() => ({
      users: {
        messages: { get: mocks.getMock, list: mocks.listMock, modify: mocks.modifyMock, send: mocks.sendMock },
        threads: { get: mocks.getMock, list: mocks.listMock, modify: mocks.modifyMock },
      }
    }))
  }
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = {
      create: vi.fn().mockResolvedValue({
        content: [{ text: JSON.stringify({ category: 'lead', priority: 'high', summary: 'Test summary' }) }]
      })
    }
  }
}));

vi.mock('mailparser', () => ({
  simpleParser: vi.fn().mockResolvedValue({
    headers: new Map(),
    subject: 'Test Subject',
    from: { text: 'sender@example.com' },
    to: { text: 'recipient@example.com' },
    date: new Date(),
    text: 'Test body',
    html: '<p>Test body</p>',
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
        payload: { headers: [{ name: 'Subject', value: 'Test Subject' }, { name: 'From', value: 'sender@example.com' }, { name: 'Date', value: new Date().toISOString() }] }
      }
    });

    const emails = await searchEmails({ maxResults: 1 });
    expect(emails.messages.length).toBe(1);
    expect(emails.messages[0].id).toBe('msg1');
  });

  it('getEmail returns email details', async () => {
    mocks.getMock.mockResolvedValueOnce({
      data: {
        id: 'msg1', threadId: 'thread1', snippet: 'Test snippet',
        payload: {
          headers: [{ name: 'Subject', value: 'Test Subject' }, { name: 'From', value: 'sender@example.com' }, { name: 'Date', value: new Date().toISOString() }],
          parts: [{ mimeType: 'text/plain', body: { data: Buffer.from('Test body').toString('base64') } }]
        }
      }
    });

    const email = await getMessage('msg1');
    expect(email?.id).toBe('msg1');
    expect(email?.subject).toBe('Test Subject');
  });
});
`;

fs.writeFileSync('packages/mcp-server/src/tools/__tests__/gmail.test.ts', gmailTest);


let driveTest = fs.readFileSync('packages/mcp-server/src/__tests__/drive.test.ts', 'utf8');

driveTest = `import { describe, it, expect, vi, beforeEach } from 'vitest';

process.env.DRIVE_TEMPLATES_FOLDER_ID = 'test-folder';
process.env.GOOGLE_CLIENT_EMAIL = 'test@example.com';
process.env.GOOGLE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----';

import { google } from 'googleapis';
import * as driveTools from '../tools/drive.js';
const { listTemplates, generateDocument, getDownloadUrl } = driveTools;

vi.mock('../utils/google-auth.js', () => ({
  getDriveClient: vi.fn().mockReturnValue({
    files: {
      list: vi.fn().mockResolvedValue({
        data: {
          files: [
            { id: 'template-1', name: 'Proposal Template' },
            { id: 'template-2', name: 'MSA Template' }
          ]
        }
      }),
      copy: vi.fn().mockResolvedValue({
        data: { id: 'new-doc-id', name: 'Generated Proposal' }
      }),
      get: vi.fn().mockResolvedValue({
        data: {
          webContentLink: 'https://export-link.com/pdf'
        }
      })
    }
  }),
  getDocsClient: vi.fn().mockReturnValue({
    documents: {
      batchUpdate: vi.fn().mockResolvedValue({ data: {} })
    }
  }),
  initializeGoogleClients: vi.fn()
}));

describe('drive tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listTemplates returns mock templates', async () => {
    const templates = await listTemplates();
    expect(templates.length).toBe(2);
    expect(templates[0].id).toBe('template-1');
  });

  it('generateDocument creates document and returns result', async () => {
    // Mock getTemplate inside generateDocument because it calls listTemplates which uses process.env correctly if we reset. Wait, we spyOn instead.
    vi.spyOn(driveTools, 'listTemplates').mockResolvedValue([{ id: 'template-1', name: 'Proposal Template', modifiedTime: '2024-05-01T00:00:00Z' }]);

    const result = await generateDocument({
      templateId: 'template-1',
      title: 'Generated Proposal',
      folderId: 'folder-1',
      replacements: { '{{Client_Name}}': 'Acme Corp' }
    });
    expect(result.documentId).toBe('new-doc-id');
    expect(result.driveUrl).toContain('new-doc-id');
  });

  it('getDownloadUrl returns export link', async () => {
    const url = await getDownloadUrl('new-doc-id');
    expect(url).toBe('https://export-link.com/pdf');
  });
});
`;

fs.writeFileSync('packages/mcp-server/src/__tests__/drive.test.ts', driveTest);
