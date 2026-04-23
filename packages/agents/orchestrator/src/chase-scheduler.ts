import { DealStage } from '@closepilot/core';
import { getDb, deals, eq, or } from '@closepilot/db';
import { enqueueAgentJob } from './queue.js';
import type { AgentJob } from './jobs.js';

const CHASE_STAGES: DealStage[] = [
  DealStage.PROPOSAL_SENT,
  DealStage.FOLLOW_UP_1,
  DealStage.FOLLOW_UP_2,
  DealStage.NEGOTIATING,
  DealStage.STALLED,
];

export interface ChaseSchedulerDeps {
  enqueueJob?: (job: Pick<AgentJob, 'type' | 'dealId'>) => Promise<void>;
  getStalledDeals?: () => Promise<Array<{ id: string | number; stage: string }>>;
}

export class ChaseScheduler {
  private readonly enqueueJob: (job: Pick<AgentJob, 'type' | 'dealId'>) => Promise<void>;
  private readonly getStalledDeals: () => Promise<Array<{ id: string | number; stage: string }>>;

  constructor(deps: ChaseSchedulerDeps = {}) {
    this.enqueueJob =
      deps.enqueueJob ??
      ((job) => enqueueAgentJob({ type: job.type as AgentJob['type'], dealId: String(job.dealId) }));

    this.getStalledDeals =
      deps.getStalledDeals ??
      (async () => {
        const db = getDb();
        return db
          .select({ id: deals.id, stage: deals.stage })
          .from(deals)
          .where(or(...CHASE_STAGES.map((s) => eq(deals.stage, s))));
      });
  }

  async runSweep(): Promise<void> {
    const activeDeals = await this.getStalledDeals();
    console.log(`[ChaseScheduler] Sweeping ${activeDeals.length} active chase deals`);

    for (const deal of activeDeals) {
      await this.enqueueJob({ type: 'RunChase', dealId: String(deal.id) }).catch((err) =>
        console.error(`[ChaseScheduler] Failed to enqueue RunChase for deal ${deal.id}:`, err)
      );
    }
  }
}
