import './telemetry.js';
import { Hono } from 'hono';
import { corsMiddleware } from './middleware/cors.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { metricsMiddleware } from './middleware/metrics.js';
import { dealsRoutes } from './routes/deals.js';
import { activitiesRoutes } from './routes/activities.js';
import { approvalsRoutes } from './routes/approvals.js';
import { analyticsRoutes } from './routes/analytics.js';
import { versionRoutes } from './routes/version.js';
import { metricsRegistry } from './metrics.js';

/**
 * Closepilot API Server
 * Hono-based REST API for deal lifecycle management
 */

const app = new Hono();

// Apply middleware
app.use('*', corsMiddleware);
app.use('*', requestIdMiddleware);
app.use('*', metricsMiddleware);

// Health check
app.get('/', (c) => {
  return c.json({
    name: 'Closepilot API',
    version: '0.1.0',
    status: 'healthy',
  });
});

// API routes
app.route('/api/deals', dealsRoutes);
app.route('/api/activities', activitiesRoutes);
app.route('/api/approvals', approvalsRoutes);
app.route('/api/analytics', analyticsRoutes);
app.route('/api/version', versionRoutes);

// Prometheus metrics endpoint
app.get('/metrics', async (c) => {
  const metrics = await metricsRegistry.metrics();
  return c.text(metrics, 200, { 'Content-Type': metricsRegistry.contentType });
});

import { serve } from '@hono/node-server';

// Start server
const port = parseInt(process.env.API_PORT || '3001');

console.log(`Closepilot API server starting on port ${port}`);

serve({
  fetch: app.fetch,
  port
});

export default app;
