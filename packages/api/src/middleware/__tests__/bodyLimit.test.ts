import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { bodyLimitMiddleware } from '../bodyLimit.js';

describe('Body Limit Middleware', () => {
  it('should allow requests under the limit', async () => {
    const app = new Hono();
    app.use('*', bodyLimitMiddleware);
    app.post('/test', (c) => c.text('ok'));
    
    const res = await app.request('/test', {
      method: 'POST',
      headers: {
        'Content-Length': '1024',
      },
    });
    expect(res.status).toBe(200);
  });

  it('should block requests over the limit', async () => {
    const app = new Hono();
    app.use('*', bodyLimitMiddleware);
    app.post('/test', (c) => c.text('ok'));

    const res = await app.request('/test', {
      method: 'POST',
      headers: {
        'Content-Length': (300 * 1024).toString(), // 300KB > 256KB default
      },
    });
    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.error).toBe('payload_too_large');
  });

  it('should skip limit for GET requests', async () => {
    const app = new Hono();
    app.use('*', bodyLimitMiddleware);
    app.get('/test-get', (c) => c.text('ok'));
    
    const res = await app.request('/test-get', {
      headers: {
        'Content-Length': (1000 * 1024).toString(),
      },
    });
    expect(res.status).toBe(200);
  });
});
