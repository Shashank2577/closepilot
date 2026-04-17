const fs = require('fs');

// telemetry.test.ts: NodeSDK constructor fix again
let tTest = fs.readFileSync('packages/api/src/__tests__/telemetry.test.ts', 'utf8');
tTest = tTest.replace(
  "vi.fn().mockImplementation(() => ({ start: mockSdkStart, shutdown: mockSdkShutdown }))",
  "vi.fn().mockImplementation(function() { return { start: mockSdkStart, shutdown: mockSdkShutdown }; })"
);
fs.writeFileSync('packages/api/src/__tests__/telemetry.test.ts', tTest);

// requestId.test.ts: wait, before it complained about requestId.ts, I changed it to .js but wait, I used `from '../requestId.js'` before and it failed? Wait, let's look at the failure: `Cannot find module '../requestId.js' imported from /app/packages/api/src/middleware/__tests__/requestId.test.ts`. Ah! Vitest with Typescript actually prefers resolving `.js` to `.ts` if it's there. But maybe it wants `../requestId` or `../requestId.ts`. The project uses `.js` imports for ESM. Let's see if we should try changing it to `../requestId.js` but wait, the failure says it cannot find it!
let reqTest = fs.readFileSync('packages/api/src/middleware/__tests__/requestId.test.ts', 'utf8');
reqTest = reqTest.replace("from '../requestId.js'", "from '../requestId.ts'");
fs.writeFileSync('packages/api/src/middleware/__tests__/requestId.test.ts', reqTest);

// metrics.test.ts -> Cannot find package '@closepilot/db/src/instrument.js'
// Let's modify index.ts to import from '@closepilot/db' instead of direct src/ file, or modify packages/db/package.json to export it. Wait, `packages/db/src/index.ts` exports it. So in `packages/api/src/index.ts`, change `@closepilot/db/src/instrument.js` to `@closepilot/db`
let indexTs = fs.readFileSync('packages/api/src/index.ts', 'utf8');
indexTs = indexTs.replace("import { instrumentedDb } from '@closepilot/db/src/instrument.js';", "import { instrumentedDb } from '@closepilot/db';");
fs.writeFileSync('packages/api/src/index.ts', indexTs);
