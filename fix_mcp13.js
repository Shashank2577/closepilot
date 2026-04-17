const fs = require('fs');

// Ah! `gmail.ts` has `searchEmails`, `getMessage`, `getThread` !
// NOT `listEmails`, `getEmail`.
// My test had `listEmails` and `getEmail`.
let gmailTest = fs.readFileSync('packages/mcp-server/src/tools/__tests__/gmail.test.ts', 'utf8');

gmailTest = gmailTest.replace(/listEmails/g, 'searchEmails');
gmailTest = gmailTest.replace(/getEmail/g, 'getMessage');

fs.writeFileSync('packages/mcp-server/src/tools/__tests__/gmail.test.ts', gmailTest);
