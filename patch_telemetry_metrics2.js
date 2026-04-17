const fs = require('fs');

// The vi.mock for class doesn't seem to work with mockImplementation in vitest.
// We should use a class directly in the mock return object.
let tTest = fs.readFileSync('packages/api/src/__tests__/telemetry.test.ts', 'utf8');
tTest = `import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockSdkStart = vi.fn();
const mockSdkShutdown = vi.fn().mockResolvedValue(undefined);

vi.mock('@opentelemetry/sdk-node', () => {
  return {
    NodeSDK: class {
      start() { mockSdkStart(); }
      shutdown() { return mockSdkShutdown(); }
    }
  };
});

vi.mock('../logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    child: vi.fn(),
  }
}));

import { initTelemetry } from '../telemetry.js';
import { logger } from '../logger.js';

describe('telemetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.OTEL_ENABLED;
  });

  it('OTEL_ENABLED=false yields no-op', () => {
    process.env.OTEL_ENABLED = 'false';
    initTelemetry();
    expect(logger.debug).toHaveBeenCalledWith('telemetry disabled');
    expect(mockSdkStart).not.toHaveBeenCalled();
  });

  it('OTEL_ENABLED=true calls SDK start', () => {
    process.env.OTEL_ENABLED = 'true';
    initTelemetry();
    expect(mockSdkStart).toHaveBeenCalled();
  });
});
`;
fs.writeFileSync('packages/api/src/__tests__/telemetry.test.ts', tTest);


// For metrics, instrumentedDb is not a function when importing index.js because of Vitest caching or some other reason?
// Actually in index.ts:
// import { instrumentedDb } from '@closepilot/db';
// But instrument.ts in @closepilot/db exports it. Maybe we need to mock @closepilot/db in metrics.test.ts or the index is breaking because instrument.js isn't resolved properly in node_modules yet (since it's a workspace but vitest runs on typescript).
// Since vitest transforms TS directly, the `packages/db/src/index.ts` should be loaded, which exports `instrument.js` (wait, does it export `instrument.ts`?)
// Let's modify metrics.test.ts to mock @closepilot/db so that getDb and instrumentedDb are just dummy functions.

let mTest = fs.readFileSync('packages/api/src/__tests__/metrics.test.ts', 'utf8');

const mockDb = `vi.mock('@closepilot/db', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    instrumentedDb: vi.fn(),
    getDb: vi.fn(),
    createDeal: vi.fn().mockResolvedValue({ id: 1 })
  };
});
`;

mTest = mTest.replace("import { Hono } from 'hono';", "import { Hono } from 'hono';\n" + mockDb);
fs.writeFileSync('packages/api/src/__tests__/metrics.test.ts', mTest);
