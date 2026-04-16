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

// Apply CORS middleware
app.use('*', corsMiddleware);

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

import { serve } from '@hono/node-server';

// Start server
const port = parseInt(process.env.API_PORT || '3001');

console.log(`Closepilot API server starting on port ${port}`);

serve({
  fetch: app.fetch,
  port
});

export default app;
