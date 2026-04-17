const fs = require('fs');

// drive.test.ts
// `Cannot find package 'google-auth-library'`
// I installed it but it seems `google-auth-library` might not be in `@closepilot/mcp-server` package.json or node_modules correctly since it was `Cannot find package 'google-auth-library'`.
// Wait, I can just use `google` from `googleapis` which is already installed.
// Or I can mock `../utils/google-auth` to just not throw error!
// The error is actually IN `src/utils/google-auth.ts` failing to compile.
// I will rewrite `src/utils/google-auth.ts` to mock google-auth-library if needed. Or just replace `google-auth-library` import in `src/utils/google-auth.ts`?
// Let's modify `src/utils/google-auth.ts` to not fail.
let authTs = fs.readFileSync('packages/mcp-server/src/utils/google-auth.ts', 'utf8');
authTs = authTs.replace("import { JWT } from 'google-auth-library';", "const JWT = require('googleapis').google.auth.JWT;");
fs.writeFileSync('packages/mcp-server/src/utils/google-auth.ts', authTs);

// gmail.test.ts
// `ReferenceError: jest is not defined`
let gmailTest = fs.readFileSync('packages/mcp-server/src/tools/__tests__/gmail.test.ts', 'utf8');
gmailTest = gmailTest.replace(/jest\.mock/g, 'vi.mock');
gmailTest = gmailTest.replace(/jest\.fn/g, 'vi.fn');
fs.writeFileSync('packages/mcp-server/src/tools/__tests__/gmail.test.ts', gmailTest);

// calendar.test.ts
let calendarTest = fs.readFileSync('packages/mcp-server/src/tests/calendar.test.ts', 'utf8');

// `createEvent` - `params.startTime.toISOString is not a function` -> `Cannot read properties of undefined (reading 'dateTime')`
// `insertMock.mockResolvedValueOnce({ data: { id: 'test-event-1', htmlLink: ... } })`
// `createEvent` expects `data.start.dateTime`.
calendarTest = calendarTest.replace(
  "data: { id: 'test-event-1', htmlLink: 'https://calendar.google.com/test', hangoutLink: 'https://meet.google.com/test' }",
  "data: { id: 'test-event-1', htmlLink: 'https://calendar.google.com/test', hangoutLink: 'https://meet.google.com/test', start: { dateTime: '2024-05-01T10:00:00Z' }, end: { dateTime: '2024-05-01T11:00:00Z' }, summary: 'Test Meeting' }"
);

// `scheduleMeeting`
calendarTest = calendarTest.replace(
  "data: { id: 'new-event-1', htmlLink: 'https://calendar.google.com/test' }",
  "data: { id: 'new-event-1', htmlLink: 'https://calendar.google.com/test', start: { dateTime: '2024-05-01T09:00:00Z' }, end: { dateTime: '2024-05-01T10:00:00Z' }, summary: 'Project Kickoff' }"
);

// `findAvailableSlots` -> `Cannot read properties of undefined (reading 'clientId')`
// `findAvailableSlots({ attendees: ['test@example.com'], dateRange: { start: '2024-05-01T09:00:00Z', end: '2024-05-01T17:00:00Z' }, duration: 30, authConfig: auth } as any)`
// In `calendar.ts`, `findAvailableSlots` takes `(params, authConfig)`.
calendarTest = calendarTest.replace(
  "findAvailableSlots({ attendees: ['test@example.com'], dateRange: { start: '2024-05-01T09:00:00Z', end: '2024-05-01T17:00:00Z' }, duration: 30, authConfig: auth } as any)",
  "findAvailableSlots({ attendees: ['test@example.com'], windowStart: new Date('2024-05-01T09:00:00Z'), windowEnd: new Date('2024-05-01T17:00:00Z'), duration: 30 } as any, auth)"
);

// `scheduleMeeting` -> `check.windowStart.toISOString is not a function`
// Because `scheduleMeeting` passes `timeframe: { start: '...', end: '...' }` inside proposedTimes?
// Let's replace `proposedTimes: [{ start: '2024-05-01T09:00:00Z', end: '2024-05-01T17:00:00Z' }]`
// Wait, `check.windowStart` in `checkAvailability` inside `findBestSlot`!
calendarTest = calendarTest.replace(
  "proposedTimes: [{ start: '2024-05-01T09:00:00Z', end: '2024-05-01T17:00:00Z' }]",
  "proposedTimes: [{ start: new Date('2024-05-01T09:00:00Z'), end: new Date('2024-05-01T17:00:00Z') }]"
);
calendarTest = calendarTest.replace(
  "proposedTimes: [{ start: '2024-05-01T09:00:00Z', end: '2024-05-01T10:00:00Z' }]",
  "proposedTimes: [{ start: new Date('2024-05-01T09:00:00Z'), end: new Date('2024-05-01T10:00:00Z') }]"
);

fs.writeFileSync('packages/mcp-server/src/tests/calendar.test.ts', calendarTest);
