import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiEnvSchema, loadApiEnv } from '../env.js';

describe('Environment Validation', () => {
  const validEnv = {
    DATABASE_URL: 'postgres://localhost:5432/db',
    ANTHROPIC_API_KEY: 'sk-ant-1234567890',
    API_PORT: '3001',
    NODE_ENV: 'development',
  };

  beforeEach(() => {
    vi.stubGlobal('process', {
      ...process,
      env: { ...validEnv },
      exit: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should validate a valid environment', () => {
    const env = loadApiEnv(validEnv);
    expect(env.DATABASE_URL).toBe(validEnv.DATABASE_URL);
    expect(env.API_PORT).toBe(3001);
  });

  it('should throw or exit on invalid URL', () => {
    const invalidEnv = { ...validEnv, DATABASE_URL: 'not-a-url' };
    expect(() => loadApiEnv(invalidEnv)).toThrow();
  });

  it('should apply defaults', () => {
    const { API_PORT, NODE_ENV, ...minimalEnv } = validEnv;
    const env = loadApiEnv(minimalEnv as any);
    expect(env.API_PORT).toBe(3001);
    expect(env.NODE_ENV).toBe('development');
    expect(env.RATE_LIMIT_RPM).toBe(120);
  });

  it('should coerce numbers and booleans', () => {
    const env = loadApiEnv({
      ...validEnv,
      API_PORT: '4000',
      OTEL_ENABLED: 'true',
    });
    expect(env.API_PORT).toBe(4000);
    expect(env.OTEL_ENABLED).toBe(true);
  });

  it('should transform CORS_ORIGINS into an array', () => {
    const env = loadApiEnv({
      ...validEnv,
      CORS_ORIGINS: 'http://localhost:3000, https://app.closepilot.com',
    });
    expect(env.CORS_ORIGINS).toEqual(['http://localhost:3000', 'https://app.closepilot.com']);
  });
});
