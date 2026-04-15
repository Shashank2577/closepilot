import { Hono } from 'hono';
import {
  createApproval,
  getApprovalById,
  getApprovalsByDeal,
  getPendingApprovalRecords,
  respondToApproval,
} from '@closepilot/db';
import { getDeal } from '@closepilot/db';
import type { Approval } from '@closepilot/db';

/**
 * Approval queue endpoints
 * Manages approval workflow for critical actions
 */

export const approvalsRoutes = new Hono();

// Get pending approvals
approvalsRoutes.get('/pending', async (c) => {
  try {
    const pendingApprovals = await getPendingApprovalRecords();

    // Fetch related deal information for each approval
    const approvalsWithDeals = await Promise.all(
      pendingApprovals.map(async (approval: Approval) => {
        const deal = await getDeal(approval.dealId.toString());
        return {
          ...approval,
          deal,
        };
      })
    );

    return c.json(approvalsWithDeals);
  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    return c.json({ error: 'Failed to fetch pending approvals' }, 500);
  }
});

// Get approvals for a deal
approvalsRoutes.get('/deal/:dealId', async (c) => {
  try {
    const dealId = parseInt(c.req.param('dealId'));
    if (isNaN(dealId)) {
      return c.json({ error: 'Invalid deal ID' }, 400);
    }

    const dealApprovals = await getApprovalsByDeal(dealId);
    return c.json(dealApprovals);
  } catch (error) {
    console.error('Error fetching deal approvals:', error);
    return c.json({ error: 'Failed to fetch deal approvals' }, 500);
  }
});

// Create a new approval request
approvalsRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { dealId, approverEmail, itemType, itemId, requestComment } = body;

    // Validate required fields
    if (!dealId || !approverEmail || !itemType || !itemId) {
      return c.json({ error: 'Missing required fields: dealId, approverEmail, itemType, itemId' }, 400);
    }

    // Verify deal exists
    const deal = await getDeal(dealId.toString());
    if (!deal) {
      return c.json({ error: 'Deal not found' }, 404);
    }

    const approval = await createApproval({
      dealId: parseInt(dealId),
      approverEmail,
      itemType,
      itemId,
      requestComment,
    });

    // TODO: Send email notification to approver

    return c.json(approval, 201);
  } catch (error) {
    console.error('Error creating approval:', error);
    return c.json({ error: 'Failed to create approval request' }, 500);
  }
});

// Approve a request
approvalsRoutes.post('/:id/approve', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) {
      return c.json({ error: 'Invalid approval ID' }, 400);
    }

    const { approverComment } = await c.req.json();

    // Get approval to check current status
    const approval = await getApprovalById(id);
    if (!approval) {
      return c.json({ error: 'Approval not found' }, 404);
    }

    if (approval.status !== 'pending') {
      return c.json({ error: 'Approval already processed' }, 400);
    }

    const updatedApproval = await respondToApproval({
      approvalId: id,
      status: 'approved',
      responseComment: approverComment,
    });

    // TODO: Send email notification to requester
    // TODO: Update deal stage if all approvals complete

    return c.json(updatedApproval);
  } catch (error) {
    console.error('Error approving request:', error);
    return c.json({ error: 'Failed to approve request' }, 500);
  }
});

// Reject a request
approvalsRoutes.post('/:id/reject', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) {
      return c.json({ error: 'Invalid approval ID' }, 400);
    }

    const { reason } = await c.req.json();

    if (!reason) {
      return c.json({ error: 'Reason is required for rejection' }, 400);
    }

    // Get approval to check current status
    const approval = await getApprovalById(id);
    if (!approval) {
      return c.json({ error: 'Approval not found' }, 404);
    }

    if (approval.status !== 'pending') {
      return c.json({ error: 'Approval already processed' }, 400);
    }

    const updatedApproval = await respondToApproval({
      approvalId: id,
      status: 'rejected',
      responseComment: reason,
    });

    // TODO: Send email notification to requester
    // TODO: Update deal stage to rejected/failed if applicable

    return c.json(updatedApproval);
  } catch (error) {
    console.error('Error rejecting request:', error);
    return c.json({ error: 'Failed to reject request' }, 500);
  }
});
