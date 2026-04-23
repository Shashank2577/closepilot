import { Hono } from 'hono';
import { requireRole } from '../middleware/auth.js';
import { getDb, organizations, eq } from '@closepilot/db';
import { UserRole } from '@closepilot/core';
import { errorResponse } from '../lib/errors.js';
import type { AppContext } from '../types.js';

/**
 * Organization CRUD endpoints
 * ADMIN-only for write operations; ADMIN + MANAGER for reads
 */

export const organizationsRoutes = new Hono<AppContext>();

organizationsRoutes.get('/', requireRole([UserRole.ADMIN, UserRole.MANAGER]), async (c) => {
  const db = getDb();
  const orgs = await db.select().from(organizations);
  return c.json({ organizations: orgs });
});

organizationsRoutes.get('/:id', requireRole([UserRole.ADMIN, UserRole.MANAGER]), async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json(errorResponse('Invalid organization ID'), 400);
  const db = getDb();
  const [org] = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
  if (!org) return c.json(errorResponse('Organization not found'), 404);
  return c.json(org);
});

organizationsRoutes.post('/', requireRole([UserRole.ADMIN]), async (c) => {
  const body = await c.req.json<{ name: string; settings?: Record<string, unknown> }>();
  if (!body.name) return c.json(errorResponse('name is required'), 400);
  const db = getDb();
  const [created] = await db
    .insert(organizations)
    .values({ name: body.name, settings: body.settings ?? {} })
    .returning();
  return c.json(created, 201);
});

organizationsRoutes.delete('/:id', requireRole([UserRole.ADMIN]), async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) return c.json(errorResponse('Invalid organization ID'), 400);
  const db = getDb();
  await db.delete(organizations).where(eq(organizations.id, id));
  return c.json({ success: true });
});
