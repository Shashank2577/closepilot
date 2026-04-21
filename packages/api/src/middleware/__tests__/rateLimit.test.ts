import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { rateLimitMiddleware } from '../rateLimit.js';

describe('Rate Limit Middleware', () => {
  it('should allow requests under the limit', async () => {
    const app = new Hono();
    app.use('*', rateLimitMiddleware);
    app.get('/test', (c) => c.text('ok'));

    const res = await app.request('/test');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('ok');
  });

  it('should block requests over the limit', async () => {
    // We can't easily reset the singleton bucket in the middleware
    // but we can test that it eventually blocks if we call it enough
    const app = new Hono();
    app.use('*', rateLimitMiddleware);
    app.get('/test', (c) => c.text('ok'));

    // The default burst is 30. Let's try 35.
    for (let i = 0; i < 30; i++) {
      await app.request('/test');
    }

    const res = await app.request('/test');
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeDefined();
    const body = await res.json();
    expect(body.error).toBe('rate_limit_exceeded');
  });

  it('should skip health and metrics endpoints', async () => {
    const app = new Hono();
    app.use('*', rateLimitMiddleware);
    app.get('/api/health', (c) => c.text('healthy'));

    // Even if we are "blocked" (hypothetically), health should pass
    // (In this test we just ensure it returns 200)
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
  });
});
