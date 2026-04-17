import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { getDb, sql } from '@closepilot/db';
import { corsMiddleware } from './middleware/cors.js';
import { dealsRoutes } from './routes/deals.js';
import { activitiesRoutes } from './routes/activities.js';
import { approvalsRoutes } from './routes/approvals.js';
import { logger } from './logger.js';

/**
 * Closepilot API Server
 * Hono-based REST API for deal lifecycle management
 */

const app = new Hono();

// Apply CORS middleware
app.use('*', corsMiddleware);

// Request logging
app.use('*', async (c, next) => {
  const startedAt = Date.now();
  await next();

  logger.info(
    {
      method: c.req.method,
      url: c.req.url,
      status: c.res.status,
      ms: Date.now() - startedAt,
    },
    'request completed'
  );
});

// Health check
app.get('/api/health', async (c) => {
  try {
    const db = getDb();
    await db.execute(sql`SELECT 1`);

    return c.json({
      status: 'healthy',
      db: 'connected',
      ts: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ error }, 'health check failed');
    return c.json(
      {
        status: 'unhealthy',
        db: 'disconnected',
        error: String(error),
      },
      503
    );
  }
});

// API routes
app.route('/api/deals', dealsRoutes);
app.route('/api/activities', activitiesRoutes);
app.route('/api/approvals', approvalsRoutes);

export function startServer() {
  const port = parseInt(process.env.API_PORT || '3001', 10);

  logger.info({ port }, 'Closepilot API server starting');

  serve({
    fetch: app.fetch,
    port,
  });
}

if (require.main === module) {
  startServer();
}

export default app;
