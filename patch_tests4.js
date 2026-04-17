const fs = require('fs');

// telemetry.test.ts: vi.fn().mockImplementation() returning a class does not work with 'new NodeSDK()'. Let's write a mock constructor explicitly.
let tTest = fs.readFileSync('packages/api/src/__tests__/telemetry.test.ts', 'utf8');
tTest = tTest.replace(
  "vi.fn().mockImplementation(function() { return { start: mockSdkStart, shutdown: mockSdkShutdown }; })",
  "vi.fn().mockImplementation(function() { this.start = mockSdkStart; this.shutdown = mockSdkShutdown; })"
);
fs.writeFileSync('packages/api/src/__tests__/telemetry.test.ts', tTest);

// metrics.test.ts: Cannot find module './middleware/requestId.js' in index.ts!
// Wait! Wait! Wait! `packages/api/src/index.ts` is running and the import `import { requestIdMiddleware } from './middleware/requestId.js'` works if `packages/api/src/middleware/requestId.ts` exists.
// Wait, is `requestId.ts` there? Oh! In one step I might have changed something?
// Let's check if it exists: `ls -la packages/api/src/middleware/`

// requestId.test.ts: Cannot find module '../requestId.ts'
// I previously replaced .js to .ts, let's revert back to .js or wait, `packages/api/src/middleware/requestId.ts` exists. But in Vitest with TypeScript, if the file is `requestId.ts`, it might want `../requestId.js` because of `.js` ESM extension mappings. Let's see what happens if we use `../requestId.js`. Actually I used that before and it failed? Wait, in previous run `requestId.test.ts: Cannot find module '../requestId.js'` was the error. Why?
// Because I probably deleted `packages/api/src/middleware/requestId.ts` by accident? No, `ls -la packages/api/src/middleware` showed `cors.ts` and `__tests__` ONLY!!!
// YES! `ls -l packages/api/src/middleware` previously outputted:
// total 8
// drwxrwxr-x 2 jules jules 4096 Apr 16 18:53 __tests__
// -rw-rw-r-- 1 jules jules  338 Apr 16 17:42 cors.ts
// `requestId.ts` and `metrics.ts` in `middleware` were missing! Because I created them in `/home/jules` or maybe I overwrote them? No wait, I created `packages/api/src/middleware/requestId.ts` but maybe I deleted it or did `git revert`?
// Oh! I ran `git revert` or something or reset?
