import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OrchestratorAgent } from '../src/index';
import { Deal, DealStage } from '@closepilot/core';

describe('OrchestratorAgent', () => {
  let orchestrator: OrchestratorAgent;

  beforeEach(() => {
    orchestrator = new OrchestratorAgent();
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

  it('should process a standard deal fully without approval', async () => {
    const deal = createTestDeal('deal-1');
    deal.proposal = {
      title: 'Standard',
      executiveSummary: 'Sum',
      scope: 'scope',
      timeline: '1w',
      terms: [],
      nextSteps: [],
      pricing: { currency: 'USD', total: 10000, breakdown: [] } // Under 50k
    };

    await orchestrator.processDeal(deal);
    await orchestrator.waitForAllDeals();

    expect(deal.stage).toBe(DealStage.COMPLETED);
    const report = orchestrator.getReport();
    expect(report.totalDealsProcessed).toBe(1);
  });

  it('should require approval for deals over 50k', async () => {
    const deal = createTestDeal('deal-2');
    deal.proposal = {
      title: 'Large Project',
      executiveSummary: 'Sum',
      scope: 'scope',
      timeline: '10w',
      terms: [],
      nextSteps: [],
      pricing: { currency: 'USD', total: 60000, breakdown: [] } // Over 50k
    };

    // Need to pre-set it to a stage right before proposal generation or have it go through
    // For test reliability, start at PROPOSAL stage
    deal.stage = DealStage.PROPOSAL;
    await orchestrator.processDeal(deal);
    await orchestrator.waitForAllDeals();

    // It should stop at PROPOSAL (or whatever stage it paused at)
    expect(deal.stage).toBe(DealStage.PROPOSAL);

    // Approve it
    orchestrator.approveDeal(deal.id);
    await orchestrator.waitForAllDeals();

    expect(deal.stage).toBe(DealStage.COMPLETED);
  });

  it('should handle concurrent deals properly', async () => {
    const deals = Array.from({ length: 15 }, (_, i) => createTestDeal(`batch-deal-${i}`));

    deals.forEach(deal => {
      deal.proposal = {
        title: 'Concurrent',
        executiveSummary: 'Sum',
        scope: 'scope',
        timeline: '1w',
        terms: [],
        nextSteps: [],
        pricing: { currency: 'USD', total: 5000, breakdown: [] }
      };
    });

    // Start all concurrently
    await Promise.all(deals.map(d => orchestrator.processDeal(d)));
    await orchestrator.waitForAllDeals();

    const report = orchestrator.getReport();
    expect(report.totalDealsProcessed).toBe(15);
    deals.forEach(deal => {
      expect(deal.stage).toBe(DealStage.COMPLETED);
    });
  });
});
