const fs = require('fs');

// The issue in index.ts: Module '@closepilot/db' has no exported member 'instrumentedDb'.
// I added `export * from './instrument.js';` to packages/db/src/index.ts, but `packages/db/src/instrument.ts` must export `instrumentedDb`. It does: `export function instrumentedDb(db: PostgresJsDatabase<any>): PostgresJsDatabase<any> {`.
// Let's modify index.ts to import from `@closepilot/db/src/instrument.js` instead.
// Also fix metrics.test.ts where `const actual = await importOriginal();` is treated as any or not an object for spread. Use `...((actual as object) || {})` instead.

let index = fs.readFileSync('packages/api/src/index.ts', 'utf8');
index = index.replace("import { instrumentedDb } from '@closepilot/db';", "import { instrumentedDb } from '@closepilot/db/src/instrument.js';");
fs.writeFileSync('packages/api/src/index.ts', index);

let metricsTest = fs.readFileSync('packages/api/src/__tests__/metrics.test.ts', 'utf8');
metricsTest = metricsTest.replace("...actual,", "...(actual as object),");
fs.writeFileSync('packages/api/src/__tests__/metrics.test.ts', metricsTest);
