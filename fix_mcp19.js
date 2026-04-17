const fs = require('fs');

// drive.test.ts: generateDocument expects 'new-doc-id' but gets ''.
// I am mocking `driveTools.listTemplates` to return `[{ id: 'template-1' ... }]`.
// Wait, `generateDocument` calls `getTemplate` which is imported from `driveTools` internally in the same module!
// So mocking `listTemplates` via `vi.spyOn` might NOT mock the internal call to `listTemplates` inside `getTemplate` inside `generateDocument`.
// Wait! `generateDocument` is in `drive.ts`. `getTemplate` is in `drive.ts`.
// Inside `drive.ts`, `const templates = await listTemplates()` is called.
// With ES modules, you cannot mock an internal function call within the same file easily.
// So I should mock the actual `google-auth.js` return value for `list` to return `template-1`.
// Oh! In `fix_mcp18.js` I set `vi.mock('../utils/google-auth.js', () => ({ getDriveClient: ... list: vi.fn().mockResolvedValue(...) ... }))`
// What was the return value?
// `files: [ { id: 'template-1', name: 'Proposal Template' }, ... ]`
// Wait, why didn't `list` return that?
// Because in `drive.ts:145` `const response = await drive.files.list({ q: \`'\${templatesFolderId}' in parents...\` })`
// Oh! It requires `templatesFolderId` which is `process.env.DRIVE_TEMPLATES_FOLDER_ID`.
// BUT if `process.env.DRIVE_TEMPLATES_FOLDER_ID` is loaded BEFORE `drive.test.ts` sets it, it evaluates to undefined!
// And `listTemplates()` throws error or something.
// Wait, `listTemplates returns mock templates` PASSED! It means `listTemplates()` works and returns 2 templates!
// So why doesn't `generateDocument` find the template?
// In `generateDocument`:
// `const template = await getTemplate(request.templateId);`
// In `getTemplate`:
// `const templates = await listTemplates(); return templates.find(t => t.id === templateId);`
// If `listTemplates` returns `[ { id: 'template-1' } ]`, it SHOULD find it!
// Why does it fail?
// Let's modify `drive.test.ts` to see what's happening or just change the mock.
let driveTest = fs.readFileSync('packages/mcp-server/src/__tests__/drive.test.ts', 'utf8');

// I will just redefine the whole file again to be absolutely sure.
driveTest = `import { describe, it, expect, vi, beforeEach } from 'vitest';

process.env.DRIVE_TEMPLATES_FOLDER_ID = 'test-folder';
process.env.GOOGLE_CLIENT_EMAIL = 'test@example.com';
process.env.GOOGLE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----';

import { google } from 'googleapis';
import * as driveTools from '../tools/drive.js';

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
    const templates = await driveTools.listTemplates();
    expect(templates.length).toBe(2);
    expect(templates[0].id).toBe('template-1');
  });

  it('generateDocument creates document and returns result', async () => {
    // If listTemplates returns correctly, generateDocument should find template-1.
    // Let's just bypass it if it fails:
    const result = await driveTools.generateDocument({
      templateId: 'template-1',
      title: 'Generated Proposal',
      folderId: 'folder-1',
      replacements: { '{{Client_Name}}': 'Acme Corp' }
    });

    // Wait, the actual return might be { documentId: '', driveUrl: '' } because something failed silently.
    // I will mock `getTemplate` directly!
    // But it's not exported.
    expect(result.documentId).toBe('new-doc-id');
  });

  it('getDownloadUrl returns export link', async () => {
    const url = await driveTools.getDownloadUrl('new-doc-id', 'pdf');
    expect(url).toBe('https://export-link.com/pdf');
  });
});
`;
fs.writeFileSync('packages/mcp-server/src/__tests__/drive.test.ts', driveTest);

// For gmail.test.ts, `searchEmails` expects `emails.messages` to have length 1, but it got 0.
// Because my mock `listMock.mockResolvedValueOnce({ data: { messages: [{ id: 'msg1' }] } })` is returning `{ data: { messages: [{ id: 'msg1' }] } }`.
// Wait, `searchEmails({ maxResults: 1 })` inside `gmail.ts`:
// `const response = await gmail.users.messages.list({ userId: 'me', q: query.query, maxResults: query.maxResults, pageToken: query.pageToken });`
// `return { messages: await Promise.all(response.data.messages.map(m => getMessage(m.id))), ... }`
// Ah! `searchEmails` maps over messages and calls `getMessage(m.id)`!
// And `getMessage` calls `gmail.users.messages.get({ userId: 'me', id: messageId })`.
// So `getMock` is called.
// BUT `getMessage` returned undefined! Because `getMock` returned undefined?
// `mocks.getMock.mockResolvedValueOnce({ data: { id: 'msg1', payload: { headers: [] } } })`
// Let's fix `gmail.test.ts` to mock correctly.
