import { PipedriveAdapter } from '../src/pipedrive-adapter';
import * as pipedrive from 'pipedrive';

// Mock pipedrive module classes
jest.mock('pipedrive', () => {
  return {
    ApiClient: jest.fn().mockImplementation(() => {
      return {
        authentications: { api_key: { apiKey: '' } }
      };
    }),
    PersonsApi: jest.fn().mockImplementation(() => {
      return {
        getPersons: jest.fn().mockResolvedValue({}),
        searchPersons: jest.fn().mockResolvedValue({ data: { items: [] } }),
        addPerson: jest.fn().mockResolvedValue({ data: { id: 123 } }),
        updatePerson: jest.fn().mockResolvedValue({ data: { id: 123 } })
      };
    }),
    DealsApi: jest.fn().mockImplementation(() => {
      return {
        addDeal: jest.fn().mockResolvedValue({ data: { id: 456 } }),
        updateDeal: jest.fn().mockResolvedValue({ data: { id: 456 } })
      };
    }),
    NotesApi: jest.fn().mockImplementation(() => {
      return {
        addNote: jest.fn().mockResolvedValue({ data: { id: 789 } })
      };
    })
  };
});

describe('PipedriveAdapter', () => {
  let adapter: PipedriveAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new PipedriveAdapter('mock-token');
  });

  test('connect calls getPersons', async () => {
    await adapter.connect();
    expect(pipedrive.PersonsApi).toHaveBeenCalled();
  });

  test('upsertContact works', async () => {
    const contact = { email: 'test@pd.com' };
    const result = await adapter.upsertContact(contact);
    expect(result.id).toBe('123');
  });

  test('upsertDeal works', async () => {
    const deal = { name: 'PD Deal' };
    const result = await adapter.upsertDeal(deal);
    expect(result.id).toBe('456');
  });

  test('addActivity works', async () => {
    const activity = { type: 'note' as const, subject: 'Test', body: 'Body', timestamp: new Date(), dealId: 'deal-456' };
    const result = await adapter.addActivity(activity);
    expect(result.id).toBe('789');
  });
});
