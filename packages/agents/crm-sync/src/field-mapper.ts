import { Deal } from '@closepilot/core';
import { CrmContact, CrmDeal } from './crm-adapter';

/**
 * Extracts first and last name from a full name string
 */
export function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) {
    return { firstName: '', lastName: '' };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');
  return { firstName, lastName };
}

/**
 * Maps a Closepilot Deal to a CrmContact
 */
export function mapDealToContact(deal: Deal): CrmContact {
  const { firstName, lastName } = splitName(deal.leadName);

  return {
    email: deal.leadEmail,
    firstName,
    lastName,
    companyName: deal.leadCompany,
    jobTitle: deal.leadTitle || deal.prospectResearch?.title,
  };
}

/**
 * Maps a Closepilot Deal to a CrmDeal
 */
export function mapDealToCrmDeal(deal: Deal, contactId?: string): CrmDeal {
  let amount = 0;
  if (deal.proposal?.pricing?.total) {
    amount = deal.proposal.pricing.total;
  }

  // Set close date to 30 days from now as a default, or parse from proposal timeline if available
  const closeDate = new Date();
  closeDate.setDate(closeDate.getDate() + 30);

  const dealName = deal.projectScope?.title
    ? `${deal.leadCompany || deal.leadName} - ${deal.projectScope.title}`
    : `${deal.leadCompany || deal.leadName} - Deal`;

  return {
    name: dealName,
    amount,
    stage: 'Proposal Sent', // Or map from deal.stage if your CRM uses matching stage names
    closeDate,
    contactId,
    description: deal.projectScope?.description || 'No description provided.',
  };
}
