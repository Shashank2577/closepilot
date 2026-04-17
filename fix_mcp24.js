const fs = require('fs');
let gmailTest = fs.readFileSync('packages/mcp-server/src/tools/__tests__/gmail.test.ts', 'utf8');

// I imported `google` via `require('googleapis')`. But I ALREADY MOCKED googleapis at the top of the file!
// `vi.mock('googleapis', () => ({ google: { gmail: vi.fn(() => ({ ... })) } }))`
// My mock `gmail()` takes NO arguments and returns an object.
// BUT the original `googleapis.google.gmail` expects an object `{ version: 'v1' }`.
// Wait, `google.gmail()` without args throws `Argument error: Accepts only string or object`.
// It's calling the ACTUAL `googleapis.google.gmail` because `require` might bypass the mock?
// Or my mock is not used because of `require` vs `import`?
// Let's use `mocks.getMock` instead!
gmailTest = gmailTest.replace(/const \{ google \} = require\('googleapis'\);\n\s*const gmailMock = google\.gmail\(\)\.users\.messages;\n\s*gmailMock\.list\.mockResolvedValueOnce/g, "mocks.listMock.mockResolvedValueOnce");
gmailTest = gmailTest.replace(/gmailMock\.get\.mockResolvedValueOnce/g, "mocks.getMock.mockResolvedValueOnce");
gmailTest = gmailTest.replace(/const \{ google \} = require\('googleapis'\);\n\s*const gmailMock = google\.gmail\(\)\.users\.messages;\n\s*gmailMock\.get\.mockResolvedValueOnce/g, "mocks.getMock.mockResolvedValueOnce");

fs.writeFileSync('packages/mcp-server/src/tools/__tests__/gmail.test.ts', gmailTest);
