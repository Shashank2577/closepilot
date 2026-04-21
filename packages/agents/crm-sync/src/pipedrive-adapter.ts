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
 * Pipedrive CRM Adapter
 * Implements CRM sync for Pipedrive
 */
export class PipedriveAdapter implements CRMAdapter {
  private client?: any;
  private config?: CRMConfig;
  private retryCount = 0;

  /**
   * Initialize Pipedrive connection
   */
  async initialize(config: CRMConfig): Promise<void> {
    this.config = config;

    if (!config.apiKey) {
      throw new Error('Pipedrive requires apiKey');
    }

    // Dynamic import to avoid requiring pipedrive client if not used
    const pipedrive = (await import('pipedrive')) as any;
    const PipedriveClient = pipedrive.Client || pipedrive.default?.Client;
    if (PipedriveClient) {
      this.client = new PipedriveClient({ apiToken: config.apiKey });
    } else {
      // Fallback: set apiToken on the module's ApiClient instance
      this.client = pipedrive.ApiClient ? new pipedrive.ApiClient() : {};
      if (this.client.authentications) {
        this.client.authentications['api_key'] = { apiKey: config.apiKey };
      }
    }

    // Test connection
    const isConnected = await this.testConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to Pipedrive');
    }
  }

  /**
   * Test connection to Pipedrive
   */
  async testConnection(): Promise<boolean> {
    if (!this.client) return false;

    try {
      await this.client.Persons.getAll({ limit: 1 });
      return true;
    } catch (error) {
      console.error('Pipedrive connection test failed:', error);
      return false;
    }
  }

  /**
   * Sync contact to Pipedrive
   */
  async syncContact(contact: ContactData): Promise<CRMContactResult> {
    if (!this.client) {
      return {
        success: false,
        created: false,
        updated: false,
        error: 'Pipedrive client not initialized',
      };
    }

    try {
      // First, try to find existing person by email
      const existingPerson = await this.findPersonByEmail(contact.email);

      if (existingPerson) {
        // Update existing person
        await this.updatePerson(existingPerson.id, contact);
        return {
          success: true,
          crmContactId: existingPerson.id.toString(),
          created: false,
          updated: true,
        };
      } else {
        // Create new person
        const created = await this.createPerson(contact);
        return {
          success: true,
          crmContactId: created.id.toString(),
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
   * Sync deal to Pipedrive
   */
  async syncDeal(deal: CRMDealData): Promise<CRMDealResult> {
    if (!this.client) {
      return {
        success: false,
        created: false,
        updated: false,
        error: 'Pipedrive client not initialized',
      };
    }

    try {
      const pdDeal = this.mapDealToPipedrive(deal);

      const result = await this.client.Deals.add(pdDeal);

      return {
        success: true,
        crmDealId: result.data.id.toString(),
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
   * Sync activity to Pipedrive
   */
  async syncActivity(activity: CRMActivityData): Promise<CRMActivityResult> {
    if (!this.client) {
      return {
        success: false,
        error: 'Pipedrive client not initialized',
      };
    }

    try {
      const pdActivity = this.mapActivityToPipedrive(activity);

      const result = await this.client.Activities.add(pdActivity);

      return {
        success: true,
        crmActivityId: result.data.id.toString(),
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
      // Upload file to Pipedrive
      const fileData = {
        file: documentData.content,
        fileName: documentData.name,
        dealId: parseInt(dealId),
      };

      await this.client.Files.add(fileData);

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
    if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
      return {
        shouldRetry: false,
        fatal: true,
        message: 'Authentication failed. Check API key.',
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
   * Find person by email
   */
  private async findPersonByEmail(email: string): Promise<{ id: number } | null> {
    if (!this.client) return null;

    try {
      const result = await this.client.Persons.search({
        term: email,
        fields: ['email'],
      });

      if (result.data && result.data.length > 0) {
        return { id: result.data[0].id };
      }

      return null;
    } catch (error) {
      console.error('Error finding person:', error);
      return null;
    }
  }

  /**
   * Create new person
   */
  private async createPerson(contact: ContactData): Promise<{ id: number }> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    const personData = {
      name: `${contact.firstName} ${contact.lastName}`,
      email: [{ value: contact.email, primary: true }],
      phone: [{ value: contact.phone || '', primary: true }],
      org_id: contact.company ? await this.getOrCreateOrganization(contact.company) : undefined,
      title: contact.title || '',
      [contact.leadSource || 'Closepilot']: true,
    };

    const result = await this.client.Persons.add(personData);

    return { id: result.data.id };
  }

  /**
   * Update existing person
   */
  private async updatePerson(personId: number, contact: ContactData): Promise<void> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    const personData = {
      name: `${contact.firstName} ${contact.lastName}`,
      email: [{ value: contact.email, primary: true }],
      phone: [{ value: contact.phone || '', primary: true }],
      title: contact.title || '',
    };

    await this.client.Persons.update(personId, personData);
  }

  /**
   * Get or create organization
   */
  private async getOrCreateOrganization(orgName: string): Promise<number> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      // Search for existing organization
      const result = await this.client.Organizations.search({
        term: orgName,
        exact_match: true,
      });

      if (result.data && result.data.length > 0) {
        return result.data[0].id;
      }

      // Create new organization
      const org = await this.client.Organizations.add({
        name: orgName,
      });

      return org.data.id;
    } catch (error) {
      console.error('Error getting/creating organization:', error);
      throw error;
    }
  }

  /**
   * Map Closepilot deal to Pipedrive deal
   */
  private mapDealToPipedrive(deal: CRMDealData): Record<string, unknown> {
    return {
      title: deal.title,
      value: deal.amount || 0,
      currency: deal.currency || 'USD',
      stage_id: this.getStageId(deal.stage),
      close_date: deal.closeDate || new Date(),
      description: deal.description,
      source: deal.source || 'Closepilot',
      closepilot_deal_id: deal.closepilotDealId,
      probability: deal.probability || 50,
    };
  }

  /**
   * Map Closepilot activity to Pipedrive activity
   */
  private mapActivityToPipedrive(activity: CRMActivityData): Record<string, unknown> {
    return {
      subject: activity.subject,
      note: activity.body,
      due_date: activity.timestamp,
      type: this.mapActivityType(activity.type),
      deal_id: parseInt(activity.dealId),
    };
  }

  /**
   * Map activity type to Pipedrive type
   */
  private mapActivityType(type: string): string {
    const typeMap: Record<string, string> = {
      email: 'email',
      call: 'call',
      meeting: 'meeting',
      note: 'note',
      task: 'task',
    };

    return typeMap[type] || 'note';
  }

  /**
   * Get Pipedrive stage ID from stage name
   * This is a simplified implementation
   */
  private getStageId(stageName: string): number {
    // In a real implementation, you would fetch stages from Pipedrive
    // and cache them. For now, return a default stage ID
    const stageMap: Record<string, number> = {
      qualified: 1,
      proposal: 2,
      negotiation: 3,
      won: 4,
      lost: 5,
    };

    return stageMap[stageName.toLowerCase()] || 1;
  }
}
