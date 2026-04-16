import { Deal } from '@closepilot/core';
import { CrmActivity } from './crm-adapter';

/**
 * Extracts activities from a Deal to be synced to CRM
 */
export function extractActivities(deal: Deal, crmDealId?: string): CrmActivity[] {
  const activities: CrmActivity[] = [];
  const now = new Date();

  // 1. Initial Ingestion / Lead Capture Note
  activities.push({
    dealId: crmDealId,
    type: 'note',
    subject: 'Lead Captured via Closepilot',
    body: `Lead captured via ${deal.source}.\n\nLead Info:\nEmail: ${deal.leadEmail}\nName: ${deal.leadName}\nCompany: ${deal.leadCompany || 'N/A'}\nTitle: ${deal.leadTitle || 'N/A'}\n\nCaptured at: ${deal.createdAt.toISOString()}`,
    timestamp: deal.createdAt,
  });

  // 2. Enrichment Research Note
  if (deal.companyResearch || deal.prospectResearch) {
    let body = 'Research Data:\n\n';

    if (deal.companyResearch) {
      body += `[Company Research]\n`;
      body += `Industry: ${deal.companyResearch.industry || 'N/A'}\n`;
      body += `Size: ${deal.companyResearch.size || 'N/A'}\n`;
      body += `Description: ${deal.companyResearch.description || 'N/A'}\n\n`;
    }

    if (deal.prospectResearch) {
      body += `[Prospect Research]\n`;
      body += `Decision Maker: ${deal.prospectResearch.decisionMaker ? 'Yes' : 'No'}\n`;
      body += `Influence Level: ${deal.prospectResearch.influenceLevel}\n`;
      body += `Background: ${deal.prospectResearch.background || 'N/A'}\n`;
    }

    activities.push({
      dealId: crmDealId,
      type: 'note',
      subject: 'Enrichment Data Compiled',
      body,
      // We don't have an exact enrichment timestamp, use a rough approximation or current time
      timestamp: new Date(deal.createdAt.getTime() + 1000 * 60 * 5),
    });
  }

  // 3. Scoping Note
  if (deal.projectScope) {
    activities.push({
      dealId: crmDealId,
      type: 'note',
      subject: 'Project Scope Defined',
      body: `Scope Title: ${deal.projectScope.title}\nComplexity: ${deal.projectScope.complexity}\n\nServices: ${deal.projectScope.services.join(', ')}\n\nDeliverables: ${deal.projectScope.deliverables.join(', ')}`,
      timestamp: new Date(deal.createdAt.getTime() + 1000 * 60 * 15),
    });
  }

  // 4. Proposal Generated Note
  if (deal.proposal) {
    activities.push({
      dealId: crmDealId,
      type: 'note',
      subject: 'Proposal Generated',
      body: `Proposal: ${deal.proposal.title}\nTotal Value: ${deal.proposal.pricing.currency} ${deal.proposal.pricing.total}\n\nExecutive Summary: ${deal.proposal.executiveSummary}`,
      timestamp: new Date(deal.createdAt.getTime() + 1000 * 60 * 30),
    });
  }

  return activities;
}
