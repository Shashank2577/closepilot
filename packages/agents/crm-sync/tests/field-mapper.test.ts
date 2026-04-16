import { mapDealToContact, mapDealToCrmDeal, splitName } from '../src/field-mapper';
import { Deal, DealStage } from '@closepilot/core';

describe('field-mapper', () => {
  describe('splitName', () => {
    test('splits full name correctly', () => {
      expect(splitName('John Doe')).toEqual({ firstName: 'John', lastName: 'Doe' });
      expect(splitName('John')).toEqual({ firstName: 'John', lastName: '' });
      expect(splitName('John von Doe')).toEqual({ firstName: 'John', lastName: 'von Doe' });
      expect(splitName('')).toEqual({ firstName: '', lastName: '' });
    });
  });

  describe('mapDealToContact', () => {
    test('maps basic deal info to contact', () => {
      const deal: Partial<Deal> = {
        leadEmail: 'test@example.com',
        leadName: 'Jane Smith',
        leadCompany: 'Acme Corp',
        leadTitle: 'CEO'
      };

      const contact = mapDealToContact(deal as Deal);

      expect(contact).toEqual({
        email: 'test@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        companyName: 'Acme Corp',
        jobTitle: 'CEO'
      });
    });
  });

  describe('mapDealToCrmDeal', () => {
    test('maps deal info including proposal pricing', () => {
      const deal: Partial<Deal> = {
        leadName: 'Jane Smith',
        leadCompany: 'Acme Corp',
        projectScope: {
          title: 'Web App Build',
          description: 'A large app',
          complexity: 'high',
          services: [],
          deliverables: [],
          assumptions: [],
          risks: []
        },
        proposal: {
          title: 'Prop',
          executiveSummary: '',
          scope: '',
          timeline: '',
          terms: [],
          nextSteps: [],
          pricing: {
            currency: 'USD',
            total: 15000,
            breakdown: []
          }
        }
      };

      const crmDeal = mapDealToCrmDeal(deal as Deal, 'contact-123');

      expect(crmDeal.name).toBe('Acme Corp - Web App Build');
      expect(crmDeal.amount).toBe(15000);
      expect(crmDeal.contactId).toBe('contact-123');
      expect(crmDeal.description).toBe('A large app');
      expect(crmDeal.stage).toBe('Proposal Sent');
    });
  });
});
