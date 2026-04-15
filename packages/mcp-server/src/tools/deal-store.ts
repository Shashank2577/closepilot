import type { Deal, DealInput, DealStage } from '@closepilot/core';

/**
 * Register Deal Store database tools with MCP server
 * These are stub implementations - will be completed by Jules session J-101
 */
export function registerDealStoreTools(server: any): void {
  // Stub functions for tool registration
  // Actual implementation will:
  // - Create deal in database
  // - Query deals by various criteria
  // - Update deal stages and data
  // - Handle approval queue operations

  console.log('Deal Store tools registered (stubs)');
}

// Stub implementations that will be replaced
export async function createDeal(input: DealInput): Promise<Deal> {
  throw new Error('Not implemented - Jules J-101 will implement');
}

export async function getDeal(dealId: string): Promise<Deal | null> {
  throw new Error('Not implemented - Jules J-101 will implement');
}

export async function updateDealStage(
  dealId: string,
  stage: DealStage,
  reason?: string
): Promise<Deal> {
  throw new Error('Not implemented - Jules J-101 will implement');
}
