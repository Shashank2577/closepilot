import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { securityHeadersMiddleware } from '../securityHeaders.js';

describe('Security Headers Middleware', () => {
  it('should set security headers', async () => {
    const app = new Hono();
    app.use('*', securityHeadersMiddleware);
    app.get('/test', (c) => c.text('ok'));

    const res = await app.request('/test');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    expect(res.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(res.headers.get('Content-Security-Policy')).toBe("default-src 'self'");
  });
});
