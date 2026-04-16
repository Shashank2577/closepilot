import { extractActivities } from '../src/activity-sync';
import { Deal, DealStage } from '@closepilot/core';

describe('extractActivities', () => {
  const baseDeal: Deal = {
    id: 'deal-1',
    stage: DealStage.CRM_SYNC,
    createdAt: new Date('2023-01-01T12:00:00Z'),
    updatedAt: new Date('2023-01-01T12:00:00Z'),
    leadEmail: 'test@test.com',
    leadName: 'Test Name',
    source: 'gmail'
  };

  test('extracts basic lead capture note', () => {
    const activities = extractActivities(baseDeal, 'crm-deal-123');

    expect(activities.length).toBe(1);
    expect(activities[0].subject).toBe('Lead Captured via Closepilot');
    expect(activities[0].dealId).toBe('crm-deal-123');
    expect(activities[0].type).toBe('note');
  });

  test('extracts enrichment, scoping, and proposal notes if present', () => {
    const richDeal: Deal = {
      ...baseDeal,
      companyResearch: { companyName: 'Test Inc', industry: 'Tech' },
      projectScope: { title: 'Test Scope', complexity: 'low', services: [], deliverables: [], assumptions: [], risks: [], description: '' },
      proposal: { title: 'Test Prop', executiveSummary: '', scope: '', timeline: '', terms: [], nextSteps: [], pricing: { currency: 'USD', total: 100, breakdown: [] } }
    };

    const activities = extractActivities(richDeal, 'crm-deal-123');

    expect(activities.length).toBe(4);

    const subjects = activities.map(a => a.subject);
    expect(subjects).toContain('Lead Captured via Closepilot');
    expect(subjects).toContain('Enrichment Data Compiled');
    expect(subjects).toContain('Project Scope Defined');
    expect(subjects).toContain('Proposal Generated');
  });
});
