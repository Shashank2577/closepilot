import { describe, it, expect, vi } from 'vitest';
import { ChaseScheduler } from './chase-scheduler.js';

describe('ChaseScheduler', () => {
  it('enqueues RunChase for each active deal', async () => {
    const enqueueJob = vi.fn().mockResolvedValue(undefined);
    const getStalledDeals = vi.fn().mockResolvedValue([
      { id: 'deal-1', stage: 'proposal-sent' },
      { id: 'deal-2', stage: 'follow-up-1' },
    ]);

    const scheduler = new ChaseScheduler({ enqueueJob, getStalledDeals });
    await scheduler.runSweep();

    expect(getStalledDeals).toHaveBeenCalledOnce();
    expect(enqueueJob).toHaveBeenCalledTimes(2);
    expect(enqueueJob).toHaveBeenCalledWith({ type: 'RunChase', dealId: 'deal-1' });
    expect(enqueueJob).toHaveBeenCalledWith({ type: 'RunChase', dealId: 'deal-2' });
  });

  it('does nothing when no deals returned', async () => {
    const enqueueJob = vi.fn();
    const getStalledDeals = vi.fn().mockResolvedValue([]);

    const scheduler = new ChaseScheduler({ enqueueJob, getStalledDeals });
    await scheduler.runSweep();

    expect(enqueueJob).not.toHaveBeenCalled();
  });

  it('continues when one enqueue fails', async () => {
    const enqueueJob = vi
      .fn()
      .mockRejectedValueOnce(new Error('queue full'))
      .mockResolvedValue(undefined);
    const getStalledDeals = vi.fn().mockResolvedValue([
      { id: 'deal-1', stage: 'proposal-sent' },
      { id: 'deal-2', stage: 'follow-up-1' },
    ]);

    const scheduler = new ChaseScheduler({ enqueueJob, getStalledDeals });
    await scheduler.runSweep();

    expect(enqueueJob).toHaveBeenCalledTimes(2);
  });
});
