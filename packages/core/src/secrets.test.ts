import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SecretProvider } from './secrets';

describe('SecretProvider', () => {
  const originalEnv = process.env;
  let secrets: SecretProvider;

  beforeEach(() => {
    process.env = { ...originalEnv };
    secrets = new SecretProvider();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return env var when present', () => {
    process.env.ANTHROPIC_API_KEY = 'test_key';
    expect(secrets.getAnthropicKey()).toBe('test_key');
  });

  it('should throw descriptive error when missing', () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(() => secrets.getAnthropicKey()).toThrowError('Missing required environment variable: ANTHROPIC_API_KEY');
  });

  it('should get google client id', () => {
    process.env.GOOGLE_CLIENT_ID = 'g_client';
    expect(secrets.getGoogleClientId()).toBe('g_client');
  });

  it('should get google client secret', () => {
    process.env.GOOGLE_CLIENT_SECRET = 'g_secret';
    expect(secrets.getGoogleClientSecret()).toBe('g_secret');
  });

  it('should get database url', () => {
    process.env.DATABASE_URL = 'postgres://test';
    expect(secrets.getDatabaseUrl()).toBe('postgres://test');
  });

  it('should get mcp port', () => {
    process.env.MCP_PORT = '3000';
    expect(secrets.getMcpPort()).toBe('3000');
  });
});
