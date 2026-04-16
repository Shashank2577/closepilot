import type { EmailMessage, DealInput } from '@closepilot/core';
import { EmailClassifier } from './email-classifier';

/**
 * Extracted lead information
 */
export interface ExtractedLead {
  name: string;
  email: string;
  company?: string;
  title?: string;
  threadId: string;
  initialEmailId: string;
  requirements?: string[];
  budgetMentioned?: string;
  timelineMentioned?: string;
  urgency?: 'low' | 'medium' | 'high';
}

/**
 * Lead Extractor
 * Extracts lead information from classified lead inquiry emails
 */
export class LeadExtractor {
  private classifier: EmailClassifier;

  constructor(classifier: EmailClassifier) {
    this.classifier = classifier;
  }

  /**
   * Extract lead information from an email
   */
  async extractLead(email: EmailMessage): Promise<ExtractedLead | null> {
    // Use the classifier to extract lead info
    const extractedInfo = await this.classifier.extractLeadInfo(email);

    // Build lead object
    const lead: ExtractedLead = {
      name: extractedInfo.name || this.extractNameFromEmail(email),
      email: email.from.email,
      company: extractedInfo.company,
      title: extractedInfo.title,
      threadId: email.threadId,
      initialEmailId: email.id,
      requirements: extractedInfo.requirements,
      budgetMentioned: extractedInfo.budgetMentioned,
      timelineMentioned: extractedInfo.timelineMentioned,
      urgency: extractedInfo.urgency || 'medium',
    };

    return lead;
  }

  /**
   * Convert extracted lead to DealInput for database
   */
  toDealInput(lead: ExtractedLead): DealInput {
    return {
      leadEmail: lead.email,
      leadName: lead.name,
      leadCompany: lead.company,
      leadTitle: lead.title,
      threadId: lead.threadId,
      initialEmailId: lead.initialEmailId,
      source: 'gmail',
    };
  }

  /**
   * Extract name from email if not found in body
   */
  private extractNameFromEmail(email: EmailMessage): string {
    // Try to get name from email header
    if (email.from.name) {
      return email.from.name;
    }

    // Fallback: use email address
    return email.from.email.split('@')[0];
  }

  /**
   * Validate extracted lead has minimum required fields
   */
  validateLead(lead: ExtractedLead): boolean {
    return !!(
      lead.name &&
      lead.email &&
      lead.threadId &&
      lead.initialEmailId
    );
  }

  /**
   * Extract company name from email domain
   */
  extractCompanyFromEmail(email: string): string | null {
    const domain = email.split('@')[1];
    if (!domain) return null;

    // Remove common TLDs and get company name
    const parts = domain.split('.');
    if (parts.length >= 2) {
      return parts[parts.length - 2];
    }

    return null;
  }

  /**
   * Check if email is from a free email provider (less likely to be B2B)
   */
  isFreeEmailProvider(email: string): boolean {
    const freeProviders = [
      'gmail.com',
      'yahoo.com',
      'hotmail.com',
      'outlook.com',
      'aol.com',
      'icloud.com',
      'protonmail.com',
    ];

    const domain = email.split('@')[1]?.toLowerCase();
    return freeProviders.includes(domain);
  }

  /**
   * Score lead quality based on available information
   */
  scoreLeadQuality(lead: ExtractedLead): number {
    let score = 0;

    // Has company name
    if (lead.company) score += 20;

    // Has job title
    if (lead.title) score += 15;

    // Not from free email provider
    if (!this.isFreeEmailProvider(lead.email)) score += 15;

    // Has requirements
    if (lead.requirements && lead.requirements.length > 0) score += 20;

    // Has budget mentioned
    if (lead.budgetMentioned) score += 10;

    // Has timeline mentioned
    if (lead.timelineMentioned) score += 10;

    // High urgency
    if (lead.urgency === 'high') score += 10;

    return score;
  }
}

/**
 * Factory function to create a lead extractor
 */
export function createLeadExtractor(classifier: EmailClassifier): LeadExtractor {
  return new LeadExtractor(classifier);
}
