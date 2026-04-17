const fs = require('fs');

// drive.test.ts is missing the mock for google-auth.
// I replaced `vi.mock('../../utils/google-auth'` to `vi.mock('../utils/google-auth.js'`
// But wait! `getDriveClient` etc are imported from `../utils/google-auth` or `../utils/google-auth.js` in `drive.ts`.
// In `drive.ts`: `import { getDriveClient, getDocsClient } from '../utils/google-auth.js';`
// So in `drive.test.ts`, the mock MUST match EXACTLY `../utils/google-auth.js`.
// Let's check `drive.test.ts`: `vi.mock('../utils/google-auth.js', () => ({ ... }))`
// Let's rewrite `drive.test.ts` cleanly.
let driveTest = `import { describe, it, expect, vi, beforeEach } from 'vitest';

process.env.DRIVE_TEMPLATES_FOLDER_ID = 'test-folder';
process.env.GOOGLE_CLIENT_EMAIL = 'test@example.com';
process.env.GOOGLE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----';

import { google } from 'googleapis';
import { listTemplates, generateDocument, getDownloadUrl } from '../tools/drive.js';

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

// gmail.test.ts:
// `TypeError: [vitest] vi.mock("@anthropic-ai/sdk", factory?: () => unknown) is not returning an object. Did you mean to return an object with a "default" key?`
// My mock:
// `vi.mock('@anthropic-ai/sdk', () => ({ default: class Anthropic { messages = { create: vi.fn().mockResolvedValue(...) } } }));`
// I used `class` keyword. In JS arrow function returning object: `() => ({ default: ... })`
// Let's use `function` instead of `class` or just an object with `messages`?
// Actually `Anthropic` is usually instantiated: `new Anthropic()`.
// So returning a class is correct. But Vitest mock might not like a class directly if it's not well-formed?
// Let's use `const AnthropicMock = class { ... }; return { default: AnthropicMock };`

let gmailTest = fs.readFileSync('packages/mcp-server/src/tools/__tests__/gmail.test.ts', 'utf8');

gmailTest = gmailTest.replace(
  "vi.mock('@anthropic-ai/sdk', () => ({\n  default: class {",
  "vi.mock('@anthropic-ai/sdk', () => { const AnthropicMock = class {"
);
gmailTest = gmailTest.replace(
  "    }\n  }\n}));",
  "    }\n  }; return { default: AnthropicMock };\n});"
);

fs.writeFileSync('packages/mcp-server/src/tools/__tests__/gmail.test.ts', gmailTest);
