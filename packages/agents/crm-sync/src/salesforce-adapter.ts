import { Connection, SaveResult } from 'jsforce';
import { CrmAdapter, CrmContact, CrmDeal, CrmActivity } from './crm-adapter';

export class SalesforceAdapter implements CrmAdapter {
  private conn: Connection;

  constructor(loginUrl: string, accessToken: string) {
    this.conn = new Connection({
      instanceUrl: loginUrl,
      accessToken,
    });
  }

  async connect(): Promise<void> {
    try {
      await this.conn.identity();
    } catch (error) {
      throw new Error(`Salesforce connection failed: ${error}`);
    }
  }

  async upsertContact(contact: CrmContact): Promise<CrmContact> {
    const result = await this.conn.sobject('Contact').find({ Email: contact.email }, 'Id').limit(1).execute();

    const record = {
      Email: contact.email,
      FirstName: contact.firstName,
      LastName: contact.lastName || 'Unknown',
      Title: contact.jobTitle,
      Phone: contact.phone,
    };

    let contactId: string;

    if (result.length > 0) {
      contactId = result[0].Id;
      await this.conn.sobject('Contact').update({ Id: contactId, ...record });
    } else {
      const createResult = await this.conn.sobject('Contact').create(record) as any;
      if (!createResult.success) throw new Error('Failed to create Salesforce Contact');
      contactId = createResult.id;
    }

    return { ...contact, id: contactId };
  }

  async upsertDeal(deal: CrmDeal): Promise<CrmDeal> {
    const record: any = {
      Name: deal.name,
      Amount: deal.amount,
      StageName: deal.stage || 'Prospecting',
      CloseDate: deal.closeDate ? deal.closeDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      Description: deal.description,
    };

    let opportunityId: string;

    if (deal.id) {
      await this.conn.sobject('Opportunity').update({ Id: deal.id, ...record });
      opportunityId = deal.id;
    } else {
      const createResult = await this.conn.sobject('Opportunity').create(record) as any;
      if (!createResult.success) throw new Error('Failed to create Salesforce Opportunity');
      opportunityId = createResult.id;
    }

    if (deal.contactId) {
      const roleResult = await this.conn.sobject('OpportunityContactRole')
        .find({ OpportunityId: opportunityId, ContactId: deal.contactId })
        .limit(1)
        .execute();

      if (roleResult.length === 0) {
        await this.conn.sobject('OpportunityContactRole').create({
          OpportunityId: opportunityId,
          ContactId: deal.contactId,
          IsPrimary: true,
          Role: 'Decision Maker',
        });
      }
    }

    return { ...deal, id: opportunityId };
  }

  async addActivity(activity: CrmActivity): Promise<CrmActivity> {
    if (!activity.dealId) {
      throw new Error('Deal ID required to add activity');
    }

    const record = {
      WhatId: activity.dealId,
      Subject: activity.subject,
      Description: activity.body,
      Status: 'Completed',
      ActivityDate: activity.timestamp.toISOString().split('T')[0],
      TaskSubtype: 'Task',
    };

    const result = await this.conn.sobject('Task').create(record) as any;
    if (!result.success) throw new Error('Failed to create Salesforce Task');

    return { ...activity, id: result.id };
  }

  async attachDocument(dealId: string, fileName: string, fileContent: Buffer): Promise<void> {
    const record = {
      Title: fileName,
      PathOnClient: fileName,
      VersionData: fileContent.toString('base64'),
      FirstPublishLocationId: dealId,
    };

    const result = await this.conn.sobject('ContentVersion').create(record) as any;
    if (!result.success) throw new Error('Failed to attach document to Salesforce');
  }
}
