import { test, expect, describe, vi, beforeEach } from 'vitest';
import { listTemplates, generateDocument, getDownloadUrl } from '../tools/drive';

// Mock googleapis
vi.mock('googleapis', () => {
  return {
    google: {
      auth: {
        JWT: vi.fn().mockImplementation(function() { return {}; }),
      },
      drive: vi.fn().mockReturnValue({
        files: {
          list: vi.fn().mockResolvedValue({
            data: {
              files: [
                {
                  id: 'template1',
                  name: 'Test Template',
                  appProperties: {
                    isTemplate: 'true',
                    type: 'proposal'
                  }
                }
              ]
            }
          }),
          copy: vi.fn().mockResolvedValue({
            data: { id: 'copied_doc_id' }
          }),
          update: vi.fn().mockResolvedValue({}),
          get: vi.fn().mockImplementation(({ fields }) => {
            if (fields.includes('exportLinks')) {
              return Promise.resolve({
                data: {
                  webViewLink: 'https://docs.google.com/document/d/copied_doc_id/edit',
                  exportLinks: {
                    'application/pdf': 'https://docs.google.com/export?format=pdf',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'https://docs.google.com/export?format=docx'
                  }
                }
              });
            }
            return Promise.resolve({ data: {} });
          })
        }
      }),
      docs: vi.fn().mockReturnValue({
        documents: {
          batchUpdate: vi.fn().mockResolvedValue({})
        }
      })
    }
  };
});

describe('drive tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('listTemplates returns mock templates', async () => {
    const templates = await listTemplates();
    expect(templates).toHaveLength(1);
    expect(templates[0].id).toBe('template1');
    expect(templates[0].name).toBe('Test Template');
  });

  test('generateDocument creates document and returns result', async () => {
    const result = await generateDocument({
      templateId: 'template1',
      dealId: 'deal1',
      values: { Company: 'Acme Corp' },
      outputFormat: 'pdf'
    });

    expect(result.status).toBe('success');
    expect(result.documentId).toBe('copied_doc_id');
    expect(result.downloadUrl).toBe('https://docs.google.com/export?format=pdf');
  });

  test('getDownloadUrl returns export link', async () => {
    const url = await getDownloadUrl('copied_doc_id');
    expect(url).toBe('https://docs.google.com/export?format=pdf');
  });
});
