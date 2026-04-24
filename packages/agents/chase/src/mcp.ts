import type { ChaseDeal, ChaseThread } from './types.js';
import { DealStoreClient } from '@closepilot/mcp-client';

export async function queryDealsByStage(client: DealStoreClient, stage: string): Promise<ChaseDeal[]> {
  const response = await client.callTool('query_deals_by_stage', { stage });
  return parseMcpContent<ChaseDeal[]>(response, []);
}

export async function getThread(client: DealStoreClient, threadId: string): Promise<ChaseThread | null> {
  const response = await client.callTool('get_thread', { threadId });
  return parseMcpContent<ChaseThread | null>(response, null);
}

export async function markDealPendingApproval(client: DealStoreClient, dealId: string): Promise<void> {
  await client.callTool('update_deal', {
    dealId,
    updates: { approvalStatus: 'pending' },
  });
}

export function parseMcpContent<T>(response: unknown, fallback: T): T {
  const content = (response as { content?: unknown })?.content;

  if (Array.isArray(content) && content.length > 0) {
    const first = content[0] as { type?: string; text?: string };
    if (first?.type === 'text' && typeof first.text === 'string') {
      try {
        return JSON.parse(first.text) as T;
      } catch {
        return fallback;
      }
    }
  }

  if (content !== undefined) return content as T;
  return fallback;
}
