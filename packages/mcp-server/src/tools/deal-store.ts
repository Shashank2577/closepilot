import type { DealInput, DealStage } from '@closepilot/core';
import {
  createDeal,
  getDeal,
  updateDeal,
  updateDealStage,
  queryDealsByStage,
  queryDealsByDateRange,
  getPendingApprovals,
  approveDeal,
  rejectDeal,
  searchSimilarDeals
} from '@closepilot/db';

export const dealStoreToolDefinitions = [
  {
    name: 'create_deal',
    description: 'Create a new deal in the system',
    inputSchema: {
      type: 'object',
      properties: {
        input: {
          type: 'object',
          description: 'Deal input data',
        },
      },
      required: ['input'],
    },
  },
  {
    name: 'get_deal',
    description: 'Get a deal by ID',
    inputSchema: {
      type: 'object',
      properties: {
        dealId: {
          type: 'string',
          description: 'Deal ID',
        },
      },
      required: ['dealId'],
    },
  },
  {
    name: 'update_deal',
    description: 'Update deal data',
    inputSchema: {
      type: 'object',
      properties: {
        dealId: { type: 'string' },
        updates: { type: 'object' },
      },
      required: ['dealId', 'updates'],
    },
  },
  {
    name: 'update_deal_stage',
    description: 'Update deal stage',
    inputSchema: {
      type: 'object',
      properties: {
        dealId: { type: 'string' },
        stage: { type: 'string' },
        reason: { type: 'string' },
      },
      required: ['dealId', 'stage'],
    },
  },
  {
    name: 'query_deals_by_stage',
    description: 'Query deals by their current stage',
    inputSchema: {
      type: 'object',
      properties: {
        stage: { type: 'string' },
      },
      required: ['stage'],
    },
  },
  {
    name: 'query_deals_by_date_range',
    description: 'Query deals within a specific date range',
    inputSchema: {
      type: 'object',
      properties: {
        startDate: { type: 'string', format: 'date-time' },
        endDate: { type: 'string', format: 'date-time' },
      },
      required: ['startDate', 'endDate'],
    },
  },
  {
    name: 'get_pending_approvals',
    description: 'Get a list of deals pending approval',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'approve_deal',
    description: 'Approve a deal',
    inputSchema: {
      type: 'object',
      properties: {
        dealId: { type: 'string' },
        approverComment: { type: 'string' },
      },
      required: ['dealId'],
    },
  },
  {
    name: 'reject_deal',
    description: 'Reject a deal',
    inputSchema: {
      type: 'object',
      properties: {
        dealId: { type: 'string' },
        reason: { type: 'string' },
      },
      required: ['dealId', 'reason'],
    },
  },
  {
    name: 'search_similar_deals',
    description: 'Search for similar deals based on a query string',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        limit: { type: 'number' },
      },
      required: ['query'],
    },
  }
];

export async function handleDealStoreToolCall(name: string, args: any) {
  switch (name) {
    case 'create_deal':
      return { content: [{ type: 'text', text: JSON.stringify(await createDeal(args.input)) }] };
    case 'get_deal':
      return { content: [{ type: 'text', text: JSON.stringify(await getDeal(args.dealId)) }] };
    case 'update_deal':
      return { content: [{ type: 'text', text: JSON.stringify(await updateDeal(args.dealId, args.updates)) }] };
    case 'update_deal_stage':
      return { content: [{ type: 'text', text: JSON.stringify(await updateDealStage(args.dealId, args.stage as DealStage, args.reason)) }] };
    case 'query_deals_by_stage':
      return { content: [{ type: 'text', text: JSON.stringify(await queryDealsByStage(args.stage as DealStage)) }] };
    case 'query_deals_by_date_range':
      return { content: [{ type: 'text', text: JSON.stringify(await queryDealsByDateRange(new Date(args.startDate), new Date(args.endDate))) }] };
    case 'get_pending_approvals':
      return { content: [{ type: 'text', text: JSON.stringify(await getPendingApprovals()) }] };
    case 'approve_deal':
      return { content: [{ type: 'text', text: JSON.stringify(await approveDeal(args.dealId, args.approverComment)) }] };
    case 'reject_deal':
      return { content: [{ type: 'text', text: JSON.stringify(await rejectDeal(args.dealId, args.reason)) }] };
    case 'search_similar_deals':
      return { content: [{ type: 'text', text: JSON.stringify(await searchSimilarDeals(args.query, args.limit)) }] };
    default:
      return null;
  }
}

/**
 * Register Deal Store database tools with MCP server
 * Backwards compatibility for index.ts before it's refactored
 */
export function registerDealStoreTools(server: any): void {
  // Empty, logic moved to handleDealStoreToolCall
}
