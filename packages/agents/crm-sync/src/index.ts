import { AgentInput, AgentOutput, AgentType, DealStage, CrmSyncContext } from '@closepilot/core';
import { CrmAdapter } from './crm-adapter';
import { HubSpotAdapter } from './hubspot-adapter';
import { SalesforceAdapter } from './salesforce-adapter';
import { PipedriveAdapter } from './pipedrive-adapter';
import { mapDealToContact, mapDealToCrmDeal } from './field-mapper';
import { extractActivities } from './activity-sync';

// Mock sleep function for exponential backoff
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function getAdapter(context: CrmSyncContext): CrmAdapter {
  switch (context.crmSystem) {
    case 'hubspot':
      return new HubSpotAdapter(process.env.HUBSPOT_ACCESS_TOKEN || 'mock-token');
    case 'salesforce':
      return new SalesforceAdapter(
        process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com',
        process.env.SALESFORCE_ACCESS_TOKEN || 'mock-token'
      );
    case 'pipedrive':
      return new PipedriveAdapter(process.env.PIPEDRIVE_API_TOKEN || 'mock-token');
    default:
      throw new Error(`Unsupported CRM system: ${context.crmSystem}`);
  }
}

export async function processDeal(input: AgentInput<CrmSyncContext>): Promise<AgentOutput> {
  const startTime = new Date();
  const { deal, context } = input;

  const output: AgentOutput = {
    dealId: deal.id,
    success: false,
    requiresApproval: false,
    metadata: {
      agentType: AgentType.CRM_SYNC,
      executionId: input.metadata?.executionId || `exec-${Date.now()}`,
      startedAt: startTime,
    }
  };

  if (deal.approvalStatus !== 'approved') {
    output.errors = ['Cannot sync deal to CRM: Proposal is not approved.'];
    output.nextStage = DealStage.FAILED;
    return output;
  }

  if (!deal.proposal) {
    output.errors = ['Cannot sync deal to CRM: No proposal found.'];
    output.nextStage = DealStage.FAILED;
    return output;
  }

  const adapter = getAdapter(context);

  const MAX_RETRIES = 3;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      attempt++;
      console.log(`[CRM Sync] Attempt ${attempt} to sync deal ${deal.id} to ${context.crmSystem}`);

      // 1. Connect
      await adapter.connect();

      let contactId: string | undefined;

      // 2. Create/Update Contact
      if (context.createContact !== false) {
        const mappedContact = mapDealToContact(deal);
        const contact = await adapter.upsertContact(mappedContact);
        contactId = contact.id;
        console.log(`[CRM Sync] Contact upserted: ${contactId}`);
      }

      let crmDealId: string | undefined;

      // 3. Create/Update Deal
      if (context.createDeal !== false) {
        const mappedDeal = mapDealToCrmDeal(deal, contactId);
        const crmDeal = await adapter.upsertDeal(mappedDeal);
        crmDealId = crmDeal.id;
        console.log(`[CRM Sync] Deal upserted: ${crmDealId}`);

        deal.crmId = crmDealId;
        deal.crmSyncedAt = new Date();
      }

      // 4. Sync Activities
      if (crmDealId) {
        const activities = extractActivities(deal, crmDealId);
        for (const activity of activities) {
          await adapter.addActivity(activity);
        }
        console.log(`[CRM Sync] Synced ${activities.length} activities`);

        // 5. Attach Proposal Document (Mocking file content for now)
        if (deal.proposalDocumentId) {
           await adapter.attachDocument(
             crmDealId,
             `Proposal_${deal.leadCompany || deal.leadName}.pdf`,
             Buffer.from('Mock PDF Content')
           );
           console.log(`[CRM Sync] Attached proposal document`);
        }
      }

      output.success = true;
      output.nextStage = DealStage.COMPLETED;
      break; // Success, exit retry loop

    } catch (error: any) {
      console.error(`[CRM Sync] Attempt ${attempt} failed:`, error.message);

      if (attempt >= MAX_RETRIES) {
        output.errors = [`Sync failed after ${MAX_RETRIES} attempts. Last error: ${error.message}`];
        output.nextStage = DealStage.FAILED;
        break;
      }

      // Exponential backoff: 2^attempt * 1000ms (e.g., 2s, 4s, 8s)
      const backoffDelay = Math.pow(2, attempt) * 1000;
      console.log(`[CRM Sync] Waiting ${backoffDelay}ms before retry...`);
      await sleep(backoffDelay);
    }
  }

  if (output.metadata) {
    output.metadata.completedAt = new Date();
    output.metadata.duration = output.metadata.completedAt.getTime() - output.metadata.startedAt.getTime();
  }

  return output;
}
