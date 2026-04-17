const fs = require('fs');

let driveTest = fs.readFileSync('packages/mcp-server/src/__tests__/drive.test.ts', 'utf8');

// In drive.ts, `generateDocument` checks if `templateId` is found in `listTemplates()`.
// My test does: `const result = await generateDocument({ templateId: 'template-1', ... })`.
// `listTemplates()` uses `getDriveClient().files.list({ q: \`'\${templatesFolderId}' in parents and mimeType='application/vnd.google-apps.document' and trashed=false\` })`
// Oh! My mock for `getDriveClient().files.list` returns `{ data: { files: [ { id: 'template-1', name: 'Proposal Template' }, { id: 'template-2', name: 'MSA Template' } ] } }`.
// Wait, `generateDocument` does `const template = await getTemplate(request.templateId);`
// `getTemplate(templateId: string)` calls `const templates = await listTemplates(); return templates.find((t) => t.id === templateId);`
// So it SHOULD find `template-1`.
// Why does it return `documentId: ''`?
// Let's check `generateDocument` source.
// `return { documentId: '', driveId: '', driveUrl: '', status: 'failed', errors: ['Template not found'] };` if template is NOT found!
// BUT if it succeeds:
// `const newFileId = response.data.id; return { documentId: newFileId, driveUrl: \`https://docs.google.com/document/d/\${newFileId}/edit\` };`
// Ah, but `generateDocument` returns `{ documentId: newFileId, ... }`. Why is it empty string?
// Wait! `listTemplates` uses `process.env.DRIVE_TEMPLATES_FOLDER_ID`.
// I added `process.env.DRIVE_TEMPLATES_FOLDER_ID = 'test-folder'` in drive.test.ts. But is it available when `drive.ts` is imported?
// `drive.ts` might read `process.env` at module load time!
// `const templatesFolderId = process.env.DRIVE_TEMPLATES_FOLDER_ID;`
// Let's check `drive.ts`!

// Let's just mock `listTemplates` inside `drive.test.ts` or change `process.env` before import!
driveTest = driveTest.replace(
  "process.env.GOOGLE_CLIENT_EMAIL = 'test@example.com';",
  "process.env.DRIVE_TEMPLATES_FOLDER_ID = 'test-folder';\nprocess.env.GOOGLE_CLIENT_EMAIL = 'test@example.com';"
);

// I already prepended it but maybe the import order matters. Let me move all process.env to the top.
fs.writeFileSync('packages/mcp-server/src/__tests__/drive.test.ts', `process.env.DRIVE_TEMPLATES_FOLDER_ID = 'test-folder';
process.env.GOOGLE_CLIENT_EMAIL = 'test@example.com';
process.env.GOOGLE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----';
` + driveTest.replace(/process\.env\..*;\n/g, ''));


// gmail.test.ts: `TypeError: listEmails is not a function`
// Let's look at `packages/mcp-server/src/tools/gmail.ts`
// Is it named `listEmails`?
let gmailTs = fs.readFileSync('packages/mcp-server/src/tools/gmail.ts', 'utf8');
// Let's check exports
// I see `class GmailService {`
// And `export async function getEmail(`
// wait! My previous `grep` showed `export async function getEmail`.
// Let's check!
