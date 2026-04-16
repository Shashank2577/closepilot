import { Deal, DealStage, AgentInput, ProposalContext, ProjectScope } from '@closepilot/core';
import { ProposalAgent } from '../src/index';

describe('ProposalAgent', () => {
  let agent: ProposalAgent;

  beforeEach(() => {
    agent = new ProposalAgent();
  });

  const baseDeal: Deal = {
    id: 'deal_123',
    stage: DealStage.PROPOSAL,
    createdAt: new Date(),
    updatedAt: new Date(),
    leadEmail: 'test@example.com',
    leadName: 'Test Lead',
    source: 'manual',
  };

  const baseScope: ProjectScope = {
    title: 'Test Project',
    description: 'A test project description',
    complexity: 'medium',
    services: ['Web Development'],
    deliverables: ['Website'],
    assumptions: ['Client provides assets'],
    risks: ['Timeline delays'],
  };

  it('should fail if deal has no projectScope', async () => {
    const input: AgentInput<ProposalContext> = {
      dealId: 'deal_123',
      deal: baseDeal,
      context: {
        pricingStrategy: 'standard',
        includeCaseStudies: true,
      }
    };

    const result = await agent.process(input);
    expect(result.success).toBe(false);
    expect(result.errors).toContain('Deal does not have a defined project scope. Cannot generate proposal.');
  });

  it('should generate a proposal and proceed to CRM_SYNC for deals under $50k', async () => {
    // Web Development (15k) * medium (1.5) * standard (1.15) = ~25,875 (under 50k)
    const input: AgentInput<ProposalContext> = {
      dealId: 'deal_123',
      deal: {
        ...baseDeal,
        projectScope: {
          ...baseScope,
          complexity: 'medium',
          services: ['Web Development'],
        }
      },
      context: {
        pricingStrategy: 'standard',
        includeCaseStudies: true,
      }
    };

    const result = await agent.process(input);
    expect(result.success).toBe(true);
    expect(result.requiresApproval).toBe(false);
    expect(result.nextStage).toBe(DealStage.CRM_SYNC);
    expect(result.data?.proposal).toBeDefined();
    expect(result.data?.proposalDocumentId).toBeDefined();

    // Check proposal content
    const proposal = result.data!.proposal!;
    expect(proposal.title).toBe('Proposal: Test Project');
    expect(proposal.pricing.total).toBeLessThan(50000);
  });

  it('should require approval for deals over $50k', async () => {
    // Multiple expensive services with high complexity
    // Web (15k) + Mobile (25k) = 40k * high (2.5) * premium (1.3) = 130k (over 50k)
    const input: AgentInput<ProposalContext> = {
      dealId: 'deal_123',
      deal: {
        ...baseDeal,
        projectScope: {
          ...baseScope,
          complexity: 'high',
          services: ['Web Development', 'Mobile App Development'],
        }
      },
      context: {
        pricingStrategy: 'premium',
        includeCaseStudies: true,
      }
    };

    const result = await agent.process(input);
    expect(result.success).toBe(true);
    expect(result.requiresApproval).toBe(true);
    expect(result.nextStage).toBeUndefined();
    expect(result.data?.proposal).toBeDefined();
    expect(result.data?.proposal!.pricing.total).toBeGreaterThan(50000);
  });

  it('should respect custom context parameters (e.g. custom pricing)', async () => {
    const input: AgentInput<ProposalContext> = {
      dealId: 'deal_123',
      deal: {
        ...baseDeal,
        projectScope: {
          ...baseScope,
          complexity: 'low',
          services: ['SEO'],
        }
      },
      context: {
        pricingStrategy: 'custom',
        includeCaseStudies: false,
      }
    };

    const result = await agent.process(input);
    expect(result.success).toBe(true);
    expect(result.data?.proposal?.pricing.breakdown[0].description).toContain('Custom');
  });
});
