const fs = require('fs');

// The `gmail.test.ts` failure: `TypeError: [vitest] vi.mock("@anthropic-ai/sdk", factory?: () => unknown) is not returning an object`
// In my `gmail.test.ts` rewrite:
// `vi.mock('@anthropic-ai/sdk', () => ({ default: class { messages = { create: vi.fn().mockResolvedValue(...) } } }));`
// Vitest expects default exports to be like `export default class Anthropic {}`.
// The problem is `vi.mock` must return an object with a default property or a function if no default. But my mock IS an object with `default`. Wait, in vitest, `default` export mocks should be: `return { default: ... }`.
let gmailTest = fs.readFileSync('packages/mcp-server/src/tools/__tests__/gmail.test.ts', 'utf8');
gmailTest = gmailTest.replace(
  "default: class {",
  "default: class Anthropic {"
);
fs.writeFileSync('packages/mcp-server/src/tools/__tests__/gmail.test.ts', gmailTest);

// The `drive.test.ts` failures: `Error: Google service account credentials not configured`
// I added `process.env.GOOGLE_CLIENT_EMAIL = 'test@example.com';` to `drive.test.ts`.
// BUT `src/utils/google-auth.ts` is imported, and inside `getDriveClient` it calls `initializeGoogleClients`.
// Wait, `process.env` modifications in tests need to happen before imports, or we need to just mock `initializeGoogleClients` inside `vi.mock('../utils/google-auth')`.
// In `drive.test.ts` I had:
// `vi.mock('../utils/google-auth', () => ({ getDriveClient: vi.fn().mockReturnValue(...), getDocsClient: vi.fn().mockReturnValue(...), initializeGoogleClients: vi.fn() }));`
// If it is mocked, WHY is `initializeGoogleClients` throwing the error?
// Wait, the error comes from `src/utils/google-auth.ts:19`!
// This means the mock is NOT being applied or `initializeGoogleClients` from the actual file is running!
// Oh, the actual `drive.ts` file imports `getDriveClient` from `../utils/google-auth`.
// If the mock path was wrong, the actual file runs.
// `vi.mock('../utils/google-auth', () => ({ ... }))`
// Let's check where `drive.ts` imports it: `import { getDriveClient, getDocsClient } from '../utils/google-auth';`
// In `drive.test.ts`, the mock should be `vi.mock('../utils/google-auth')`.
// Let's check `drive.test.ts` contents.
let driveTest = fs.readFileSync('packages/mcp-server/src/__tests__/drive.test.ts', 'utf8');
driveTest = driveTest.replace(
  "vi.mock('../utils/google-auth'",
  "vi.mock('../utils/google-auth.js'"
);
// Actually, vitest might need exactly the same import path as used in the file being tested!
// `src/tools/drive.ts` imports from `../utils/google-auth.js`!
fs.writeFileSync('packages/mcp-server/src/__tests__/drive.test.ts', driveTest);

// calendar.test.ts
// `createEvent`: `Cannot read properties of undefined (reading 'summary')`
let calTest = fs.readFileSync('packages/mcp-server/src/tests/calendar.test.ts', 'utf8');
calTest = calTest.replace(/callArg\.requestBody\.summary/g, "callArg.resource.summary");
fs.writeFileSync('packages/mcp-server/src/tests/calendar.test.ts', calTest);
