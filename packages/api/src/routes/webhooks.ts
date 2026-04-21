import { Hono } from 'hono';
import { createDeal } from '@closepilot/db';
import { enqueueAgentJob } from '@closepilot/orchestrator';
import { errorResponse } from '../lib/errors.js';

/**
 * Webhook endpoints for external service notifications
 */

export const webhooksRoutes = new Hono();

interface GmailPushNotification {
  message: {
    data: string; // base64-encoded JSON
    messageId: string;
    publishTime: string;
  };
  subscription: string;
}

interface GmailHistoryRecord {
  emailAddress: string;
  historyId: string;
}

// POST /api/webhooks/gmail - Receive Gmail push notifications (Pub/Sub)
webhooksRoutes.post('/gmail', async (c): Promise<Response> => {
  try {
    const body = await c.req.json() as GmailPushNotification;

    if (!body.message?.data) {
      return c.json(errorResponse('Missing message data'), 400);
    }

    // Decode the base64 Pub/Sub message
    const decoded = Buffer.from(body.message.data, 'base64').toString('utf-8');
    let historyRecord: GmailHistoryRecord;
    try {
      historyRecord = JSON.parse(decoded);
    } catch {
      return c.json(errorResponse('Invalid message payload'), 400);
    }

    const { emailAddress, historyId } = historyRecord;
    console.log(`[Webhooks] Gmail notification for ${emailAddress}, historyId: ${historyId}`);

    // Create a deal stub and kick off ingestion
    // The ingestion agent will fetch the actual email content via Gmail API
    const deal = await createDeal({
      leadEmail: emailAddress,
      leadName: emailAddress.split('@')[0] ?? emailAddress,
      source: 'gmail',
      threadId: historyId,
    });

    enqueueAgentJob({ type: 'RunIngestion', dealId: String(deal.id) }).catch((err: unknown) =>
      console.error('[Webhooks] Failed to enqueue ingestion for deal', deal.id, err)
    );

    // Acknowledge the Pub/Sub message with 204 (no content)
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Error processing Gmail webhook:', error);
    return c.json(errorResponse('Failed to process webhook'), 500);
  }
});
