const fs = require('fs');

let gmailTest = fs.readFileSync('packages/mcp-server/src/tools/__tests__/gmail.test.ts', 'utf8');

// I removed `listMock.mockResolvedValueOnce`!
// Let's add them back to the test.

gmailTest = gmailTest.replace(
  "const emails = await searchEmails({ maxResults: 1 }",
  `const { google } = require('googleapis');
    const gmailMock = google.gmail().users.messages;
    gmailMock.list.mockResolvedValueOnce({ data: { messages: [{ id: 'msg1' }] } });
    gmailMock.get.mockResolvedValueOnce({
      data: {
        id: 'msg1', threadId: 'thread1', snippet: 'Test snippet',
        payload: { headers: [{ name: 'Subject', value: 'Test Subject' }, { name: 'From', value: 'sender@example.com' }, { name: 'Date', value: new Date().toISOString() }] }
      }
    });
    const emails = await searchEmails({ maxResults: 1 }`
);

gmailTest = gmailTest.replace(
  "const email = await getMessage('msg1'",
  `const { google } = require('googleapis');
    const gmailMock = google.gmail().users.messages;
    gmailMock.get.mockResolvedValueOnce({
      data: {
        id: 'msg1', threadId: 'thread1', snippet: 'Test snippet',
        payload: {
          headers: [{ name: 'Subject', value: 'Test Subject' }, { name: 'From', value: 'sender@example.com' }, { name: 'Date', value: new Date().toISOString() }],
          parts: [{ mimeType: 'text/plain', body: { data: Buffer.from('Test body').toString('base64') } }]
        }
      }
    });
    const email = await getMessage('msg1'`
);

fs.writeFileSync('packages/mcp-server/src/tools/__tests__/gmail.test.ts', gmailTest);
