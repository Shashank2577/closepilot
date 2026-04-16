import { Client } from '@hubspot/api-client';
import { CrmAdapter, CrmContact, CrmDeal, CrmActivity } from './crm-adapter';

export class HubSpotAdapter implements CrmAdapter {
  private client: Client;

  constructor(accessToken: string) {
    this.client = new Client({ accessToken });
  }

  async connect(): Promise<void> {
    try {
      await this.client.crm.contacts.basicApi.getPage(1);
    } catch (error) {
      throw new Error(`HubSpot connection failed: ${error}`);
    }
  }

  async upsertContact(contact: CrmContact): Promise<CrmContact> {
    const searchResponse = await this.client.crm.contacts.searchApi.doSearch({
      filterGroups: [{
        filters: [{
          propertyName: 'email',
          operator: 'EQ' as any,
          value: contact.email,
        }]
      }],
      properties: ['email', 'firstname', 'lastname', 'company', 'jobtitle'],
      sorts: [],
      after: '0',
      limit: 1,
    });

    const properties = {
      email: contact.email,
      firstname: contact.firstName || '',
      lastname: contact.lastName || '',
      company: contact.companyName || '',
      jobtitle: contact.jobTitle || '',
      phone: contact.phone || '',
    };

    let hubspotContactId: string;

    if (searchResponse.total > 0) {
      hubspotContactId = searchResponse.results[0].id;
      await this.client.crm.contacts.basicApi.update(hubspotContactId, { properties });
    } else {
      const createResponse = await this.client.crm.contacts.basicApi.create({ properties });
      hubspotContactId = createResponse.id;
    }

    return { ...contact, id: hubspotContactId };
  }

  async upsertDeal(deal: CrmDeal): Promise<CrmDeal> {
    const properties: Record<string, string> = {
      dealname: deal.name,
      amount: deal.amount?.toString() || '0',
      description: deal.description || '',
    };

    if (deal.stage) properties.dealstage = deal.stage;
    if (deal.closeDate) properties.closedate = deal.closeDate.toISOString();

    let hubspotDealId: string;

    if (deal.id) {
      await this.client.crm.deals.basicApi.update(deal.id, { properties });
      hubspotDealId = deal.id;
    } else {
      const createResponse = await this.client.crm.deals.basicApi.create({ properties });
      hubspotDealId = createResponse.id;
    }

    if (deal.contactId) {
      await (this.client.crm.deals as any).associationsApi.create(
        parseInt(hubspotDealId),
        'contacts',
        parseInt(deal.contactId),
        [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }]
      );
    }

    return { ...deal, id: hubspotDealId };
  }

  async addActivity(activity: CrmActivity): Promise<CrmActivity> {
    if (!activity.dealId) {
      throw new Error('Deal ID required to add activity');
    }

    const properties = {
      hs_note_body: `<b>${activity.subject}</b><br/><br/>${activity.body.replace(/\n/g, '<br/>')}`,
      hs_timestamp: activity.timestamp.getTime().toString(),
    };

    const createResponse = await this.client.crm.objects.notes.basicApi.create({ properties });
    const noteId = createResponse.id;

    await (this.client.crm.objects.notes as any).associationsApi.create(
      parseInt(noteId),
      'deals',
      parseInt(activity.dealId),
      [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 214 }]
    );

    return { ...activity, id: noteId };
  }

  async attachDocument(dealId: string, fileName: string, fileContent: Buffer): Promise<void> {
    const fs = require('fs');
    const path = require('path');
    const tmpPath = path.join('/tmp', fileName);
    fs.writeFileSync(tmpPath, fileContent);
    const file = fs.createReadStream(tmpPath);

    // We mock the file upload payload, since @hubspot/api-client requires formData
    const fileData = {
      file: file,
      options: JSON.stringify({
        access: 'PUBLIC_INDEXABLE',
        ttl: 'P3M',
        overwrite: false,
        duplicateValidationStrategy: 'NONE',
        duplicateValidationScope: 'ENTIRE_PORTAL'
      }),
      folderPath: '/proposals'
    };

    try {
      const response = await this.client.files.filesApi.upload(
        fileData.file as any,
        fileData.options,
        fileData.folderPath
      );

      if (response && response.objects && response.objects.length > 0) {
        const fileId = response.objects[0].id;

        // Note to deal association using engagement notes
        const noteProperties = {
          hs_note_body: `Proposal Document Attached: ${fileName}`,
          hs_attachment_ids: fileId
        };
        const createResponse = await this.client.crm.objects.notes.basicApi.create({ properties: noteProperties });

        await (this.client.crm.objects.notes as any).associationsApi.create(
          parseInt(createResponse.id),
          'deals',
          parseInt(dealId),
          [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 214 }]
        );
      }
    } catch (e) {
      console.error('Failed to attach document to HubSpot:', e);
    } finally {
      fs.unlinkSync(tmpPath);
    }
  }
}
