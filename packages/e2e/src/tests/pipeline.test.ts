import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DealStage } from '@closepilot/core';
import { cleanDatabase, seedDeal, waitForStage } from '../helpers/db.js';
import { getDb, deals } from '@closepilot/db';
import { eq } from 'drizzle-orm';
import { MOCK_EXTRACTED_LEAD, MOCK_ENRICHMENT, MOCK_SCOPING } from '../fixtures/claude-responses.js';
import { SAMPLE_LEAD_EMAIL } from '../fixtures/lead-email.js';

// Mock dependencies
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockImplementation(async (args: any) => {
        // Return dummy responses based on the prompt/agent
        return {
          content: [{ text: JSON.stringify(MOCK_EXTRACTED_LEAD) }]
        };
      })
    }
  }))
}));

vi.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: vi.fn().mockImplementation(() => ({
        getClient: vi.fn().mockResolvedValue({})
      }))
    },
    drive: vi.fn().mockImplementation(() => ({
      files: {
        create: vi.fn().mockResolvedValue({ data: { id: 'mock-doc-id', webViewLink: 'mock-url' } }),
        copy: vi.fn().mockResolvedValue({ data: { id: 'mock-doc-id', webViewLink: 'mock-url' } }),
      }
    })),
    docs: vi.fn().mockImplementation(() => ({
      documents: {
        batchUpdate: vi.fn().mockResolvedValue({})
      }
    }))
  }
}));

