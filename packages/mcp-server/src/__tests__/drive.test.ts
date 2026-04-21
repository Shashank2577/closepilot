import { test, expect, describe, vi, beforeEach } from 'vitest';
import { listTemplates, generateDocument, getDownloadUrl } from '../tools/drive';

// Mock google-auth util so credential env vars are not required
vi.mock('../utils/google-auth', () => ({
  initializeGoogleClients: vi.fn(),
  getDriveClient: vi.fn(),
  getDocsClient: vi.fn(),
}));

// Mock googleapis
vi.mock('googleapis', () => {
  const mockDriveFiles = {
    export: vi.fn().mockResolvedValue({}),
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
    get: vi.fn().mockImplementation(({ fields }: { fields?: string } = {}) => {
      if (fields && fields.includes('exportLinks')) {
        return Promise.resolve({
          data: {
            id: 'copied_doc_id',
            webViewLink: 'https://docs.google.com/document/d/copied_doc_id/edit',
            exportLinks: {
              'application/pdf': 'https://docs.google.com/export?format=pdf',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                'https://docs.google.com/export?format=docx'
            }
          }
        });
      }
      // Default: return a valid file object (works for getTemplate and getDownloadUrl)
      return Promise.resolve({
        data: {
          id: 'template1',
          name: 'Test Template',
          mimeType: 'application/vnd.google-apps.document',
          createdTime: '2024-01-01T00:00:00Z',
          modifiedTime: '2024-01-01T00:00:00Z',
          webViewLink: 'https://docs.google.com/document/d/template1/edit',
          webContentLink: 'https://docs.google.com/export?format=pdf',
          properties: { type: 'proposal', category: 'general', version: '1.0.0' },
        }
      });
    })
  };

  const mockDriveClient = { files: mockDriveFiles };
  const mockDocsClient = {
    documents: {
      get: vi.fn().mockResolvedValue({ data: { body: { content: [] } } }),
      batchUpdate: vi.fn().mockResolvedValue({})
    }
  };

  return {
    google: {
      auth: {
        JWT: vi.fn().mockImplementation(function () { return {}; }),
      },
      drive: vi.fn().mockReturnValue(mockDriveClient),
      docs: vi.fn().mockReturnValue(mockDocsClient),
    }
  };
});

// Patch getDriveClient / getDocsClient to return the mocked googleapis clients
import { getDriveClient, getDocsClient } from '../utils/google-auth';
import { google } from 'googleapis';

describe('drive tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set required env vars
    process.env.DRIVE_TEMPLATES_FOLDER_ID = 'test-templates-folder';
    // Return the mocked googleapis clients
    (getDriveClient as ReturnType<typeof vi.fn>).mockReturnValue(google.drive({ version: 'v3' }));
    (getDocsClient as ReturnType<typeof vi.fn>).mockReturnValue(google.docs({ version: 'v1' }));
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
  });

  test('getDownloadUrl returns webContentLink', async () => {
    const url = await getDownloadUrl('copied_doc_id');
    expect(url).toBe('https://docs.google.com/export?format=pdf');
  });
});
