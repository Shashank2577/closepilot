import { Hono } from 'hono';
import { requireRole } from '../middleware/auth.js';
import { getDb, users, eq } from '@closepilot/db';
import { UserRole } from '@closepilot/core';
import { errorResponse } from '../lib/errors.js';
import type { AppContext } from '../types.js';

/**
 * User CRUD endpoints
 * ADMIN-only for write operations; ADMIN + MANAGER for reads
 */

export const usersRoutes = new Hono<AppContext>();

usersRoutes.get('/', requireRole([UserRole.ADMIN]), async (c) => {
  const db = getDb();
  const allUsers = await db.select().from(users);
  return c.json({ users: allUsers });
});

usersRoutes.get('/:id', requireRole([UserRole.ADMIN, UserRole.MANAGER]), async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json(errorResponse('Invalid user ID'), 400);
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!user) return c.json(errorResponse('User not found'), 404);
  return c.json(user);
});

usersRoutes.post('/', requireRole([UserRole.ADMIN]), async (c) => {
  const body = await c.req.json<{ email: string; name: string; role: UserRole; orgId?: number }>();
  if (!body.email || !body.name || !body.role) {
    return c.json(errorResponse('email, name, and role are required'), 400);
  }
  const db = getDb();
  const [created] = await db
    .insert(users)
    .values({ email: body.email, name: body.name, role: body.role, orgId: body.orgId })
    .returning();
  return c.json(created, 201);
});

usersRoutes.delete('/:id', requireRole([UserRole.ADMIN]), async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json(errorResponse('Invalid user ID'), 400);
  const db = getDb();
  await db.delete(users).where(eq(users.id, id));
  return c.json({ success: true });
});
