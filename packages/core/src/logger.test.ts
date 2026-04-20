import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClosepilotLogger, createLogger } from './logger';

describe('ClosepilotLogger', () => {
  const originalEnv = process.env;
  let consoleSpy: any;

  beforeEach(() => {
    process.env = { ...originalEnv };
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    consoleSpy.mockRestore();
  });

  it('should log as json with standard fields', () => {
    process.env.LOG_LEVEL = 'info';
    const logger = createLogger('testAgent');

    logger.info('Test message', { dealId: 'deal_1' });

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const logCallStr = consoleSpy.mock.calls[0][0];
    const logJson = JSON.parse(logCallStr);

    expect(logJson.agentType).toBe('testAgent');
    expect(logJson.message).toBe('Test message');
    expect(logJson.dealId).toBe('deal_1');
    expect(logJson.level).toBe('info');
    expect(logJson.timestamp).toBeDefined();
  });

  it('should respect LOG_LEVEL', () => {
    process.env.LOG_LEVEL = 'error';
    const logger = createLogger('testAgent');

    logger.debug('Debug message'); // Level 0
    logger.info('Info message');   // Level 1
    logger.warn('Warn message');   // Level 2

    expect(consoleSpy).not.toHaveBeenCalled();

    logger.error('Error message'); // Level 3

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const logCallStr = consoleSpy.mock.calls[0][0];
    const logJson = JSON.parse(logCallStr);
    expect(logJson.level).toBe('error');
    expect(logJson.message).toBe('Error message');
  });
});
