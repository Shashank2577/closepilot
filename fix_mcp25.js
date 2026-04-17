const fs = require('fs');

let gmailTest = fs.readFileSync('packages/mcp-server/src/tools/__tests__/gmail.test.ts', 'utf8');

// I replaced `mocks.getMock` but `mocks` is not defined?
// Ah! In `fix_mcp17.js` I used `const getMock = vi.fn(); const listMock = vi.fn(); ...` and passed them to the googleapis mock.
// SO I don't need `mocks.listMock`, I just need `listMock.mockResolvedValueOnce`!
gmailTest = gmailTest.replace(/mocks\.listMock/g, "listMock");
gmailTest = gmailTest.replace(/mocks\.getMock/g, "getMock");
gmailTest = gmailTest.replace(/mocks\.modifyMock/g, "modifyMock");
gmailTest = gmailTest.replace(/mocks\.sendMock/g, "sendMock");

// Also remove the require('googleapis') and google.gmail() inside the tests.
gmailTest = gmailTest.replace(
  "const { google } = require('googleapis');\n    const gmailMock = google.gmail().users.messages;",
  ""
);

fs.writeFileSync('packages/mcp-server/src/tools/__tests__/gmail.test.ts', gmailTest);
