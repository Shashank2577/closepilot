const fs = require('fs');

let testCode = fs.readFileSync('packages/mcp-server/src/tools/__tests__/gmail.test.ts', 'utf8');

// I made `searchEmails({ maxResults: 1 });` and `getMessage('msg1');`.
// But these need `authConfig` as well! Wait, `authConfig` wasn't passed in the test?
// Ah! `const emails = await searchEmails({ maxResults: 1 });`
// I removed the authConfig argument! Oh.
testCode = testCode.replace(
  "await searchEmails({ maxResults: 1 });",
  "await searchEmails({ maxResults: 1 }, { clientId: 'test', clientSecret: 'test', accessToken: 'test', refreshToken: 'test' } as any);"
);
testCode = testCode.replace(
  "await getMessage('msg1');",
  "await getMessage('msg1', { clientId: 'test', clientSecret: 'test', accessToken: 'test', refreshToken: 'test' } as any);"
);

fs.writeFileSync('packages/mcp-server/src/tools/__tests__/gmail.test.ts', testCode);
