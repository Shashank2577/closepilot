import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnrichmentAgent } from '../src/index';
import { AgentInput, Deal, DealStage, AgentType } from '@closepilot/core';

describe('EnrichmentAgent', () => {
  let agent: EnrichmentAgent;
  let mockDeal: Deal;

  beforeEach(() => {
    agent = new EnrichmentAgent();

    // Mock the DataSources
    // Instead of mocking data sources, let's just let it run through the simulated delays
    // or mock the researcher instances directly, but testing the whole flow is better.
    // For faster testing, let's mock the DataSources methods.
    vi.spyOn(agent['dataSources'], 'getLinkedInCompany').mockResolvedValue({
      name: 'TestCompany',
      industry: 'Software',
      size: '10-50',
      website: 'https://testcompany.com',
      description: 'Test description'
    });

    vi.spyOn(agent['dataSources'], 'getCrunchbaseData').mockResolvedValue({
      fundingStage: 'Series A',
      fundingAmount: 10000000,
      lastFundingDate: new Date('2023-01-01'),
      competitors: ['Comp1']
    });

    vi.spyOn(agent['dataSources'], 'getClearbitData').mockResolvedValue({
      techStack: ['React', 'Node'],
      metrics: { estimatedRevenue: '$1M', employees: 20 }
    });

    vi.spyOn(agent['dataSources'], 'searchGoogle').mockResolvedValue([
      { title: 'News 1', snippet: 'Snippet 1', url: 'https://news1.com' }
    ]);

    vi.spyOn(agent['dataSources'], 'getLinkedInProfile').mockResolvedValue({
      name: 'John Doe',
      title: 'CEO',
      company: 'TestCompany',
      background: 'Background',
      tenure: '5 years',
      recentActivity: []
    });

    mockDeal = {
      id: 'deal-123',
      stage: DealStage.ENRICHMENT,
      createdAt: new Date(),
      updatedAt: new Date(),
      leadEmail: 'john@testcompany.com',
      leadName: 'John Doe',
      leadCompany: 'TestCompany',
      source: 'gmail'
    };
  });

  it('should process a deal and update it with enrichment data', async () => {
    const input: AgentInput<any> = {
      dealId: 'deal-123',
      deal: mockDeal,
      context: {}
    };

    const output = await agent.process(input);

    expect(output.success).toBe(true);
    expect(output.dealId).toBe('deal-123');
    expect(output.nextStage).toBe(DealStage.SCOPING);

    const updatedDeal = output.data as Deal;
    expect(updatedDeal.stage).toBe(DealStage.SCOPING);

    // Check Company Research
    expect(updatedDeal.companyResearch).toBeDefined();
    expect(updatedDeal.companyResearch?.companyName).toBe('TestCompany');
    expect(updatedDeal.companyResearch?.industry).toBe('Software');
    expect(updatedDeal.companyResearch?.fundingInfo?.stage).toBe('Series A');

    // Check Prospect Research
    expect(updatedDeal.prospectResearch).toBeDefined();
    expect(updatedDeal.prospectResearch?.name).toBe('John Doe');
    expect(updatedDeal.prospectResearch?.decisionMaker).toBe(true); // CEO
    expect(updatedDeal.prospectResearch?.influenceLevel).toBe('high');

    // Check Logs
    const logs = agent.logger.getLogsForDeal('deal-123');
    expect(logs.length).toBeGreaterThan(0);
    expect(logs.some(log => log.action === 'Enrichment started')).toBe(true);
    expect(logs.some(log => log.action === 'Enrichment successful, transitioning to SCOPING')).toBe(true);
  });

  it('should fail if deal is not in ENRICHMENT stage', async () => {
    mockDeal.stage = DealStage.SCOPING;

    const input: AgentInput<any> = {
      dealId: 'deal-123',
      deal: mockDeal,
      context: {}
    };

    const output = await agent.process(input);

    expect(output.success).toBe(false);
    expect(output.errors).toBeDefined();
    expect(output.errors?.[0]).toContain('Deal is not in ENRICHMENT stage');
    expect(output.requiresApproval).toBe(true);
  });

  it('should handle missing company name gracefully', async () => {
    delete mockDeal.leadCompany;

    const input: AgentInput<any> = {
      dealId: 'deal-123',
      deal: mockDeal,
      context: {}
    };

    const output = await agent.process(input);

    expect(output.success).toBe(true);
    expect(output.nextStage).toBe(DealStage.SCOPING);

    const updatedDeal = output.data as Deal;
    expect(updatedDeal.companyResearch).toBeUndefined();
    expect(updatedDeal.prospectResearch).toBeDefined();
  });
});
