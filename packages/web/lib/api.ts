import { Deal, DealStage } from '@closepilot/core';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export async function fetchDeals(): Promise<Deal[]> {
  const response = await fetch(`${API_BASE}/api/deals`);
  if (!response.ok) {
    throw new Error('Failed to fetch deals');
  }
  return response.json() as Promise<Deal[]>;
}

export async function fetchDeal(id: string): Promise<Deal> {
  const response = await fetch(`${API_BASE}/api/deals/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch deal');
  }
  return response.json() as Promise<Deal>;
}

export async function updateDealStage(
  id: string,
  stage: DealStage,
  reason?: string
): Promise<Deal> {
  const response = await fetch(`${API_BASE}/api/deals/${id}/stage`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage, reason }),
  });
  if (!response.ok) {
    throw new Error('Failed to update deal stage');
  }
  return response.json() as Promise<Deal>;
}

export async function searchDeals(query: string): Promise<Deal[]> {
  const response = await fetch(`${API_BASE}/api/deals/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) {
    throw new Error('Failed to search deals');
  }
  return response.json() as Promise<Deal[]>;
}

export async function fetchDealsByStage(stage: DealStage): Promise<Deal[]> {
  const response = await fetch(`${API_BASE}/api/deals/stage/${stage}`);
  if (!response.ok) {
    throw new Error('Failed to fetch deals by stage');
  }
  return response.json() as Promise<Deal[]>;
}
