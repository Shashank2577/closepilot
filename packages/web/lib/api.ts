import { Deal } from "@closepilot/core/src/types/deal";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function fetchDeals(): Promise<Deal[]> {
  const response = await fetch(`${API_BASE_URL}/deals`);
  if (!response.ok) {
    throw new Error("Failed to fetch deals");
  }
  return (await response.json()) as Deal[];
}

export async function updateDealStage(dealId: string, stage: string): Promise<Deal> {
  const response = await fetch(`${API_BASE_URL}/deals/${dealId}/stage`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ stage }),
  });
  if (!response.ok) {
    throw new Error("Failed to update deal stage");
  }
  return (await response.json()) as Deal;
}
