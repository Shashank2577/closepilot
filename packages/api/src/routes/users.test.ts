import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { SignJWT } from 'jose';
import { usersRoutes } from './users.js';
import { UserRole } from '@closepilot/core';
import type { AppContext } from '../types.js';

const JWT_SECRET = 'test_secret_for_users';
process.env.JWT_SECRET = JWT_SECRET;
const secret = new TextEncoder().encode(JWT_SECRET);

async function makeToken(role: UserRole) {
  return new SignJWT({ id: 1, email: 'test@test.com', name: 'Test', role, orgId: 1 })
    .setProtectedHeader({ alg: 'HS256' })
    .sign(secret);
}

const app = new Hono<AppContext>();
app.route('/api/users', usersRoutes);

describe('GET /api/users', () => {
  it('returns 401 with no token', async () => {
    const res = await app.request('/api/users');
    expect(res.status).toBe(401);
  });

  it('returns 403 for REP role', async () => {
    const token = await makeToken(UserRole.REP);
    const res = await app.request('/api/users', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(403);
  });

  it('ADMIN gets past auth gate (200 or 500 without real DB)', async () => {
    const token = await makeToken(UserRole.ADMIN);
    const res = await app.request('/api/users', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect([200, 500]).toContain(res.status);
  });
});

describe('GET /api/users/:id', () => {
  it('returns 401 with no token', async () => {
    const res = await app.request('/api/users/1');
    expect(res.status).toBe(401);
  });

  it('returns 403 for REP role', async () => {
    const token = await makeToken(UserRole.REP);
    const res = await app.request('/api/users/1', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(403);
  });

  it('MANAGER gets past auth gate', async () => {
    const token = await makeToken(UserRole.MANAGER);
    const res = await app.request('/api/users/1', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect([200, 404, 500]).toContain(res.status);
  });
});

describe('POST /api/users', () => {
  it('returns 403 for MANAGER role', async () => {
    const token = await makeToken(UserRole.MANAGER);
    const res = await app.request('/api/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'new@test.com', name: 'New', role: UserRole.REP }),
    });
    expect(res.status).toBe(403);
  });

  it('returns 403 for REP role', async () => {
    const token = await makeToken(UserRole.REP);
    const res = await app.request('/api/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'new@test.com', name: 'New', role: UserRole.REP }),
    });
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/users/:id', () => {
  it('returns 401 with no token', async () => {
    const res = await app.request('/api/users/1', { method: 'DELETE' });
    expect(res.status).toBe(401);
  });

  it('returns 403 for MANAGER role', async () => {
    const token = await makeToken(UserRole.MANAGER);
    const res = await app.request('/api/users/1', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(403);
  });
});
