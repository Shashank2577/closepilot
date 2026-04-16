import type { Deal, Proposal } from '@closepilot/core';

/**
 * Generic CRM adapter interface
 * All CRM implementations must follow this contract
 */
export interface CRMAdapter {
  /**
   * Initialize the CRM connection
   */
  initialize(config: CRMConfig): Promise<void>;

  /**
   * Test connection to CRM
   */
  testConnection(): Promise<boolean>;

  /**
   * Create or update contact in CRM
   */
  syncContact(contact: ContactData): Promise<CRMContactResult>;

  /**
   * Create or update deal/opportunity in CRM
   */
  syncDeal(deal: CRMDealData): Promise<CRMDealResult>;

  /**
   * Sync activity/timeline to CRM
   */
  syncActivity(activity: CRMActivityData): Promise<CRMActivityResult>;

  /**
   * Attach document to deal
   */
  attachDocument(dealId: string, documentData: DocumentData): Promise<boolean>;

  /**
   * Handle sync errors with retry logic
   */
  handleError(error: Error, context: string): Promise<CRMErrorHandling>;
}

/**
 * CRM configuration
 */
export interface CRMConfig {
  type: 'hubspot' | 'salesforce' | 'pipedrive';
  apiKey?: string;
  oauthToken?: string;
  environment: 'production' | 'sandbox';
  retryConfig: RetryConfig;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

/**
 * Contact data from Closepilot deal
 */
export interface ContactData {
  email: string;
  firstName: string;
  lastName: string;
  company?: string;
  title?: string;
  phone?: string;
  leadSource?: string;
}

/**
 * Deal data for CRM sync
 */
export interface CRMDealData {
  closepilotDealId: string;
  contactId?: string;
  title: string;
  amount?: number;
  currency?: string;
  stage: string;
  closeDate?: Date;
  probability?: number;
  description?: string;
  source?: string;
  proposal?: Proposal;
  customFields?: Record<string, unknown>;
}

/**
 * Activity data for CRM sync
 */
export interface CRMActivityData {
  dealId: string;
  type: 'email' | 'call' | 'meeting' | 'note' | 'task';
  subject: string;
  body?: string;
  timestamp: Date;
  userId?: string;
}

/**
 * Document data for attachment
 */
export interface DocumentData {
  name: string;
  url?: string;
  content?: string;
  mimeType?: string;
}

/**
 * Result from contact sync
 */
export interface CRMContactResult {
  success: boolean;
  crmContactId?: string;
  created: boolean;
  updated: boolean;
  error?: string;
}

/**
 * Result from deal sync
 */
export interface CRMDealResult {
  success: boolean;
  crmDealId?: string;
  created: boolean;
  updated: boolean;
  error?: string;
}

/**
 * Result from activity sync
 */
export interface CRMActivityResult {
  success: boolean;
  crmActivityId?: string;
  error?: string;
}

/**
 * Error handling result
 */
export interface CRMErrorHandling {
  shouldRetry: boolean;
  retryAfter?: number;
  fatal: boolean;
  message: string;
}

/**
 * Field mapping configuration
 */
export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transform?: (value: unknown) => unknown;
  required?: boolean;
}

/**
 * CRM sync result
 */
export interface CRMSyncResult {
  success: boolean;
  dealId: string;
  crmDealId?: string;
  crmContactId?: string;
  stage: string;
  syncedAt: Date;
  errors: string[];
  warnings: string[];
}
