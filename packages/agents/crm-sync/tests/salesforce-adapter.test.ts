import { SalesforceAdapter } from '../src/salesforce-adapter';

describe('SalesforceAdapter', () => {
  let adapter: SalesforceAdapter;

  beforeEach(() => {
    adapter = new SalesforceAdapter('mock-url', 'mock-token');

    // Mock JSForce Connection
    const mockQueryExecute = jest.fn().mockResolvedValue([]);
    const mockQuery = {
      limit: jest.fn().mockReturnValue({ execute: mockQueryExecute })
    };

    (adapter as any).conn = {
      identity: jest.fn().mockResolvedValue({}),
      sobject: jest.fn().mockImplementation((objectType: string) => {
        return {
          find: jest.fn().mockReturnValue(mockQuery),
          create: jest.fn().mockResolvedValue({ success: true, id: `${objectType}-123` }),
          update: jest.fn().mockResolvedValue({ success: true, id: `${objectType}-123` })
        };
      })
    };
  });

  test('connect calls identity', async () => {
    await adapter.connect();
    expect((adapter as any).conn.identity).toHaveBeenCalled();
  });

  test('upsertContact creates contact', async () => {
    const contact = { email: 'test@sf.com', firstName: 'SF', lastName: 'User' };
    const result = await adapter.upsertContact(contact);

    expect(result.id).toBe('Contact-123');
  });

  test('upsertDeal creates deal', async () => {
    const deal = { name: 'SF Deal', amount: 1000, stage: 'Prospecting' };
    const result = await adapter.upsertDeal(deal);

    expect(result.id).toBe('Opportunity-123');
  });

  test('addActivity creates task', async () => {
    const activity = { type: 'note' as const, subject: 'SF Task', body: 'Body', timestamp: new Date(), dealId: 'opp-123' };
    const result = await adapter.addActivity(activity);

    expect(result.id).toBe('Task-123');
  });
});
