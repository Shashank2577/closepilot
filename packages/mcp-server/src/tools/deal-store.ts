import type { Deal, DealInput, DealStage } from '@closepilot/core';
import {
  createDeal as dbCreateDeal,
  getDeal as dbGetDeal,
  updateDeal as dbUpdateDeal,
  updateDealStage as dbUpdateDealStage,
  queryDealsByStage,
  queryDealsByDateRange,
  getPendingApprovals,
  approveDeal,
  rejectDeal,
  searchSimilarDeals,
} from '@closepilot/db';

/**
 * Register Deal Store database tools with MCP server
 */
export function registerDealStoreTools(server: any): void {
  server.setRequestHandler(
    'tools/call',
    async (request: any) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'create_deal':
            return await handleCreateDeal(args);
          case 'get_deal':
            return await handleGetDeal(args);
          case 'update_deal':
            return await handleUpdateDeal(args);
          case 'update_deal_stage':
            return await handleUpdateDealStage(args);
          case 'query_deals_by_stage':
            return await handleQueryDealsByStage(args);
          case 'query_deals_by_date_range':
            return await handleQueryDealsByDateRange(args);
          case 'get_pending_approvals':
            return await handleGetPendingApprovals(args);
          case 'approve_deal':
            return await handleApproveDeal(args);
          case 'reject_deal':
            return await handleRejectDeal(args);
          case 'search_similar_deals':
            return await handleSearchSimilarDeals(args);
          default:
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ error: `Unknown tool: ${name}` }),
                },
              ],
            };
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: error instanceof Error ? error.message : 'Unknown error',
              }),
            },
          ],
        };
      }
    }
  );

  console.log('Deal Store tools registered');
}

/**
 * Handle create_deal tool call
 */
async function handleCreateDeal(args: any) {
  const input = args.input as DealInput;
  const deal = await dbCreateDeal(input);
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(deal),
      },
    ],
  };
}

/**
 * Handle get_deal tool call
 */
async function handleGetDeal(args: any) {
  const { dealId } = args;
  const deal = await dbGetDeal(dealId);
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(deal),
      },
    ],
  };
}

/**
 * Handle update_deal tool call
 */
async function handleUpdateDeal(args: any) {
  const { dealId, updates } = args;
  const deal = await dbUpdateDeal(dealId, updates);
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(deal),
      },
    ],
  };
}

/**
 * Handle update_deal_stage tool call
 */
async function handleUpdateDealStage(args: any) {
  const { dealId, stage, reason } = args;
  const deal = await dbUpdateDealStage(dealId, stage as DealStage, reason);
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(deal),
      },
    ],
  };
}

/**
 * Handle query_deals_by_stage tool call
 */
async function handleQueryDealsByStage(args: any) {
  const { stage } = args;
  const deals = await queryDealsByStage(stage as DealStage);
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(deals),
      },
    ],
  };
}

/**
 * Handle query_deals_by_date_range tool call
 */
async function handleQueryDealsByDateRange(args: any) {
  const { startDate, endDate } = args;
  const deals = await queryDealsByDateRange(
    new Date(startDate),
    new Date(endDate)
  );
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(deals),
      },
    ],
  };
}

/**
 * Handle get_pending_approvals tool call
 */
async function handleGetPendingApprovals(args: any) {
  const deals = await getPendingApprovals();
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(deals),
      },
    ],
  };
}

/**
 * Handle approve_deal tool call
 */
async function handleApproveDeal(args: any) {
  const { dealId, approverComment } = args;
  const deal = await approveDeal(dealId, approverComment);
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(deal),
      },
    ],
  };
}

/**
 * Handle reject_deal tool call
 */
async function handleRejectDeal(args: any) {
  const { dealId, reason } = args;
  const deal = await rejectDeal(dealId, reason);
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(deal),
      },
    ],
  };
}

/**
 * Handle search_similar_deals tool call
 */
async function handleSearchSimilarDeals(args: any) {
  const { query, limit = 5 } = args;
  const deals = await searchSimilarDeals(query, limit);
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(deals),
      },
    ],
  };
}
