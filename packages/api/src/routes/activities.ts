import { Hono } from 'hono';
import { createActivity, getActivitiesByDeal, getRecentActivities } from '@closepilot/db';

/**
 * Activity streaming endpoints with SSE support
 */

export const activitiesRoutes = new Hono();

// In-memory store for SSE connections
const sseClients = new Set<ReadableStreamDefaultController>();

// Broadcast activity to all connected SSE clients
function broadcastActivity(activity: any) {
  const data = JSON.stringify(activity);
  sseClients.forEach((controller) => {
    try {
      controller.enqueue(`event: message\ndata: ${data}\n\n`);
    } catch (error) {
      console.error('Error broadcasting to client:', error);
      sseClients.delete(controller);
    }
  });
}

// SSE endpoint for real-time activity streaming
activitiesRoutes.get('/stream', async (c) => {
  const stream = new ReadableStream({
    start(controller) {
      sseClients.add(controller);

      // Send initial connection message
      controller.enqueue(`event: connected\ndata: {"status":"connected"}\n\n`);

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(`event: heartbeat\ndata: {"timestamp":"${new Date().toISOString()}"}\n\n`);
        } catch (error) {
          clearInterval(heartbeatInterval);
          sseClients.delete(controller);
        }
      }, 30000);

      // Cleanup on connection close
      c.req.raw.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
        sseClients.delete(controller);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
});

// Get activities for a specific deal
activitiesRoutes.get('/deal/:dealId', async (c) => {
  const dealId = parseInt(c.req.param('dealId'));
  const activities = await getActivitiesByDeal(dealId);
  return c.json(activities);
});

// Get recent activities
activitiesRoutes.get('/recent', async (c) => {
  const limit = parseInt(c.req.query('limit') || '50');
  const activities = await getRecentActivities(limit);
  return c.json(activities);
});

// Create a new activity (called by agents)
activitiesRoutes.post('/', async (c) => {
  try {
    const data = await c.req.json();

    // Validate required fields
    if (!data.dealId || !data.agentType || !data.activityType || !data.description) {
      return c.json(
        { error: 'Missing required fields: dealId, agentType, activityType, description' },
        400
      );
    }

    const activity = await createActivity({
      dealId: data.dealId,
      agentType: data.agentType,
      activityType: data.activityType,
      description: data.description,
      metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
    });

    // Broadcast to all SSE clients
    broadcastActivity(activity);

    return c.json(activity, 201);
  } catch (error) {
    console.error('Error creating activity:', error);
    return c.json({ error: 'Failed to create activity' }, 500);
  }
});
