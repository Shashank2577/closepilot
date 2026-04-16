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
 * Salesforce CRM Adapter
 * Implements CRM sync for Salesforce
 */
export class SalesforceAdapter implements CRMAdapter {
  private connection?: any;
  private config?: CRMConfig;
  private retryCount = 0;

  /**
   * Initialize Salesforce connection
   */
  async initialize(config: CRMConfig): Promise<void> {
    this.config = config;

    if (!config.oauthToken) {
      throw new Error('Salesforce requires oauthToken');
    }

    // Dynamic import to avoid requiring jsforce if not used
    const jsforce = await import('jsforce');
    this.connection = new jsforce.Connection({
      accessToken: config.oauthToken,
    });

    // Test connection
    const isConnected = await this.testConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to Salesforce');
    }
  }

  /**
   * Test connection to Salesforce
   */
  async testConnection(): Promise<boolean> {
    if (!this.connection) return false;

    try {
      await this.connection.query('SELECT Id FROM Contact LIMIT 1');
      return true;
    } catch (error) {
      console.error('Salesforce connection test failed:', error);
      return false;
    }
  }

  /**
   * Sync contact to Salesforce
   */
  async syncContact(contact: ContactData): Promise<CRMContactResult> {
    if (!this.connection) {
      return {
        success: false,
        created: false,
        updated: false,
        error: 'Salesforce connection not initialized',
      };
    }

    try {
      // First, try to find existing contact by email
      const existingContact = await this.findContactByEmail(contact.email);

      if (existingContact) {
        // Update existing contact
        await this.updateContact(existingContact.Id, contact);
        return {
          success: true,
          crmContactId: existingContact.Id,
          created: false,
          updated: true,
        };
      } else {
        // Create new contact
        const created = await this.createContact(contact);
        return {
          success: true,
          crmContactId: created.Id,
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
   * Sync deal to Salesforce
   */
  async syncDeal(deal: CRMDealData): Promise<CRMDealResult> {
    if (!this.connection) {
      return {
        success: false,
        created: false,
        updated: false,
        error: 'Salesforce connection not initialized',
      };
    }

    try {
      const sfDeal = this.mapDealToSalesforce(deal);

      const result = await this.connection.sobject('Opportunity').create(sfDeal);

      return {
        success: true,
        crmDealId: result.id,
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
   * Sync activity to Salesforce
   */
  async syncActivity(activity: CRMActivityData): Promise<CRMActivityResult> {
    if (!this.connection) {
      return {
        success: false,
        error: 'Salesforce connection not initialized',
      };
    }

    try {
      const task = this.mapActivityToSalesforce(activity);

      const result = await this.connection.sobject('Task').create(task);

      return {
        success: true,
        crmActivityId: result.id,
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
    if (!this.connection) {
      return false;
    }

    try {
      // Upload document to Salesforce Content
      // This is a simplified implementation
      const contentVersion = {
        VersionData: documentData.content,
        Title: documentData.name,
        PathOnClient: documentData.name,
      };

      const result = await this.connection.sobject('ContentVersion').create(contentVersion);

      // Associate content with opportunity
      if (result.id) {
        await this.connection.sobject('ContentDocumentLink').create({
          ContentDocumentId: result.id,
          LinkedEntityId: dealId,
          ShareType: 'V',
        });
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
    if (errorMessage.includes('REQUEST_LIMIT_EXCEEDED')) {
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
    if (errorMessage.includes('INVALID_SESSION_ID')) {
      return {
        shouldRetry: false,
        fatal: true,
        message: 'Authentication failed. Check OAuth token.',
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
  private async findContactByEmail(email: string): Promise<{ Id: string } | null> {
    if (!this.connection) return null;

    try {
      const result = await this.connection.query(
        `SELECT Id FROM Contact WHERE Email = '${email}' LIMIT 1`
      );

      if (result.records && result.records.length > 0) {
        return { Id: result.records[0].Id };
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
  private async createContact(contact: ContactData): Promise<{ Id: string }> {
    if (!this.connection) {
      throw new Error('Connection not initialized');
    }

    const contactData = {
      FirstName: contact.firstName,
      LastName: contact.lastName,
      Email: contact.email,
      Company: contact.company || '',
      Title: contact.title || '',
      Phone: contact.phone || '',
      LeadSource: contact.leadSource || 'Closepilot',
    };

    const result = await this.connection.sobject('Contact').create(contactData);

    return { Id: result.id };
  }

  /**
   * Update existing contact
   */
  private async updateContact(contactId: string, contact: ContactData): Promise<void> {
    if (!this.connection) {
      throw new Error('Connection not initialized');
    }

    const contactData = {
      FirstName: contact.firstName,
      LastName: contact.lastName,
      Email: contact.email,
      Company: contact.company || '',
      Title: contact.title || '',
      Phone: contact.phone || '',
    };

    await this.connection.sobject('Contact').update(contactId, contactData);
  }

  /**
   * Map Closepilot deal to Salesforce Opportunity
   */
  private mapDealToSalesforce(deal: CRMDealData): Record<string, unknown> {
    return {
      Name: deal.title,
      Amount: deal.amount || 0,
      CurrencyIsoCode: deal.currency || 'USD',
      StageName: deal.stage,
      CloseDate: deal.closeDate || new Date(),
      Description: deal.description,
      LeadSource: deal.source || 'Closepilot',
      Closepilot_Deal_ID__c: deal.closepilotDealId,
      Probability: deal.probability || 50,
    };
  }

  /**
   * Map Closepilot activity to Salesforce Task
   */
  private mapActivityToSalesforce(activity: CRMActivityData): Record<string, unknown> {
    return {
      Subject: activity.subject,
      Description: activity.body,
      ActivityDate: activity.timestamp,
      Type: this.mapActivityType(activity.type),
      Status: 'Completed',
    };
  }

  /**
   * Map activity type to Salesforce type
   */
  private mapActivityType(type: string): string {
    const typeMap: Record<string, string> = {
      email: 'Email',
      call: 'Call',
      meeting: 'Meeting',
      note: 'Other',
      task: 'Task',
    };

    return typeMap[type] || 'Other';
  }
}
