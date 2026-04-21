import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { z } from 'zod';
import { validate } from '../validate.js';

describe('Validation Helper', () => {
  const schema = z.object({
    name: z.string().min(1),
    age: z.number().positive(),
  });

  it('should return data when valid', async () => {
    const app = new Hono();
    app.post('/test', async (c) => {
      const result = await validate(c, schema);
      if (result.success) {
        return c.json(result.data);
      }
      return result.response;
    });

    const res = await app.request('/test', {
      method: 'POST',
      body: JSON.stringify({ name: 'John', age: 30 }),
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ name: 'John', age: 30 });
  });

  it('should return 400 when invalid', async () => {
    const app = new Hono();
    app.post('/test', async (c) => {
      const result = await validate(c, schema);
      if (result.success) {
        return c.json(result.data);
      }
      return result.response;
    });

    const res = await app.request('/test', {
      method: 'POST',
      body: JSON.stringify({ name: '', age: -5 }),
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('validation_failed');
    expect(body.issues).toHaveLength(2);
  });

  it('should return 400 on invalid JSON', async () => {
    const app = new Hono();
    app.post('/test', async (c) => {
      const result = await validate(c, schema);
      if (result.success) {
        return c.json(result.data);
      }
      return result.response;
    });

    const res = await app.request('/test', {
      method: 'POST',
      body: 'invalid-json',
      headers: { 'Content-Type': 'application/json' },
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('validation_failed');
    expect(body.message).toBe('Invalid JSON body');
  });
});
