import type { DealStage } from './deal.js';

export interface StageVelocity {
  stage: DealStage;
  avgDurationMs: number;
  count: number;
}

export interface ConversionStats {
  totalDeals: number;
  completed: number;
  failed: number;
  inProgress: number;
  winRate: number; // completed / (completed + failed), 0 if no closed deals
}
