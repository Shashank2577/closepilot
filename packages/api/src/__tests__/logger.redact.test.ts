import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to mock console.log to capture the output
describe('Logger Redaction', () => {
  let logOutput: string = '';
  const originalLog = console.log;

  beforeEach(async () => {
    logOutput = '';
    console.log = vi.fn((msg: string) => {
      logOutput = msg;
    });
    // Set NODE_ENV to production to get JSON output
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('LOG_LEVEL', 'debug');
  });

  afterEach(() => {
    console.log = originalLog;
    vi.unstubAllEnvs();
  });

  it('should redact sensitive fields at top level', async () => {
    const { logger } = await import('../logger.js');
    logger.info({ apiKey: 'sk-12345', safe: 'data' }, 'test message');
    
    const record = JSON.parse(logOutput);
    expect(record.apiKey).toBe('[REDACTED]');
    expect(record.safe).toBe('data');
  });

  it('should redact sensitive fields in nested objects', async () => {
    const { logger } = await import('../logger.js');
    logger.info({ 
      user: { 
        name: 'John',
        password: 'password123' 
      } 
    }, 'test message');
    
    const record = JSON.parse(logOutput);
    expect(record.user.name).toBe('John');
    expect(record.user.password).toBe('[REDACTED]');
  });

  it('should be case-insensitive for sensitive keys', async () => {
    const { logger } = await import('../logger.js');
    logger.info({ Authorization: 'Bearer token' }, 'test message');
    
    const record = JSON.parse(logOutput);
    expect(record.Authorization).toBe('[REDACTED]');
  });
});
