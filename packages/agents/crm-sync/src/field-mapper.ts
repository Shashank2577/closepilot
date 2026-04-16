import type { Deal, Proposal } from '@closepilot/core';
import type { ContactData, CRMDealData, CRMActivityData, FieldMapping } from './crm-adapter.js';

/**
 * Field Mapper
 * Maps Closepilot fields to CRM-specific fields
 */
export class FieldMapper {
  private hubSpotContactMappings: FieldMapping[] = [
    { sourceField: 'leadEmail', targetField: 'email', required: true },
    { sourceField: 'leadName', targetField: 'firstname', required: true },
    { sourceField: 'leadCompany', targetField: 'company' },
    { sourceField: 'leadTitle', targetField: 'jobtitle' },
  ];

  private hubSpotDealMappings: FieldMapping[] = [
    { sourceField: 'id', targetField: 'closepilot_deal_id', required: true },
    { sourceField: 'projectScope.title', targetField: 'dealname', required: true },
    { sourceField: 'proposal.pricing.total', targetField: 'amount' },
    { sourceField: 'proposal.pricing.currency', targetField: 'currency' },
    { sourceField: 'stage', targetField: 'dealstage' },
  ];

  /**
   * Map Closepilot deal to Contact data
   */
  mapToContact(deal: Deal): ContactData {
    const nameParts = deal.leadName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    return {
      email: deal.leadEmail,
      firstName,
      lastName,
      company: deal.leadCompany,
      title: deal.leadTitle,
      phone: this.extractPhone(deal),
      leadSource: deal.source,
    };
  }

  /**
   * Map Closepilot deal to CRM deal data
   */
  mapToDeal(deal: Deal, crmStage: string): CRMDealData {
    const dealData: CRMDealData = {
      closepilotDealId: deal.id,
      title: this.getDealTitle(deal),
      stage: crmStage,
      description: this.getDealDescription(deal),
      source: 'Closepilot',
    };

    // Add pricing if proposal exists
    if (deal.proposal) {
      dealData.amount = deal.proposal.pricing.total;
      dealData.currency = deal.proposal.pricing.currency;
      dealData.proposal = deal.proposal;
    }

    return dealData;
  }

  /**
   * Map Closepilot activities to CRM activity
   */
  mapToActivity(
    deal: Deal,
    type: 'email' | 'call' | 'meeting' | 'note' | 'task',
    subject: string,
    body?: string
  ): CRMActivityData {
    return {
      dealId: deal.id,
      type,
      subject,
      body,
      timestamp: new Date(),
    };
  }

  /**
   * Get deal title from deal data
   */
  private getDealTitle(deal: Deal): string {
    if (deal.projectScope?.title) {
      return deal.projectScope.title;
    }

    if (deal.proposal?.title) {
      return deal.proposal.title;
    }

    return `Project with ${deal.leadCompany || deal.leadName}`;
  }

  /**
   * Get deal description from deal data
   */
  private getDealDescription(deal: Deal): string {
    const parts: string[] = [];

    if (deal.projectScope?.description) {
      parts.push(deal.projectScope.description);
    }

    if (deal.proposal?.executiveSummary) {
      parts.push(deal.proposal.executiveSummary);
    }

    if (deal.companyResearch?.description) {
      parts.push(`Company: ${deal.companyResearch.description}`);
    }

    return parts.join('\n\n');
  }

  /**
   * Extract phone from deal
   */
  private extractPhone(deal: Deal): string | undefined {
    // Try to extract phone from prospect research or other fields
    // This is a placeholder - implement based on your data structure
    return undefined;
  }

  /**
   * Get stage mapping for CRM
   */
  getCRMStage(
    deal: Deal,
    crmType: 'hubspot' | 'salesforce' | 'pipedrive'
  ): string {
    const stageMappings: Record<string, Record<string, string>> = {
      hubspot: {
        proposal: 'qualifiedtobuy',
        crm_sync: 'contractsent',
        completed: 'closedwon',
      },
      salesforce: {
        proposal: 'Negotiation',
        crm_sync: 'Closed Won',
        completed: 'Closed Won',
      },
      pipedrive: {
        proposal: 'Proposal',
        crm_sync: 'Won',
        completed: 'Won',
      },
    };

    return stageMappings[crmType][deal.stage] || 'Qualified';
  }

  /**
   * Map custom fields
   */
  mapCustomFields(
    deal: Deal,
    customFieldMappings: FieldMapping[]
  ): Record<string, unknown> {
    const customFields: Record<string, unknown> = {};

    for (const mapping of customFieldMappings) {
      const value = this.getNestedValue(deal, mapping.sourceField);

      if (value !== undefined && value !== null) {
        const transformedValue = mapping.transform
          ? mapping.transform(value)
          : value;

        customFields[mapping.targetField] = transformedValue;
      } else if (mapping.required) {
        throw new Error(
          `Required field ${mapping.sourceField} is missing or null`
        );
      }
    }

    return customFields;
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: unknown, path: string): unknown {
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined;
    }, obj);
  }
}
