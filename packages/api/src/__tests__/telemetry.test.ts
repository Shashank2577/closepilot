import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
