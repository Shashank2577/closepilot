import { Deal, DealStage } from '@closepilot/core';

// All /api/* calls go through Next.js rewrites → Hono backend
const API_BASE = '';

export async function fetchDeals(params?: { stage?: DealStage; limit?: number; offset?: number }): Promise<Deal[]> {
  const url = new URL('/api/deals', window.location.origin);
  if (params?.stage) url.searchParams.set('stage', params.stage);
  if (params?.limit != null) url.searchParams.set('limit', String(params.limit));
  if (params?.offset != null) url.searchParams.set('offset', String(params.offset));

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error('Failed to fetch deals');
  const json = await response.json() as { data: Deal[]; totalCount: number } | Deal[];
  return Array.isArray(json) ? json : json.data;
}

export async function fetchDeal(id: string): Promise<Deal> {
  const response = await fetch(`${API_BASE}/api/deals/${id}`);
  if (!response.ok) throw new Error('Failed to fetch deal');
  return response.json() as Promise<Deal>;
}

export async function createDeal(data: {
  leadEmail: string;
  leadName: string;
  leadCompany?: string;
  leadTitle?: string;
  source: 'gmail' | 'manual' | 'other';
}): Promise<Deal> {
  const response = await fetch(`${API_BASE}/api/deals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create deal');
  return response.json() as Promise<Deal>;
}

export async function updateDealStage(id: string, stage: DealStage, reason?: string): Promise<Deal> {
  const response = await fetch(`${API_BASE}/api/deals/${id}/stage`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage, reason }),
  });
  if (!response.ok) throw new Error('Failed to update deal stage');
  return response.json() as Promise<Deal>;
}

export async function searchDeals(query: string): Promise<Deal[]> {
  const response = await fetch(`${API_BASE}/api/deals/search/similar?q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error('Failed to search deals');
  return response.json() as Promise<Deal[]>;
}

export async function fetchDealsByStage(stage: DealStage): Promise<Deal[]> {
  const response = await fetch(`${API_BASE}/api/deals/stage/${stage}`);
  if (!response.ok) throw new Error('Failed to fetch deals by stage');
  return response.json() as Promise<Deal[]>;
}

// ── Approvals ──────────────────────────────────────────────────────────────

export interface Approval {
  id: number;
  dealId: number;
  approverEmail: string;
  itemType: string;
  itemId: string;
  status: 'pending' | 'approved' | 'rejected';
  requestComment?: string;
  responseComment?: string;
  respondedAt?: string;
  createdAt: string;
  deal?: {
    id: number;
    leadName: string;
    leadCompany?: string;
    leadEmail: string;
    stage: string;
    proposal?: {
      title?: string;
      pricing?: { total: number; currency: string };
    };
  };
}

export async function fetchPendingApprovals(): Promise<Approval[]> {
  const response = await fetch(`${API_BASE}/api/approvals/pending`);
  if (!response.ok) throw new Error('Failed to fetch approvals');
  return response.json() as Promise<Approval[]>;
}

export async function approveRequest(id: number, approverComment?: string): Promise<Approval> {
  const response = await fetch(`${API_BASE}/api/approvals/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approverComment }),
  });
  if (!response.ok) {
    const data = await response.json() as { error?: string };
    throw new Error(data.error || 'Failed to approve');
  }
  return response.json() as Promise<Approval>;
}

export async function rejectRequest(id: number, reason: string): Promise<Approval> {
  const response = await fetch(`${API_BASE}/api/approvals/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  if (!response.ok) {
    const data = await response.json() as { error?: string };
    throw new Error(data.error || 'Failed to reject');
  }
  return response.json() as Promise<Approval>;
}

// ── Activities ─────────────────────────────────────────────────────────────

export interface Activity {
  id: number;
  dealId: number;
  agentType: string;
  activityType: string;
  description: string;
  metadata?: string;
  createdAt: string;
}

export async function fetchActivities(dealId?: number, limit = 50): Promise<Activity[]> {
  if (dealId != null) {
    const response = await fetch(`${API_BASE}/api/activities/deal/${dealId}`);
    if (!response.ok) throw new Error('Failed to fetch activities');
    return response.json() as Promise<Activity[]>;
  }
  const response = await fetch(`${API_BASE}/api/activities/recent?limit=${limit}`);
  if (!response.ok) throw new Error('Failed to fetch activities');
  return response.json() as Promise<Activity[]>;
}
