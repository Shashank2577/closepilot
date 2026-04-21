import { Hono } from 'hono';
import { getDealVelocity, getConversionStats } from '@closepilot/db';

export const analyticsRoutes = new Hono();

analyticsRoutes.get('/velocity', async (c) => {
  try {
    const velocity = await getDealVelocity();
    return c.json(velocity);
  } catch (error) {
    console.error('Error fetching velocity stats:', error);
    return c.json({ error: 'Failed to fetch deal velocity statistics' }, 500);
  }
});

analyticsRoutes.get('/conversion', async (c) => {
  try {
    const conversion = await getConversionStats();
    return c.json(conversion);
  } catch (error) {
    console.error('Error fetching conversion stats:', error);
    return c.json({ error: 'Failed to fetch conversion statistics' }, 500);
  }
});
