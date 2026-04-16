import { HubSpotAdapter } from '../src/hubspot-adapter';

describe('HubSpotAdapter', () => {
  let adapter: HubSpotAdapter;

  beforeEach(() => {
    adapter = new HubSpotAdapter('mock-token');

    // Mock the inner client instance methods
    (adapter as any).client = {
      crm: {
        contacts: {
          basicApi: {
            getPage: jest.fn().mockResolvedValue({}),
            create: jest.fn().mockResolvedValue({ id: 'contact-123' }),
            update: jest.fn().mockResolvedValue({ id: 'contact-123' }),
          },
          searchApi: {
            doSearch: jest.fn().mockResolvedValue({ total: 0, results: [] })
          }
        },
        deals: {
          basicApi: {
            create: jest.fn().mockResolvedValue({ id: 'deal-456' }),
            update: jest.fn().mockResolvedValue({ id: 'deal-456' }),
          },
          associationsApi: {
            create: jest.fn().mockResolvedValue({})
          }
        },
        objects: {
          notes: {
            basicApi: {
              create: jest.fn().mockResolvedValue({ id: 'note-789' })
            },
            associationsApi: {
              create: jest.fn().mockResolvedValue({})
            }
          }
        }
      }
    };
  });

  test('connect calls basicApi getPage', async () => {
    await adapter.connect();
    expect((adapter as any).client.crm.contacts.basicApi.getPage).toHaveBeenCalledWith(1);
  });

  test('upsertContact creates a new contact when not found', async () => {
    const contact = { email: 'test@example.com', firstName: 'Test', lastName: 'User' };
    const result = await adapter.upsertContact(contact);

    expect(result.id).toBe('contact-123');
    expect((adapter as any).client.crm.contacts.basicApi.create).toHaveBeenCalled();
  });

  test('upsertContact updates an existing contact when found', async () => {
    (adapter as any).client.crm.contacts.searchApi.doSearch.mockResolvedValue({
      total: 1,
      results: [{ id: 'contact-999' }]
    });

    const contact = { email: 'test@example.com' };
    const result = await adapter.upsertContact(contact);

    expect(result.id).toBe('contact-999');
    expect((adapter as any).client.crm.contacts.basicApi.update).toHaveBeenCalledWith('contact-999', expect.any(Object));
  });

  test('upsertDeal creates a new deal and associates it with contact', async () => {
    const deal = { name: 'Test Deal', contactId: 'contact-123' };
    const result = await adapter.upsertDeal(deal);

    expect(result.id).toBe('deal-456');
    expect((adapter as any).client.crm.deals.basicApi.create).toHaveBeenCalled();
    expect((adapter as any).client.crm.deals.associationsApi.create).toHaveBeenCalled();
  });

  test('addActivity creates a note and associates it with a deal', async () => {
    const activity = { type: 'note' as const, subject: 'Test', body: 'Body', timestamp: new Date(), dealId: 'deal-456' };
    const result = await adapter.addActivity(activity);

    expect(result.id).toBe('note-789');
    expect((adapter as any).client.crm.objects.notes.basicApi.create).toHaveBeenCalled();
    expect((adapter as any).client.crm.objects.notes.associationsApi.create).toHaveBeenCalled();
  });
});
