import type { Deal } from '@closepilot/core';
import type { CRMAdapter, CRMActivityData } from './crm-adapter.js';
import { FieldMapper } from './field-mapper.js';

/**
 * Activity Sync
 * Syncs activities from Closepilot to CRM
 */
export class ActivitySync {
  private crmAdapter: CRMAdapter;
  private fieldMapper: FieldMapper;

  constructor(crmAdapter: CRMAdapter, fieldMapper: FieldMapper) {
    this.crmAdapter = crmAdapter;
    this.fieldMapper = fieldMapper;
  }

  /**
   * Sync all deal activities to CRM
   */
  async syncDealActivities(deal: Deal, crmDealId: string): Promise<void> {
    const activities = this.extractActivities(deal);

    for (const activity of activities) {
      activity.dealId = crmDealId;

      try {
        await this.crmAdapter.syncActivity(activity);
      } catch (error) {
        console.error(`Failed to sync activity ${activity.subject}:`, error);
        // Continue with other activities even if one fails
      }
    }
  }

  /**
   * Extract activities from deal
   */
  private extractActivities(deal: Deal): CRMActivityData[] {
    const activities: CRMActivityData[] = [];

    // Add initial email activity
    if (deal.initialEmailId) {
      activities.push(
        this.fieldMapper.mapToActivity(
          deal,
          'email',
          'Initial Inquiry',
          'Initial email thread from lead'
        )
      );
    }

    // Add enrichment activity
    if (deal.companyResearch || deal.prospectResearch) {
      activities.push(
        this.fieldMapper.mapToActivity(
          deal,
          'note',
          'Research Completed',
          this.formatResearchActivity(deal)
        )
      );
    }

    // Add scoping activity
    if (deal.projectScope) {
      activities.push(
        this.fieldMapper.mapToActivity(
          deal,
          'note',
          'Project Scope Defined',
          this.formatScopeActivity(deal)
        )
      );
    }

    // Add proposal activity
    if (deal.proposal) {
      activities.push(
        this.fieldMapper.mapToActivity(
          deal,
          'note',
          'Proposal Generated',
          this.formatProposalActivity(deal)
        )
      );
    }

    return activities;
  }

  /**
   * Format research activity
   */
  private formatResearchActivity(deal: Deal): string {
    const parts: string[] = [];

    if (deal.companyResearch) {
      parts.push('**Company Research**');
      parts.push(`Industry: ${deal.companyResearch.industry || 'N/A'}`);
      parts.push(`Size: ${deal.companyResearch.size || 'N/A'}`);

      if (deal.companyResearch.technologies?.length) {
        parts.push(`Tech Stack: ${deal.companyResearch.technologies.join(', ')}`);
      }
    }

    if (deal.prospectResearch) {
      parts.push('\n**Prospect Research**');
      parts.push(`Title: ${deal.prospectResearch.title}`);
      parts.push(`Decision Maker: ${deal.prospectResearch.decisionMaker ? 'Yes' : 'No'}`);
      parts.push(`Influence Level: ${deal.prospectResearch.influenceLevel}`);
    }

    return parts.join('\n');
  }

  /**
   * Format scope activity
   */
  private formatScopeActivity(deal: Deal): string {
    if (!deal.projectScope) return '';

    const parts: string[] = [];

    parts.push(`**Title**: ${deal.projectScope.title}`);
    parts.push(`**Description**: ${deal.projectScope.description}`);
    parts.push(`**Complexity**: ${deal.projectScope.complexity}`);

    if (deal.projectScope.services?.length) {
      parts.push(`**Services**: ${deal.projectScope.services.join(', ')}`);
    }

    if (deal.projectScope.deliverables?.length) {
      parts.push(`**Deliverables**: ${deal.projectScope.deliverables.join(', ')}`);
    }

    return parts.join('\n');
  }

  /**
   * Format proposal activity
   */
  private formatProposalActivity(deal: Deal): string {
    if (!deal.proposal) return '';

    const parts: string[] = [];

    parts.push(`**Title**: ${deal.proposal.title}`);
    parts.push(`**Total**: ${deal.proposal.pricing.currency} ${deal.proposal.pricing.total}`);

    if (deal.proposal.pricing.breakdown?.length) {
      parts.push('\n**Pricing Breakdown**:');
      for (const item of deal.proposal.pricing.breakdown) {
        parts.push(`- ${item.service}: ${deal.proposal.pricing.currency} ${item.amount}`);
        if (item.description) {
          parts.push(`  ${item.description}`);
        }
      }
    }

    if (deal.proposal.nextSteps?.length) {
      parts.push('\n**Next Steps**:');
      deal.proposal.nextSteps.forEach((step: string, i: number) => {
        parts.push(`${i + 1}. ${step}`);
      });
    }

    return parts.join('\n');
  }
}
