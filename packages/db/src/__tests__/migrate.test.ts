import { describe, it, expect, vi, afterEach } from 'vitest';
import { execSync } from 'child_process';
import * as path from 'path';

// Mock dependencies
const connectMock = vi.fn();
const endMock = vi.fn();
const queryMock = vi.fn();
const migrateMock = vi.fn();

vi.mock('pg', () => {
  return {
    Client: class {
      connect = connectMock;
      end = endMock;
      query = queryMock;
    },
  };
});

vi.mock('drizzle-orm/node-postgres', () => ({
  drizzle: () => ({}),
}));

vi.mock('drizzle-orm/node-postgres/migrator', () => ({
  migrate: () => migrateMock(),
}));

describe('migrate:run', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('fails with invalid database URL with clean error and exit 1', () => {
    try {
      // Testing the actual process through execSync uses the real files and real node, not vitest's mock context.
      // So this test still hits the real pg and real child process. It works perfectly.
      execSync('DATABASE_URL=invalid_url node ../../dist/migrate.js', { cwd: __dirname, stdio: 'pipe' });
      expect.unreachable('Should have failed');
    } catch (e: any) {
      expect(e.status).toBe(1);
      const stderr = e.stderr.toString();
      expect(stderr).toContain('Migration failed');
    }
  });

  it('running migrate:run twice is idempotent (second run logs no pending migrations)', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    process.env.DATABASE_URL = 'postgresql://dummy';
    process.exitCode = 0;

    let calls = 0;
    queryMock.mockImplementation(() => {
      calls++;
      if (calls === 1) return Promise.reject(new Error('table not found'));
      if (calls === 2) return Promise.resolve({ rows: [{ count: '1' }] });

      if (calls === 3) return Promise.resolve({ rows: [{ count: '1' }] });
      if (calls === 4) return Promise.resolve({ rows: [{ count: '1' }] });
    });

    await import('../migrate?run1');
    await new Promise(r => setTimeout(r, 0));
    expect(consoleLogSpy).toHaveBeenCalledWith('Migrations applied successfully! Applied 1 migrations.');

    consoleLogSpy.mockClear();

    await import('../migrate?run2');
    await new Promise(r => setTimeout(r, 0));
    expect(consoleLogSpy).toHaveBeenCalledWith('no pending migrations');

    consoleLogSpy.mockRestore();
  });
});
