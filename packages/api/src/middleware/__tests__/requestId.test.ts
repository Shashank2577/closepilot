import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { requestIdMiddleware } from '../requestId.js';

describe('requestIdMiddleware', () => {
  it('generates UUID when absent', async () => {
    const app = new Hono();
    app.use('*', requestIdMiddleware);
    app.get('/', (c) => c.text((c.get as any)('requestId') as string));

    const res = await app.request('/');
    expect(res.status).toBe(200);
    const id = await res.text();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(res.headers.get('x-request-id')).toBe(id);
  });

  it('honors header', async () => {
    const app = new Hono();
    app.use('*', requestIdMiddleware);
    app.get('/', (c) => c.text((c.get as any)('requestId') as string));

    const req = new Request('http://localhost/', {
      headers: { 'x-request-id': 'custom-abc' }
    });
    const res = await app.request(req);
    expect(res.status).toBe(200);
    const id = await res.text();
    expect(id).toBe('custom-abc');
  });

  it('echoes in response', async () => {
    const app = new Hono();
    app.use('*', requestIdMiddleware);
    app.get('/', (c) => c.text('ok'));

    const req = new Request('http://localhost/', {
      headers: { 'x-request-id': 'echo-me' }
    });
    const res = await app.request(req);
    expect(res.headers.get('x-request-id')).toBe('echo-me');
  });

  it('malformed header falls back to UUID', async () => {
    const app = new Hono();
    app.use('*', requestIdMiddleware);
    app.get('/', (c) => c.text((c.get as any)('requestId') as string));

    // malformed: > 128 chars
    const longId = 'a'.repeat(200);
    const req = new Request('http://localhost/', {
      headers: { 'x-request-id': longId }
    });
    const res = await app.request(req);
    const id = await res.text();
    expect(id).not.toBe(longId);
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });
});
