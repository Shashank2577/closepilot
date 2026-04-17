const fs = require('fs');

// telemetry.test.ts
// vitest mock constructor for class:
let tTest = fs.readFileSync('packages/api/src/__tests__/telemetry.test.ts', 'utf8');
tTest = tTest.replace(
  "vi.fn().mockImplementation(function() { this.start = mockSdkStart; this.shutdown = mockSdkShutdown; })",
  "class { start() { mockSdkStart(); } shutdown() { return mockSdkShutdown(); } }"
);
fs.writeFileSync('packages/api/src/__tests__/telemetry.test.ts', tTest);


// index.ts: import instrumentedDb from @closepilot/db is causing "instrumentedDb is not a function" in metrics.test.ts
// Wait, is it exported? packages/db/src/index.ts has `export * from './instrument.js';`
// But wait! Did I build @closepilot/db after adding instrument.ts?
// Ah! Let's just build @closepilot/db!
