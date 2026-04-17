import { Client as HubSpotClient } from '@hubspot/api-client';
import type {
  CRMAdapter,
  CRMConfig,
  ContactData,
  CRMDealData,
  CRMActivityData,
  DocumentData,
  CRMContactResult,
  CRMDealResult,
  CRMActivityResult,
  CRMErrorHandling,
} from './crm-adapter.js';

/**
 * HubSpot CRM Adapter
 * Implements CRM sync for HubSpot
 */
export class HubSpotAdapter implements CRMAdapter {
  private client?: HubSpotClient;
  private config?: CRMConfig;
  private retryCount = 0;

  /**
   * Initialize HubSpot connection
   */
  async initialize(config: CRMConfig): Promise<void> {
    this.config = config;

    if (!config.apiKey && !config.oauthToken) {
      throw new Error('HubSpot requires either apiKey or oauthToken');
    }

    this.client = new HubSpotClient({
      apiKey: config.apiKey,
      accessToken: config.oauthToken,
    });

    // Test connection
    const isConnected = await this.testConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to HubSpot');
    }
  }

  /**
   * Test connection to HubSpot
   */
  async testConnection(): Promise<boolean> {
    if (!this.client) return false;

    try {
      // Simple API call to test connection
      await (this.client as any).crm.contacts.basicApi.getPage(1);
      return true;
    } catch (error) {
      console.error('HubSpot connection test failed:', error);
      return false;
    }
  }

  /**
   * Sync contact to HubSpot
   */
  async syncContact(contact: ContactData): Promise<CRMContactResult> {
    if (!this.client) {
      return {
        success: false,
        created: false,
        updated: false,
        error: 'HubSpot client not initialized',
      };
    }

    try {
      // First, try to find existing contact by email
      const existingContact = await this.findContactByEmail(contact.email);

      if (existingContact) {
        // Update existing contact
        const updated = await this.updateContact(existingContact.id, contact);
        return {
          success: true,
          crmContactId: existingContact.id,
          created: false,
          updated: true,
        };
      } else {
        // Create new contact
        const created = await this.createContact(contact);
        return {
          success: true,
          crmContactId: created.id,
          created: true,
          updated: false,
        };
      }
    } catch (error) {
      const handling = await this.handleError(
        error as Error,
        'syncContact'
      );
      return {
        success: false,
        created: false,
        updated: false,
        error: handling.message,
      };
    }
  }

  /**
   * Sync deal to HubSpot
   */
  async syncDeal(deal: CRMDealData): Promise<CRMDealResult> {
    if (!this.client) {
      return {
        success: false,
        created: false,
        updated: false,
        error: 'HubSpot client not initialized',
      };
    }

    try {
      // Map Closepilot deal to HubSpot deal format
      const hubSpotDeal = this.mapDealToHubSpot(deal);

      // Create deal
      const response = await (this.client as any).crm.deals.basicApi.create({
        properties: hubSpotDeal,
      });

      const dealId = response.id;

      // Associate deal with contact if contactId provided
      if (deal.contactId && dealId) {
        await this.associateDealWithContact(dealId, deal.contactId);
      }

      return {
        success: true,
        crmDealId: dealId,
        created: true,
        updated: false,
      };
    } catch (error) {
      const handling = await this.handleError(
        error as Error,
        'syncDeal'
      );
      return {
        success: false,
        created: false,
        updated: false,
        error: handling.message,
      };
    }
  }

  /**
   * Sync activity to HubSpot
   */
  async syncActivity(activity: CRMActivityData): Promise<CRMActivityResult> {
    if (!this.client) {
      return {
        success: false,
        error: 'HubSpot client not initialized',
      };
    }

    try {
      // Map to HubSpot engagement
      const engagement = this.mapActivityToHubSpot(activity);

      const response = await (this.client as any).crm.objects.communications.basicApi.create({
        properties: engagement,
      });

      // Associate engagement with deal
      if (activity.dealId && response.id) {
        await (this.client as any).crm.objects.communications.associationsApi.create(
          response.id,
          activity.dealId,
          'deal_to_communication'
        );
      }

      return {
        success: true,
        crmActivityId: response.id,
      };
    } catch (error) {
      const handling = await this.handleError(
        error as Error,
        'syncActivity'
      );
      return {
        success: false,
        error: handling.message,
      };
    }
  }

  /**
   * Attach document to deal
   */
  async attachDocument(dealId: string, documentData: DocumentData): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      // Create file in HubSpot
      const fileResponse = await (this.client as any).crm.files.filesApi.upload({
        file: documentData.content,
        fileName: documentData.name,
        options: {
          access: 'PRIVATE',
        },
      });

      // Associate file with deal
      if (fileResponse.id) {
        await (this.client as any).crm.files.associationsApi.create(
          fileResponse.id,
          dealId,
          'deal_to_file'
        );
      }

      return true;
    } catch (error) {
      await this.handleError(error as Error, 'attachDocument');
      return false;
    }
  }

  /**
   * Handle errors with retry logic
   */
  async handleError(error: Error, context: string): Promise<CRMErrorHandling> {
    const errorMessage = error.message || 'Unknown error';

    // Check for rate limiting
    if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
      if (this.retryCount < (this.config?.retryConfig.maxRetries || 3)) {
        this.retryCount++;
        const delay = Math.min(
          (this.config?.retryConfig.initialDelay || 1000) *
            Math.pow(this.config?.retryConfig.backoffMultiplier || 2, this.retryCount),
          this.config?.retryConfig.maxDelay || 30000
        );

        return {
          shouldRetry: true,
          retryAfter: delay,
          fatal: false,
          message: `Rate limited. Retrying after ${delay}ms`,
        };
      }
    }

    // Reset retry count
    this.retryCount = 0;

    // Check for fatal errors
    if (errorMessage.includes('401') || errorMessage.includes('authentication')) {
      return {
        shouldRetry: false,
        fatal: true,
        message: 'Authentication failed. Check API credentials.',
      };
    }

    if (errorMessage.includes('404')) {
      return {
        shouldRetry: false,
        fatal: false,
        message: 'Resource not found in HubSpot',
      };
    }

    // Default error handling
    return {
      shouldRetry: false,
      fatal: false,
      message: `Error in ${context}: ${errorMessage}`,
    };
  }

  /**
   * Find contact by email
   */
  private async findContactByEmail(email: string): Promise<{ id: string } | null> {
    if (!this.client) return null;

    try {
      const response = await (this.client as any).crm.contacts.searchApi.doSearch({
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'email',
                operator: 'EQ',
                value: email,
              },
            ],
          },
        ],
      });

      if (response.results && response.results.length > 0) {
        return { id: response.results[0].id };
      }

      return null;
    } catch (error) {
      console.error('Error finding contact:', error);
      return null;
    }
  }

  /**
   * Create new contact
   */
  private async createContact(contact: ContactData): Promise<{ id: string }> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    const properties = {
      email: contact.email,
      firstname: contact.firstName,
      lastname: contact.lastName,
      company: contact.company || '',
      jobtitle: contact.title || '',
      phone: contact.phone || '',
      lead_source: contact.leadSource || 'Closepilot',
    };

    const response = await (this.client as any).crm.contacts.basicApi.create({
      properties,
    });

    return { id: response.id };
  }

  /**
   * Update existing contact
   */
  private async updateContact(contactId: string, contact: ContactData): Promise<void> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    const properties = {
      email: contact.email,
      firstname: contact.firstName,
      lastname: contact.lastName,
      company: contact.company || '',
      jobtitle: contact.title || '',
      phone: contact.phone || '',
    };

    await (this.client as any).crm.contacts.basicApi.update(contactId, {
      properties,
    });
  }

  /**
   * Associate deal with contact
   */
  private async associateDealWithContact(dealId: string, contactId: string): Promise<void> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    await (this.client as any).crm.deals.associationsApi.create(
      dealId,
      contactId,
      'deal_to_contact'
    );
  }

  /**
   * Map Closepilot deal to HubSpot deal format
   */
  private mapDealToHubSpot(deal: CRMDealData): Record<string, string> {
    return {
      dealname: deal.title,
      amount: deal.amount?.toString() || '0',
      currency: deal.currency || 'USD',
      dealstage: deal.stage,
      closedate: deal.closeDate ? new Date(deal.closeDate).getTime().toString() : '',
      description: deal.description || '',
      source: deal.source || 'Closepilot',
      closepilot_deal_id: deal.closepilotDealId,
    };
  }

  /**
   * Map Closepilot activity to HubSpot engagement
   */
  private mapActivityToHubSpot(activity: CRMActivityData): Record<string, string> {
    return {
      hs_communication_channel_type: this.mapActivityType(activity.type),
      hs_communication_body: activity.body || '',
      hs_timestamp: new Date(activity.timestamp).getTime().toString(),
      hs_communication_subject: activity.subject,
    };
  }

  /**
   * Map activity type to HubSpot channel type
   */
  private mapActivityType(type: string): string {
    const typeMap: Record<string, string> = {
      email: 'EMAIL',
      call: 'CALL',
      meeting: 'MEETING',
      note: 'NOTE',
      task: 'TASK',
    };

    return typeMap[type] || 'EMAIL';
  }
}
