import './telemetry.js';
import { instrumentedDb } from '@closepilot/db';
import { getDb } from '@closepilot/db';
import { requestIdMiddleware } from './middleware/requestId.js';
import { metricsMiddleware } from './middleware/metrics.js';
import { metricsRegistry } from './metrics.js';
import { Hono } from 'hono';
import { corsMiddleware } from './middleware/cors.js';
import { dealsRoutes } from './routes/deals.js';
import { activitiesRoutes } from './routes/activities.js';
import { approvalsRoutes } from './routes/approvals.js';

/**
 * Closepilot API Server
 * Hono-based REST API for deal lifecycle management
 */

const app = new Hono();

// Instrument DB
instrumentedDb(getDb());

// Apply CORS middleware
app.use('*', corsMiddleware);

// Apply Request ID middleware
app.use('*', requestIdMiddleware);

// Apply Metrics middleware
app.use('*', metricsMiddleware);

// Health check
app.get('/', (c) => {
  return c.json({
    name: 'Closepilot API',
    version: '0.1.0',
    status: 'healthy',
  });
});


// Metrics endpoint
app.get('/metrics', async (c) => {
  const token = process.env.METRICS_BEARER_TOKEN;
  if (token) {
    const authHeader = c.req.header('authorization');
    if (authHeader !== `Bearer ${token}`) {
      return c.text('Unauthorized', 401);
    }
  }

  return new Response(await metricsRegistry.metrics(), {
    headers: {
      'Content-Type': 'text/plain; version=0.0.4'
    }
  });
});

// API routes
app.route('/api/deals', dealsRoutes);
app.route('/api/activities', activitiesRoutes);
app.route('/api/approvals', approvalsRoutes);

import { serve } from '@hono/node-server';

// Start server
const port = parseInt(process.env.API_PORT || '3001');

console.log(`Closepilot API server starting on port ${port}`);

serve({
  fetch: app.fetch,
  port
});

export default app;