describe('Pipeline Integration Tests', () => {
  beforeEach(async () => {
    if (!process.env.DATABASE_URL) return;
    await cleanDatabase();
  });

  describe('Agent Stages', () => {
    it('ingestion: processEmail creates deal at ENRICHMENT stage', async () => {
      if (!process.env.DATABASE_URL) return;
      // @ts-ignore
      const { GmailMonitor } = await import('@closepilot/agents-ingestion');
      // Mock MCP clients
      const mockGmailTools = {} as any;
      const mockDealStoreTools = {
        createDeal: vi.fn().mockImplementation(async (input) => {
          const db = getDb();
          const [d] = await db.insert(deals).values({
            ...input,
            stage: DealStage.ENRICHMENT
          }).returning();
          return d;
        }),
        updateDealStage: vi.fn()
      } as any;

      const monitor = new GmailMonitor(mockGmailTools, mockDealStoreTools, {
        anthropicApiKey: 'mock',
        pollIntervalMinutes: 5
      });

      // Override the extractor to use mock data directly for test simplicity
      // since testing the Anthropic SDK parsing is flaky without real SDK execution.
      (monitor as any).extractor = {
        extractFromEmail: vi.fn().mockResolvedValue(MOCK_EXTRACTED_LEAD)
      };

      // @ts-ignore
      await monitor.processEmail({
        id: '123',
        threadId: '456',
        subject: SAMPLE_LEAD_EMAIL.subject,
        from: { email: SAMPLE_LEAD_EMAIL.from, name: 'John Smith' },
        to: [{ email: 'hello@closepilot.com', name: 'Closepilot' }],
        body: SAMPLE_LEAD_EMAIL.text,
        timestamp: new Date()
      });

      // Verify deal created in DB
      const db = getDb();
      const [deal] = await db.select().from(deals).limit(1);

      expect(deal).toBeDefined();
      expect(deal.leadEmail).toBe(MOCK_EXTRACTED_LEAD.email);
      expect(deal.stage).toBe(DealStage.ENRICHMENT);
    });

    it('enrichment: process populates company research', async () => {
      if (!process.env.DATABASE_URL) return;
      const seed = await seedDeal(DealStage.ENRICHMENT, { leadCompany: 'Acme Corp', leadName: 'John Smith' });
      // @ts-ignore
      const { EnrichmentAgent } = await import('@closepilot/enrichment');

      const agent = new EnrichmentAgent();
      // Mock the researchers
      (agent as any).companyResearcher = { research: vi.fn().mockResolvedValue(MOCK_ENRICHMENT) };
      (agent as any).prospectResearcher = { research: vi.fn().mockResolvedValue({}) };

      const result = await agent.process({
        dealId: seed.id.toString(),
        deal: { ...seed, id: seed.id.toString() } as any,
        context: {} as any
      });

      expect(result.success).toBe(true);
      expect(result.nextStage).toBe(DealStage.SCOPING);
      expect((result.data as any).companyResearch).toEqual(MOCK_ENRICHMENT);
    });

    it('scoping: processDeal extracts requirements', async () => {
      if (!process.env.DATABASE_URL) return;
      const seed = await seedDeal(DealStage.SCOPING);
      // @ts-ignore
      const { ScopingAgent } = await import('@closepilot/agent-scoping');

      const mockDealStore = {
        getDeal: vi.fn().mockResolvedValue({ ...seed, id: seed.id.toString() }),
        updateDeal: vi.fn().mockImplementation(async (id: any, updates: any) => {
          const db = getDb();
          await db.update(deals).set(updates).where(eq(deals.id, seed.id));
          return { ...seed, ...updates };
        }),
        updateDealStage: vi.fn().mockImplementation(async (id: any, stage: any) => {
          const db = getDb();
          await db.update(deals).set({ stage }).where(eq(deals.id, seed.id));
          return { ...seed, stage };
        })
      } as any;

      const agent = new ScopingAgent({ anthropicApiKey: 'mock' } as any);
      (agent as any).dealStoreTools = mockDealStore;
      // Mock parsing
      vi.spyOn(agent as any, 'analyzeDeal').mockResolvedValue({
        requirements: MOCK_SCOPING.requirements,
        projectScope: {
          complexity: MOCK_SCOPING.complexity,
          estimatedHours: MOCK_SCOPING.estimatedHours,
          clarificationQuestions: []
        }
      });

      // @ts-ignore
      const result = await agent.processDeal({
        dealId: seed.id.toString(),
        deal: { ...seed, id: seed.id.toString() } as any,
        context: {} as any
      });

      expect(result.success).toBe(true);
      expect(result.deal.stage).toBe(DealStage.PROPOSAL);

      // Verify DB
      const db = getDb();
      const [deal] = await db.select().from(deals).where(eq(deals.id, seed.id));
      expect(deal.stage).toBe(DealStage.PROPOSAL);
    });

    it('crm-sync: processDeal sets crmId and COMPLETED stage', async () => {
      if (!process.env.DATABASE_URL) return;
      const seed = await seedDeal(DealStage.CRM_SYNC);
      // @ts-ignore
      const { CRMSyncAgent } = await import('@closepilot/agent-crm-sync');

      const mockDealStore = {
        getDeal: vi.fn().mockResolvedValue({ ...seed, id: seed.id.toString(), stage: DealStage.CRM_SYNC }),
        updateDealStage: vi.fn().mockImplementation(async (id: any, stage: any) => {
          const db = getDb();
          await db.update(deals).set({ stage }).where(eq(deals.id, seed.id));
          return { ...seed, stage };
        }),
        updateDeal: vi.fn().mockImplementation(async (id: any, updates: any) => {
          const db = getDb();
          await db.update(deals).set(updates).where(eq(deals.id, seed.id));
          return { ...seed, ...updates };
        })
      } as any;

      const agent = new CRMSyncAgent(mockDealStore as any, {} as any);
      // Mock CRM adapter
      const mockAdapter = {
        syncDeal: vi.fn().mockResolvedValue('mock-crm-id')
      };
      (agent as any).getAdapter = vi.fn().mockReturnValue(mockAdapter);

      // @ts-ignore
      const result = await agent.processDeal({
        dealId: seed.id.toString(),
        deal: { ...seed, id: seed.id.toString() } as any,
        context: { crmSystem: 'hubspot' } as any
      });

      expect(result.success).toBe(true);
      // @ts-ignore
      expect(result.deal.crmId).toBe('mock-crm-id');

      // Verify DB
      const db = getDb();
      const [deal] = await db.select().from(deals).where(eq(deals.id, seed.id));
      expect(deal.stage).toBe('completed');
      expect(deal.crmId).toBe('mock-crm-id');
    });

    it('orchestrator: full pipeline happy path', async () => {
      if (!process.env.DATABASE_URL) return;
      // We will test state transitions directly through the orchestrator's state machine wrapper.
      // E2E test would involve all packages interacting together.
      // @ts-ignore
      const { OrchestratorAgent } = await import('@closepilot/orchestrator');

      const seed = await seedDeal(DealStage.INGESTION, {
        leadEmail: 'flow@acme.com',
        leadName: 'Jane Doe',
        leadCompany: 'Acme'
      });

      const mockDealStore = {
        getDeal: vi.fn().mockResolvedValue({ ...seed, id: seed.id.toString() }),
        updateDealStage: vi.fn().mockResolvedValue({ ...seed, id: seed.id.toString(), stage: DealStage.ENRICHMENT })
      } as any;
      const mockApprovalQueue = {} as any;

      const agent = new OrchestratorAgent({ anthropicApiKey: 'mock' } as any);
      (agent as any).dealStore = mockDealStore;
      (agent as any).approvalQueue = mockApprovalQueue;

      // Mock the agent dispatches to succeed and transition to next stages
      agent['dispatchToAgent'] = vi.fn().mockImplementation(async (deal: any, nextStage: any) => {
        return {
          dealId: deal.id,
          success: true,
          nextStage: nextStage
        };
      });

      // Just verify we can call processDeal and it attempts to move it forward
      // @ts-ignore
      const result = await agent.processDeal({ ...seed, id: seed.id.toString() } as any);

      expect(result.success).toBe(true);
      expect(agent['dispatchToAgent']).toHaveBeenCalled();
    });
  });
});
