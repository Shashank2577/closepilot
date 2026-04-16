import * as pipedrive from 'pipedrive';
import { CrmAdapter, CrmContact, CrmDeal, CrmActivity } from './crm-adapter';

// Use any to bypass strict type checking for the older pipedrive SDK version
export class PipedriveAdapter implements CrmAdapter {
  private client: any;

  constructor(apiToken: string) {
    this.client = new (pipedrive as any).ApiClient();
    const apiTokenAuth = this.client.authentications.api_key;
    apiTokenAuth.apiKey = apiToken;
  }

  async connect(): Promise<void> {
    try {
      const api = new (pipedrive as any).PersonsApi(this.client);
      await api.getPersons();
    } catch (error) {
      throw new Error(`Pipedrive connection failed: ${error}`);
    }
  }

  async upsertContact(contact: CrmContact): Promise<CrmContact> {
    const api = new (pipedrive as any).PersonsApi(this.client);
    const searchResponse = await api.searchPersons(contact.email, { exact_match: true });
    const items = searchResponse.data?.items || [];

    let personId: number;
    const name = `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || contact.email;

    if (items.length > 0) {
      personId = items[0].item.id;
      await api.updatePerson(personId, {
        name,
        email: [{ value: contact.email, primary: true }],
        phone: contact.phone ? [{ value: contact.phone, primary: true }] : undefined,
      });
    } else {
      const createResponse = await api.addPerson({
        name,
        email: [{ value: contact.email, primary: true }],
        phone: contact.phone ? [{ value: contact.phone, primary: true }] : undefined,
      });
      personId = createResponse.data.id;
    }

    return { ...contact, id: personId.toString() };
  }

  async upsertDeal(deal: CrmDeal): Promise<CrmDeal> {
    const api = new (pipedrive as any).DealsApi(this.client);
    let dealId: number;

    const dealData: any = {
      title: deal.name,
      value: deal.amount || 0,
    };

    if (deal.contactId) {
      dealData.person_id = parseInt(deal.contactId);
    }
    if (deal.closeDate) {
      dealData.expected_close_date = deal.closeDate.toISOString().split('T')[0];
    }

    if (deal.id) {
      dealId = parseInt(deal.id);
      await api.updateDeal(dealId, dealData);
    } else {
      const createResponse = await api.addDeal(dealData);
      dealId = createResponse.data.id;
    }

    return { ...deal, id: dealId.toString() };
  }

  async addActivity(activity: CrmActivity): Promise<CrmActivity> {
    const api = new (pipedrive as any).NotesApi(this.client);
    if (!activity.dealId) {
      throw new Error('Deal ID required to add activity');
    }

    const noteContent = `<b>${activity.subject}</b><br/><br/>${activity.body.replace(/\n/g, '<br/>')}`;

    const createResponse = await api.addNote({
      content: noteContent,
      deal_id: parseInt(activity.dealId),
      add_time: activity.timestamp.toISOString(),
    });

    return { ...activity, id: createResponse.data.id.toString() };
  }

  async attachDocument(dealId: string, fileName: string, fileContent: Buffer): Promise<void> {
    const fs = require('fs');
    const path = require('path');
    const tmpPath = path.join('/tmp', fileName);
    fs.writeFileSync(tmpPath, fileContent);
    const file = fs.createReadStream(tmpPath);

    const api = new (pipedrive as any).FilesApi(this.client);

    await api.addFile({
      file: file,
      deal_id: parseInt(dealId)
    });

    fs.unlinkSync(tmpPath);
  }
}
