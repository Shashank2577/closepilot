import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Orchestrator } from '../src/index';
import { Deal, DealStage } from '@closepilot/core';

// Mock enqueueAgentJob to avoid Redis connection issues in existing tests
vi.mock('../src/queue.js', () => ({
  enqueueAgentJob: vi.fn().mockResolvedValue(undefined),
}));

describe('Orchestrator', () => {
  let orchestrator: Orchestrator;

  beforeEach(() => {
    orchestrator = new Orchestrator();
  });

  function createTestDeal(id: string, stage: DealStage = DealStage.INGESTION): Deal {
    return {
      id,
      stage,
      createdAt: new Date(),
      updatedAt: new Date(),
      leadEmail: 'test@example.com',
      leadName: 'Test User',
      source: 'manual'
    };
  }

  it('should process a standard deal and enqueue a job', async () => {
    const deal = createTestDeal('deal-1');
    // For test purposes, start at a stage that would trigger an enqueue
    deal.stage = DealStage.INGESTION;

    // The orchestrator is now async, so it won't wait for the worker.
    // In our refactored orchestrator, it enqueues a job and transitions the stage.
    await orchestrator.start();
    const result = await orchestrator.processDeal(deal);

    expect(result.dealId).toBe('deal-1');
    // In our refactored code, it transitions to the next stage and breaks
    expect(result.finalStage).toBe(DealStage.ENRICHMENT);
  });
});
