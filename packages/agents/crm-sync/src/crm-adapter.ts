export interface CrmContact {
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  jobTitle?: string;
  phone?: string;
  [key: string]: any;
}

export interface CrmDeal {
  id?: string;
  name: string;
  amount?: number;
  stage?: string;
  closeDate?: Date;
  contactId?: string;
  description?: string;
  [key: string]: any;
}

export interface CrmActivity {
  id?: string;
  dealId?: string;
  type: 'note' | 'email' | 'meeting' | 'task';
  subject: string;
  body: string;
  timestamp: Date;
  [key: string]: any;
}

export interface CrmAdapter {
  /**
   * Initialize or authenticate the CRM connection
   */
  connect(): Promise<void>;

  /**
   * Create or update a contact based on email
   */
  upsertContact(contact: CrmContact): Promise<CrmContact>;

  /**
   * Create or update a deal
   */
  upsertDeal(deal: CrmDeal): Promise<CrmDeal>;

  /**
   * Add an activity (note, email, etc) to a deal's timeline
   */
  addActivity(activity: CrmActivity): Promise<CrmActivity>;

  /**
   * Attach a document/file to a deal
   */
  attachDocument(dealId: string, fileName: string, fileContent: Buffer): Promise<void>;
}
