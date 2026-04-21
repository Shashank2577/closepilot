import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { SignJWT } from 'jose';
import { authMiddleware, requireRole } from './auth';
import { UserRole } from '@closepilot/core';
import type { AppContext } from '../types';

describe('Auth Middleware', () => {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'default_secret');

  const generateToken = async (payload: any) => {
    return await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .sign(secret);
  };

  it('should return 401 when no token is provided', async () => {
    const app = new Hono<AppContext>();
    app.get('/test', authMiddleware, (c) => c.text('Success'));

    const res = await app.request('/test');
    expect(res.status).toBe(401);
  });

  it('should return 401 when an invalid token is provided', async () => {
    const app = new Hono<AppContext>();
    app.get('/test', authMiddleware, (c) => c.text('Success'));

    const res = await app.request('/test', {
      headers: { Authorization: 'Bearer invalid_token' }
    });
    expect(res.status).toBe(401);
  });

  it('should set user on context when valid token is provided', async () => {
    const app = new Hono<AppContext>();
    app.get('/test', authMiddleware, (c) => {
      const user = c.get('user');
      return c.json(user);
    });

    const mockUser = { id: 1, email: 'test@example.com', name: 'Test', role: UserRole.REP, orgId: 1 };
    const token = await generateToken(mockUser);

    const res = await app.request('/test', {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(mockUser);
  });

  it('requireRole should return 403 when user role is insufficient', async () => {
    const app = new Hono<AppContext>();
    app.get('/test', requireRole([UserRole.ADMIN]), (c) => c.text('Success'));

    const mockUser = { id: 1, email: 'test@example.com', name: 'Test', role: UserRole.REP, orgId: 1 };
    const token = await generateToken(mockUser);

    const res = await app.request('/test', {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(res.status).toBe(403);
  });

  it('requireRole should pass when user role matches', async () => {
    const app = new Hono<AppContext>();
    app.get('/test', requireRole([UserRole.ADMIN]), (c) => c.text('Success'));

    const mockUser = { id: 1, email: 'test@example.com', name: 'Test', role: UserRole.ADMIN, orgId: 1 };
    const token = await generateToken(mockUser);

    const res = await app.request('/test', {
      headers: { Authorization: `Bearer ${token}` }
    });

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('Success');
  });
});
