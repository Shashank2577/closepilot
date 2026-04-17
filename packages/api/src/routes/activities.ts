import { Hono } from 'hono';
import {
  createActivity,
  getActivitiesByDeal,
  getRecentActivities,
} from '@closepilot/db';
import type { Activity } from '@closepilot/db';

/**
 * Activity streaming endpoints
 * Implements SSE streaming for real-time activity updates
 */

export const activitiesRoutes = new Hono();

// In-memory storage for active SSE connections
const activeConnections = new Set<ReadableStreamDefaultController>();

/**
 * Broadcast activity to all connected SSE clients
 */
function broadcastActivity(activity: Activity) {
  const data = `event: message\ndata: ${JSON.stringify(activity)}\n\n`;
  activeConnections.forEach((controller) => {
    try {
      controller.enqueue(new TextEncoder().encode(data));
    } catch (error) {
      // Connection might be closed, remove it
      activeConnections.delete(controller);
    }
  });
}

/**
 * GET /api/activities/stream
 * SSE endpoint for real-time activity streaming
 */
activitiesRoutes.get('/stream', async (c) => {
  const dealId = c.req.query('dealId');

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Add this connection to active connections
      activeConnections.add(controller);

      // Send initial connection message
      const connectMsg = `event: connected\ndata: ${JSON.stringify({
        timestamp: new Date().toISOString(),
        dealId: dealId || 'all'
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(connectMsg));

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeat = `event: heartbeat\ndata: ${JSON.stringify({
            timestamp: new Date().toISOString()
          })}\n\n`;
          controller.enqueue(new TextEncoder().encode(heartbeat));
        } catch (error) {
          // Connection closed, cleanup
          clearInterval(heartbeatInterval);
          activeConnections.delete(controller);
          controller.close();
        }
      }, 30000);

      // Cleanup on connection close
      c.req.raw.signal?.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
        activeConnections.delete(controller);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
});

/**
 * GET /api/activities/deal/:dealId
 * Get all activities for a specific deal
 */
activitiesRoutes.get('/deal/:dealId', async (c) => {
  const dealId = parseInt(c.req.param('dealId'));

  if (isNaN(dealId)) {
    return c.json({ error: 'Invalid deal ID' }, 400);
  }

  try {
    const activities = await getActivitiesByDeal(dealId);
    return c.json(activities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    return c.json({ error: 'Failed to fetch activities' }, 500);
  }
});

/**
 * GET /api/activities/recent
 * Get recent activities across all deals
 */
activitiesRoutes.get('/recent', async (c) => {
  const limit = parseInt(c.req.query('limit') || '50');

  if (limit < 1 || limit > 500) {
    return c.json({ error: 'Limit must be between 1 and 500' }, 400);
  }

  try {
    const activities = await getRecentActivities(limit);
    return c.json(activities);
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    return c.json({ error: 'Failed to fetch recent activities' }, 500);
  }
});

/**
 * POST /api/activities
 * Create a new activity (called by agents)
 */
activitiesRoutes.post('/', async (c) => {
  try {
    const data = await c.req.json();

    // Validate required fields
    if (!data.dealId || !data.agentType || !data.activityType || !data.description) {
      return c.json(
        {
          error: 'Missing required fields',
          required: ['dealId', 'agentType', 'activityType', 'description']
        },
        400
      );
    }

    // Create activity
    const activity = await createActivity({
      dealId: parseInt(data.dealId),
      agentType: data.agentType,
      activityType: data.activityType,
      description: data.description,
      metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
    });

    // Broadcast to all connected SSE clients
    broadcastActivity(activity);

    return c.json(activity, 201);
  } catch (error) {
    console.error('Error creating activity:', error);
    return c.json({ error: 'Failed to create activity' }, 500);
  }
});
