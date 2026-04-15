import { Hono } from 'hono';

/**
 * Activity streaming endpoints
 * These are stub implementations - will be completed by Jules session J-111
 */

export const activitiesRoutes = new Hono();

// Get activities for a deal
activitiesRoutes.get('/deal/:dealId', async (c) => {
  const dealId = c.req.param('dealId');
  // TODO: Implement get activities by deal
  return c.json([]);
});

// Get recent activities
activitiesRoutes.get('/recent', async (c) => {
  const limit = parseInt(c.req.query('limit') || '50');
  // TODO: Implement get recent activities
  return c.json([]);
});

// Create an activity
activitiesRoutes.post('/', async (c) => {
  const data = await c.req.json();
  // TODO: Implement create activity
  return c.json({ error: 'Not implemented' }, 501);
});
