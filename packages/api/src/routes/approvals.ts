import { Hono } from 'hono';
import {
  getPendingApprovalRecords,
  getApprovalsByDeal,
  createApproval,
  respondToApproval
} from '@closepilot/db/src/queries/approvals';

/**
 * Approval queue endpoints
 */

export const approvalsRoutes = new Hono();

// Get pending approvals
approvalsRoutes.get('/pending', async (c) => {
  try {
    const approvals = await getPendingApprovalRecords();
    return c.json(approvals);
  } catch (error) {
    console.error('Failed to get pending approvals:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get approvals for a deal
approvalsRoutes.get('/deal/:dealId', async (c) => {
  const dealId = parseInt(c.req.param('dealId'), 10);
  if (isNaN(dealId)) {
    return c.json({ error: 'Invalid deal ID' }, 400);
  }

  try {
    const approvals = await getApprovalsByDeal(dealId);
    return c.json(approvals);
  } catch (error) {
    console.error(`Failed to get approvals for deal ${dealId}:`, error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Create a new approval request
approvalsRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { dealId, approverEmail, itemType, itemId, requestComment } = body;

    if (!dealId || !approverEmail || !itemType || !itemId) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Check business logic here if applicable
    // (e.g. over $50k or high complexity require approval, deal stage transitions blocked)

    const newApproval = await createApproval({
      dealId: parseInt(dealId, 10),
      approverEmail,
      itemType,
      itemId,
      requestComment
    });

    // TODO: Send email notification to approverEmail (nodemailer/SendGrid)

    return c.json(newApproval, 201);
  } catch (error) {
    console.error('Failed to create approval:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Approve a deal
approvalsRoutes.post('/:id/approve', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) {
    return c.json({ error: 'Invalid approval ID' }, 400);
  }

  try {
    const body = await c.req.json().catch(() => ({}));
    const { approverComment } = body;

    const updated = await respondToApproval({
      approvalId: id,
      status: 'approved',
      responseComment: approverComment
    });

    // TODO: If this was the last pending approval for the deal, unblock deal stage transition
    // TODO: Send email notification to requester

    return c.json(updated);
  } catch (error) {
    console.error(`Failed to approve ${id}:`, error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Reject a deal
approvalsRoutes.post('/:id/reject', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (isNaN(id)) {
    return c.json({ error: 'Invalid approval ID' }, 400);
  }

  try {
    const body = await c.req.json();
    const { reason } = body;

    if (!reason) {
      return c.json({ error: 'Comment/reason is required for rejection' }, 400);
    }

    const updated = await respondToApproval({
      approvalId: id,
      status: 'rejected',
      responseComment: reason
    });

    // TODO: Update deal status or unblock (as rejected)
    // TODO: Send email notification to requester

    return c.json(updated);
  } catch (error) {
    console.error(`Failed to reject ${id}:`, error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});
