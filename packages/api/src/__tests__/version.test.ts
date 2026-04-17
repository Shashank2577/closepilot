import { describe, it, expect } from 'vitest';
import app from '../index';

describe('GET /api/version', () => {
  it('returns expected shape via app.request()', async () => {
    process.env.GIT_SHA = 'abcdef1234567890';
    process.env.BUILT_AT = '2026-04-16T12:00:00Z';
    process.env.APP_VERSION = '0.1.0';

    const req = new Request('http://localhost/api/version');
    const res = await app.request(req);

    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty('version', '0.1.0');
    expect(body).toHaveProperty('gitSha', 'abcdef1234567890');
    expect(body).toHaveProperty('builtAt', '2026-04-16T12:00:00Z');
    expect(body).toHaveProperty('node');
  });
});
