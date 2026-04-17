const fs = require('fs');

let tTest = fs.readFileSync('packages/api/src/__tests__/telemetry.test.ts', 'utf8');

// Re-write it correctly
tTest = `import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockSdkStart = vi.fn();
const mockSdkShutdown = vi.fn().mockResolvedValue(undefined);

vi.mock('@opentelemetry/sdk-node', () => {
  return {
    NodeSDK: vi.fn().mockImplementation(() => ({
      start: mockSdkStart,
      shutdown: mockSdkShutdown,
    })),
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

let indexContent = fs.readFileSync('packages/api/src/index.ts', 'utf8');
indexContent = indexContent.replace(/\\\`Bearer \\\${token}\\\`/g, "`Bearer ${token}`");
fs.writeFileSync('packages/api/src/index.ts', indexContent);
