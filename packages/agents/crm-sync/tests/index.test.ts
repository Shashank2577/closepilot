import { processDeal } from '../src/index';
import { Deal, DealStage, AgentInput, CrmSyncContext } from '@closepilot/core';
import * as adapterModule from '../src/hubspot-adapter';

// Mock the adapter
jest.mock('../src/hubspot-adapter', () => {
  return {
    HubSpotAdapter: jest.fn().mockImplementation(() => {
      return {
        connect: jest.fn().mockResolvedValue(undefined),
        upsertContact: jest.fn().mockResolvedValue({ id: 'contact-id' }),
        upsertDeal: jest.fn().mockResolvedValue({ id: 'deal-id' }),
        addActivity: jest.fn().mockResolvedValue({ id: 'note-id' }),
        attachDocument: jest.fn().mockResolvedValue(undefined),
      };
    })
  };
});

describe('processDeal (CRM Orchestrator)', () => {
  const mockDeal: Deal = {
    id: 'test-deal-123',
    stage: DealStage.CRM_SYNC,
    createdAt: new Date(),
    updatedAt: new Date(),
    leadEmail: 'lead@example.com',
    leadName: 'Test Lead',
    source: 'manual',
    approvalStatus: 'approved',
    proposal: {
      title: 'Test Proposal',
      executiveSummary: 'Summ',
      scope: 'Scope',
      timeline: '1 mo',
      pricing: { currency: 'USD', total: 5000, breakdown: [] },
      terms: [],
      nextSteps: []
    }
  };

  const mockInput: AgentInput<CrmSyncContext> = {
    dealId: mockDeal.id,
    deal: mockDeal,
    context: {
      crmSystem: 'hubspot',
      syncFields: [],
      createContact: true,
      createDeal: true
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('successfully processes deal to hubspot', async () => {
    const result = await processDeal(mockInput);

    expect(result.success).toBe(true);
    expect(result.nextStage).toBe(DealStage.COMPLETED);
    expect(result.errors).toBeUndefined();

    // Check if Deal object was mutated with CRM IDs
    expect(mockDeal.crmId).toBe('deal-id');
    expect(mockDeal.crmSyncedAt).toBeDefined();
  });

  test('fails gracefully when no proposal is present', async () => {
    const noProposalDeal = { ...mockDeal, proposal: undefined };
    const result = await processDeal({ ...mockInput, deal: noProposalDeal });

    expect(result.success).toBe(false);
    expect(result.nextStage).toBe(DealStage.FAILED);
    expect(result.errors).toContain('Cannot sync deal to CRM: No proposal found.');
  });

  test('fails gracefully when deal is not approved', async () => {
    const unapprovedDeal = { ...mockDeal, approvalStatus: 'pending' as const };
    const result = await processDeal({ ...mockInput, deal: unapprovedDeal });

    expect(result.success).toBe(false);
    expect(result.nextStage).toBe(DealStage.FAILED);
    expect(result.errors).toContain('Cannot sync deal to CRM: Proposal is not approved.');
  });
});
