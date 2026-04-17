import { DealStage } from '@closepilot/core';
import type { Deal, AgentType, CrmSyncContext } from '@closepilot/core';
import { DealStoreTools } from '@closepilot/mcp-client';
import { HubSpotAdapter } from './hubspot-adapter.js';
import { SalesforceAdapter } from './salesforce-adapter.js';
import { PipedriveAdapter } from './pipedrive-adapter.js';
import type { CRMAdapter, CRMConfig, CRMSyncResult } from './crm-adapter.js';
import { FieldMapper } from './field-mapper.js';
import { ActivitySync } from './activity-sync.js';

/**
 * CRM Sync Agent
 * Syncs deals with CRM systems (HubSpot, Salesforce, Pipedrive)
 */
export class CRMSyncAgent {
  private dealStoreTools: DealStoreTools;
  private fieldMapper: FieldMapper;

  constructor(apiKey: string, dealStoreTools: DealStoreTools) {
    this.dealStoreTools = dealStoreTools;
    this.fieldMapper = new FieldMapper();
  }

  /**
   * Process a deal through CRM sync
   */
  async processDeal(dealId: string, context: CrmSyncContext): Promise<CRMSyncResult> {
    const startTime = new Date();

    try {
      // Get deal from store
      const deal = await this.dealStoreTools.getDeal(dealId);
      if (!deal) {
        throw new Error(`Deal ${dealId} not found`);
      }

      // Validate deal stage
      if (deal.stage !== DealStage.CRM_SYNC) {
        throw new Error(`Deal is in ${deal.stage} stage, expected crm_sync`);
      }

      // Check if proposal exists and is approved
      if (!deal.proposal) {
        throw new Error('Deal does not have a proposal');
      }

      if (deal.approvalStatus !== 'approved') {
        throw new Error('Deal proposal has not been approved');
      }

      // Initialize CRM adapter
      const crmAdapter = await this.initializeCRMAdapter(context);

      // Sync to CRM
      const result = await this.syncToCRM(deal, crmAdapter, context);

      // Update deal with CRM IDs
      await this.dealStoreTools.updateDeal(dealId, {
        crmId: result.crmDealId,
        crmSyncedAt: result.syncedAt,
        stage: DealStage.COMPLETED,
      });

      return result;
    } catch (error) {
      // Handle error and update deal stage to failed if necessary
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.dealStoreTools.updateDeal(dealId, {
        stage: DealStage.FAILED,
      });

      return {
        success: false,
        dealId,
        syncedAt: startTime,
        stage: DealStage.FAILED,
        errors: [errorMessage],
        warnings: [],
      };
    }
  }

  /**
   * Initialize CRM adapter based on context
   */
  private async initializeCRMAdapter(context: CrmSyncContext): Promise<CRMAdapter> {
    const config: CRMConfig = {
      type: context.crmSystem,
      apiKey: process.env[`${context.crmSystem.toUpperCase()}_API_KEY`],
      oauthToken: process.env[`${context.crmSystem.toUpperCase()}_OAUTH_TOKEN`],
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
      retryConfig: {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2,
      },
    };

    let adapter: CRMAdapter;

    switch (context.crmSystem) {
      case 'hubspot':
        adapter = new HubSpotAdapter();
        break;
      case 'salesforce':
        adapter = new SalesforceAdapter();
        break;
      case 'pipedrive':
        adapter = new PipedriveAdapter();
        break;
      default:
        throw new Error(`Unsupported CRM system: ${context.crmSystem}`);
    }

    await adapter.initialize(config);

    return adapter;
  }

  /**
   * Sync deal to CRM
   */
  private async syncToCRM(
    deal: Deal,
    crmAdapter: CRMAdapter,
    context: CrmSyncContext
  ): Promise<CRMSyncResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let crmContactId: string | undefined;
    let crmDealId: string | undefined;

    try {
      // Step 1: Sync contact
      if (context.createContact) {
        const contactData = this.fieldMapper.mapToContact(deal);
        const contactResult = await crmAdapter.syncContact(contactData);

        if (!contactResult.success) {
          errors.push(`Failed to sync contact: ${contactResult.error}`);
          return this.createFailureResult(deal.id, errors, warnings);
        }

        crmContactId = contactResult.crmContactId;
      }

      // Step 2: Sync deal
      if (context.createDeal) {
        const crmStage = this.fieldMapper.getCRMStage(deal, context.crmSystem);
        const dealData = this.fieldMapper.mapToDeal(deal, crmStage);

        if (crmContactId) {
          dealData.contactId = crmContactId;
        }

        const dealResult = await crmAdapter.syncDeal(dealData);

        if (!dealResult.success) {
          errors.push(`Failed to sync deal: ${dealResult.error}`);
          return this.createFailureResult(deal.id, errors, warnings);
        }

        crmDealId = dealResult.crmDealId;
      }

      // Step 3: Sync activities
      if (crmDealId) {
        try {
          const activitySync = new ActivitySync(crmAdapter, this.fieldMapper);
          await activitySync.syncDealActivities(deal, crmDealId);
        } catch (error) {
          const activityError = error instanceof Error ? error.message : 'Unknown error';
          warnings.push(`Failed to sync some activities: ${activityError}`);
        }
      }

      // Step 4: Attach proposal document
      if (crmDealId && deal.proposalDocumentId) {
        try {
          // This would use Drive tools to get the document
          // For now, we'll add a warning
          warnings.push('Proposal document attachment not yet implemented');
        } catch (error) {
          const docError = error instanceof Error ? error.message : 'Unknown error';
          warnings.push(`Failed to attach proposal: ${docError}`);
        }
      }

      return {
        success: true,
        dealId: deal.id,
        crmDealId,
        crmContactId,
        stage: DealStage.COMPLETED,
        syncedAt: new Date(),
        errors,
        warnings,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);
      return this.createFailureResult(deal.id, errors, warnings);
    }
  }

  /**
   * Create failure result
   */
  private createFailureResult(
    dealId: string,
    errors: string[],
    warnings: string[]
  ): CRMSyncResult {
    return {
      success: false,
      dealId,
      syncedAt: new Date(),
      stage: 'failed',
      errors,
      warnings,
    };
  }

  /**
   * Query deals pending CRM sync
   */
  async getPendingDeals(): Promise<Deal[]> {
    return await this.dealStoreTools.queryDealsByStage(DealStage.CRM_SYNC);
  }

  /**
   * Batch process multiple deals
   */
  async batchProcessDeals(
    dealIds: string[],
    context: CrmSyncContext
  ): Promise<CRMSyncResult[]> {
    const results: CRMSyncResult[] = [];

    for (const dealId of dealIds) {
      const result = await this.processDeal(dealId, context);
      results.push(result);
    }

    return results;
  }
}

/**
 * Factory function to create a CRM Sync Agent
 */
export function createCRMSyncAgent(apiKey: string, dealStoreTools: DealStoreTools): CRMSyncAgent {
  return new CRMSyncAgent(apiKey, dealStoreTools);
}

// Re-export types
export * from './crm-adapter.js';
export * from './hubspot-adapter.js';
export * from './salesforce-adapter.js';
export * from './pipedrive-adapter.js';
export * from './field-mapper.js';
export * from './activity-sync.js';
