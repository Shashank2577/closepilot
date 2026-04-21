import { Hono } from 'hono';
import {
  createApproval,
  getApprovalById,
  getApprovalsByDeal,
  getPendingApprovalRecords,
  respondToApproval,
  getDeal,
  updateDealStage,
} from '@closepilot/db';
import type { Approval } from '@closepilot/db';
import { DealStage } from '@closepilot/core';
import { enqueueAgentJob } from '@closepilot/orchestrator';
import { errorResponse } from '../lib/errors.js';

/**
 * Approval queue endpoints
 * Manages approval workflow for critical actions
 */

export const approvalsRoutes = new Hono();

// Get pending approvals
approvalsRoutes.get('/pending', async (c): Promise<Response> => {
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
    return c.json(errorResponse('Failed to fetch pending approvals'), 500);
  }
});

// Get approvals for a deal
approvalsRoutes.get('/deal/:dealId', async (c): Promise<Response> => {
  try {
    const dealId = parseInt(c.req.param('dealId'));
    if (isNaN(dealId)) {
      return c.json(errorResponse('Invalid deal ID'), 400);
    }

    const dealApprovals = await getApprovalsByDeal(dealId);
    return c.json(dealApprovals);
  } catch (error) {
    console.error('Error fetching deal approvals:', error);
    return c.json(errorResponse('Failed to fetch deal approvals'), 500);
  }
});

// Create a new approval request
approvalsRoutes.post('/', async (c): Promise<Response> => {
  try {
    const body = await c.req.json();
    const { dealId, approverEmail, itemType, itemId, requestComment } = body;

    // Validate required fields
    if (!dealId || !approverEmail || !itemType || !itemId) {
      return c.json(errorResponse('Missing required fields: dealId, approverEmail, itemType, itemId'), 400);
    }

    // Verify deal exists
    const deal = await getDeal(dealId.toString());
    if (!deal) {
      return c.json(errorResponse('Deal not found'), 404);
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
    return c.json(errorResponse('Failed to create approval request'), 500);
  }
});

// Approve a request
approvalsRoutes.post('/:id/approve', async (c): Promise<Response> => {
  try {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) {
      return c.json(errorResponse('Invalid approval ID'), 400);
    }

    const { approverComment } = await c.req.json();

    // Get approval to check current status
    const approval = await getApprovalById(id);
    if (!approval) {
      return c.json(errorResponse('Approval not found'), 404);
    }

    if (approval.status !== 'pending') {
      return c.json(errorResponse('Approval already processed'), 400);
    }

    const updatedApproval = await respondToApproval({
      approvalId: id,
      status: 'approved',
      responseComment: approverComment,
    });

    // Advance deal stage and enqueue next agent based on itemType
    const itemTypeToNextStage: Record<string, { stage: DealStage; job: string }> = {
      scope:    { stage: DealStage.PROPOSAL,  job: 'RunProposal' },
      proposal: { stage: DealStage.CRM_SYNC,  job: 'RunCRMSync' },
    };
    const next = itemTypeToNextStage[approval.itemType];
    if (next) {
      await updateDealStage(approval.dealId.toString(), next.stage, `Approved via approval #${id}`).catch(
        (err: unknown) => console.error('[Approvals] Failed to update deal stage:', err)
      );
      enqueueAgentJob({ type: next.job as any, dealId: approval.dealId.toString() }).catch(
        (err: unknown) => console.error('[Approvals] Failed to enqueue next job:', err)
      );
    }

    return c.json(updatedApproval);
  } catch (error) {
    console.error('Error approving request:', error);
    return c.json(errorResponse('Failed to approve request'), 500);
  }
});

// Reject a request
approvalsRoutes.post('/:id/reject', async (c): Promise<Response> => {
  try {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) {
      return c.json(errorResponse('Invalid approval ID'), 400);
    }

    const { reason } = await c.req.json();

    if (!reason) {
      return c.json(errorResponse('Reason is required for rejection'), 400);
    }

    // Get approval to check current status
    const approval = await getApprovalById(id);
    if (!approval) {
      return c.json(errorResponse('Approval not found'), 404);
    }

    if (approval.status !== 'pending') {
      return c.json(errorResponse('Approval already processed'), 400);
    }

    const updatedApproval = await respondToApproval({
      approvalId: id,
      status: 'rejected',
      responseComment: reason,
    });

    // Move deal to FAILED when an approval is rejected
    await updateDealStage(approval.dealId.toString(), DealStage.FAILED, `Rejected via approval #${id}: ${reason}`).catch(
      (err: unknown) => console.error('[Approvals] Failed to update deal stage to failed:', err)
    );

    return c.json(updatedApproval);
  } catch (error) {
    console.error('Error rejecting request:', error);
    return c.json(errorResponse('Failed to reject request'), 500);
  }
});
