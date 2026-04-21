import type {
  DocumentTemplate,
  DocumentGenerationRequest,
  DocumentGenerationResult,
  GeneratedDocument,
  DriveFolder,
  DocumentMetadata,
} from '@closepilot/core';
import { DocumentType } from '@closepilot/core';
import { getDriveClient, getDocsClient } from '../utils/google-auth.js';
import {
  formatDocumentMetadata,
  formatDriveFolder,
  parsePlaceholders,
  replacePlaceholders,
} from '../utils/drive-formatter.js';

/**
 * Drive tools handler map for MCP server integration
 */
export const driveToolHandlers: Record<string, (args: any) => Promise<any>> = {
  list_templates: async (args) => {
    const templates = await listTemplates(args.type);
    return { content: [{ type: 'text', text: JSON.stringify(templates) }] };
  },
  get_template: async (args) => {
    const template = await getTemplate(args.templateId);
    return { content: [{ type: 'text', text: JSON.stringify(template) }] };
  },
  generate_document: async (args) => {
    const result = await generateDocument(args as DocumentGenerationRequest);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  },
  get_document: async (args) => {
    const doc = await getDocument(args.documentId);
    return { content: [{ type: 'text', text: JSON.stringify(doc) }] };
  },
  update_document_status: async (args) => {
    const result = await updateDocumentStatus(args.documentId, args.status);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  },
  create_folder: async (args) => {
    const folder = await createFolder(args.name, args.parentId);
    return { content: [{ type: 'text', text: JSON.stringify(folder) }] };
  },
  list_folder: async (args) => {
    const items = await listFolder(args.folderId);
    return { content: [{ type: 'text', text: JSON.stringify(items) }] };
  },
  copy_document: async (args) => {
    const result = await copyDocument(args.documentId, args.folderId, args.newName);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  },
  share_document: async (args) => {
    const result = await shareDocument(args.documentId, args.email, args.role);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  },
  get_download_url: async (args) => {
    const url = await getDownloadUrl(args.documentId);
    return { content: [{ type: 'text', text: JSON.stringify({ url }) }] };
  },
};

/**
 * Register Drive integration tools with MCP server
 * Implements Google Drive and Docs API for template-based document generation
 */
export function registerDriveTools(server: any): void {
  console.log('Drive tools registered');

  // Register tool handlers
  server.setRequestHandler(
    { method: 'tools/call', name: 'list_templates' },
    async (request: any) => {
      const { type } = request.params.arguments || {};
      const templates = await listTemplates(type);
      return {
        content: [{ type: 'text', text: JSON.stringify(templates) }],
      };
    }
  );

  server.setRequestHandler(
    { method: 'tools/call', name: 'get_template' },
    async (request: any) => {
      const { templateId } = request.params.arguments || {};
      const template = await getTemplate(templateId);
      return {
        content: [{ type: 'text', text: JSON.stringify(template) }],
      };
    }
  );

  server.setRequestHandler(
    { method: 'tools/call', name: 'generate_document' },
    async (request: any) => {
      const params = request.params.arguments as DocumentGenerationRequest;
      const result = await generateDocument(params);
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
      };
    }
  );

  server.setRequestHandler(
    { method: 'tools/call', name: 'get_document' },
    async (request: any) => {
      const { documentId } = request.params.arguments || {};
      const document = await getDocument(documentId);
      return {
        content: [{ type: 'text', text: JSON.stringify(document) }],
      };
    }
  );

  server.setRequestHandler(
    { method: 'tools/call', name: 'update_document_status' },
    async (request: any) => {
      const { documentId, status } = request.params.arguments || {};
      const document = await updateDocumentStatus(documentId, status);
      return {
        content: [{ type: 'text', text: JSON.stringify(document) }],
      };
    }
  );

  server.setRequestHandler(
    { method: 'tools/call', name: 'create_drive_folder' },
    async (request: any) => {
      const { name, parentId } = request.params.arguments || {};
      const folder = await createFolder(name, parentId);
      return {
        content: [{ type: 'text', text: JSON.stringify(folder) }],
      };
    }
  );

  server.setRequestHandler(
    { method: 'tools/call', name: 'list_drive_folder' },
    async (request: any) => {
      const { folderId } = request.params.arguments || {};
      const documents = await listFolder(folderId);
      return {
        content: [{ type: 'text', text: JSON.stringify(documents) }],
      };
    }
  );

  server.setRequestHandler(
    { method: 'tools/call', name: 'copy_drive_document' },
    async (request: any) => {
      const { documentId, destinationFolderId, newTitle } = request.params.arguments || {};
      const document = await copyDocument(documentId, destinationFolderId, newTitle);
      return {
        content: [{ type: 'text', text: JSON.stringify(document) }],
      };
    }
  );

  server.setRequestHandler(
    { method: 'tools/call', name: 'share_drive_document' },
    async (request: any) => {
      const { documentId, emails, role } = request.params.arguments || {};
      await shareDocument(documentId, emails, role);
      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true }) }],
      };
    }
  );

  server.setRequestHandler(
    { method: 'tools/call', name: 'get_drive_download_url' },
    async (request: any) => {
      const { documentId } = request.params.arguments || {};
      const url = await getDownloadUrl(documentId);
      return {
        content: [{ type: 'text', text: url }],
      };
    }
  );
}

/**
 * List document templates from Drive folder
 */
export async function listTemplates(type?: string): Promise<DocumentTemplate[]> {
  const drive = getDriveClient();

  // Get templates folder from environment or use default
  const templatesFolderId = process.env.DRIVE_TEMPLATES_FOLDER_ID;

  if (!templatesFolderId) {
    throw new Error('DRIVE_TEMPLATES_FOLDER_ID not configured');
  }

  const response = await drive.files.list({
    q: `'${templatesFolderId}' in parents and trashed=false`,
    fields: 'files(id,name,mimeType,createdTime,modifiedTime,properties)',
  });

  const templates: DocumentTemplate[] = [];

  for (const file of response.data.files || []) {
    // Filter by type if specified
    const fileType = file.properties?.type as DocumentType;
    if (type && fileType !== type) {
      continue;
    }

    templates.push({
      id: file.properties?.documentId || file.id!,
      name: file.name!,
      type: fileType || DocumentType.PROPOSAL,
      category: file.properties?.category || 'general',
      description: file.properties?.description,
      driveId: file.id!,
      placeholders: await extractPlaceholders(file.id!),
      createdAt: new Date(file.createdTime!),
      updatedAt: new Date(file.modifiedTime!),
      version: file.properties?.version || '1.0.0',
    });
  }

  return templates;
}

/**
 * Get template by ID with placeholders
 */
export async function getTemplate(templateId: string): Promise<DocumentTemplate | null> {
  const drive = getDriveClient();

  const response = await drive.files.get({
    fileId: templateId,
    fields: 'id,name,mimeType,createdTime,modifiedTime,properties',
  });

  const file = response.data;
  if (!file.id) {
    return null;
  }

  return {
    id: file.properties?.documentId || file.id,
    name: file.name!,
    type: (file.properties?.type as DocumentType) || DocumentType.PROPOSAL,
    category: file.properties?.category || 'general',
    description: file.properties?.description,
    driveId: file.id,
    placeholders: await extractPlaceholders(file.id),
    createdAt: new Date(file.createdTime!),
    updatedAt: new Date(file.modifiedTime!),
    version: file.properties?.version || '1.0.0',
  };
}

/**
 * Generate document from template
 */
export async function generateDocument(
  request: DocumentGenerationRequest
): Promise<DocumentGenerationResult> {
  const drive = getDriveClient();
  const docs = getDocsClient();

  // Get template
  const template = await getTemplate(request.templateId);
  if (!template) {
    return {
      documentId: '',
      driveId: '',
      driveUrl: '',
      status: 'failed',
      errors: ['Template not found'],
    };
  }

  try {
    // Copy template to new document
    const copyResponse = await drive.files.copy({
      fileId: template.driveId,
      requestBody: {
        name: `${template.name} - ${new Date().toISOString()}`,
        parents: request.createInFolder ? [request.createInFolder] : undefined,
      },
    });

    const newDocId = copyResponse.data.id!;

    // Get document content
    const docResponse = await docs.documents.get({
      documentId: newDocId,
    });

    // Replace placeholders
    const content = JSON.stringify(docResponse.data);
    const updatedContent = replacePlaceholders(content, request.values);

    // Update document with replaced content
    await docs.documents.batchUpdate({
      documentId: newDocId,
      requestBody: {
        requests: [
          {
            replaceAllText: {
              containsText: {
                text: '*',
                matchCase: false,
              },
              replaceText: updatedContent,
            },
          },
        ],
      },
    });

    // Generate exports based on format
    let downloadUrl: string | undefined;

    if (request.outputFormat === 'doc' || request.outputFormat === 'both') {
      // Export as .docx
      const docxExport = await drive.files.export({
        fileId: newDocId,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      // TODO: Save to appropriate location
    }

    if (request.outputFormat === 'pdf' || request.outputFormat === 'both') {
      // Export as PDF
      const pdfExport = await drive.files.export({
        fileId: newDocId,
        mimeType: 'application/pdf',
      });
      // TODO: Save to appropriate location
    }

    // Get final file info
    const fileResponse = await drive.files.get({
      fileId: newDocId,
      fields: 'id,name,webViewLink,webContentLink',
    });

    return {
      documentId: newDocId,
      driveId: newDocId,
      driveUrl: fileResponse.data.webViewLink!,
      downloadUrl,
      status: 'success',
    };
  } catch (error) {
    return {
      documentId: '',
      driveId: '',
      driveUrl: '',
      status: 'failed',
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

/**
 * Get generated document by ID
 */
export async function getDocument(documentId: string): Promise<GeneratedDocument | null> {
  const drive = getDriveClient();

  const response = await drive.files.get({
    fileId: documentId,
    fields: 'id,name,webViewLink,webContentLink,createdTime,modifiedTime,properties',
  });

  const file = response.data;
  if (!file.id) {
    return null;
  }

  return {
    id: file.id,
    templateId: file.properties?.templateId || '',
    dealId: file.properties?.dealId || '',
    type: (file.properties?.type as DocumentType) || DocumentType.PROPOSAL,
    title: file.name!,
    driveId: file.id,
    driveUrl: file.webViewLink!,
    values: JSON.parse(file.properties?.values || '{}'),
    status: (file.properties?.status as GeneratedDocument['status']) || 'draft',
    generatedAt: new Date(file.createdTime!),
    updatedAt: new Date(file.modifiedTime!),
  };
}

/**
 * Update document status
 */
export async function updateDocumentStatus(
  documentId: string,
  status: 'draft' | 'pending_review' | 'approved' | 'rejected'
): Promise<GeneratedDocument> {
  const drive = getDriveClient();

  await drive.files.update({
    fileId: documentId,
    requestBody: {
      properties: {
        status,
      },
    },
  });

  const document = await getDocument(documentId);
  if (!document) {
    throw new Error('Document not found after status update');
  }

  return document;
}

/**
 * Create folder in Drive
 */
export async function createFolder(name: string, parentId?: string): Promise<DriveFolder> {
  const drive = getDriveClient();

  const response = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : undefined,
    },
    fields: 'id,name,createdTime,parents',
  });

  return formatDriveFolder(response.data);
}

/**
 * List documents in folder
 */
export async function listFolder(folderId: string): Promise<DocumentMetadata[]> {
  const drive = getDriveClient();

  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: 'files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink,parents,owners)',
  });

  return (response.data.files || []).map(formatDocumentMetadata);
}

/**
 * Copy document to destination folder
 */
export async function copyDocument(
  documentId: string,
  destinationFolderId?: string,
  newTitle?: string
): Promise<DocumentMetadata> {
  const drive = getDriveClient();

  const response = await drive.files.copy({
    fileId: documentId,
    requestBody: {
      name: newTitle,
      parents: destinationFolderId ? [destinationFolderId] : undefined,
    },
  });

  return formatDocumentMetadata(response.data);
}

/**
 * Share document with emails and role
 */
export async function shareDocument(
  documentId: string,
  emails: string[],
  role: 'reader' | 'writer' | 'commenter'
): Promise<void> {
  const drive = getDriveClient();

  for (const email of emails) {
    await drive.permissions.create({
      fileId: documentId,
      requestBody: {
        role,
        type: 'user',
        emailAddress: email,
      },
    });
  }
}

/**
 * Get download URL for document
 */
export async function getDownloadUrl(documentId: string): Promise<string> {
  const drive = getDriveClient();

  const response = await drive.files.get({
    fileId: documentId,
    fields: 'webContentLink',
  });

  return response.data.webContentLink || '';
}

/**
 * Extract placeholders from document template
 * Reads document content and finds {{placeholder}} patterns
 */
async function extractPlaceholders(documentId: string): Promise<any[]> {
  const docs = getDocsClient();

  try {
    const response = await docs.documents.get({
      documentId,
    });

    // Extract text content from document
    const content = extractTextFromDocument(response.data);
    return parsePlaceholders(content);
  } catch {
    // If document is not a Google Doc, return empty array
    return [];
  }
}

/**
 * Extract all text content from Google Doc structure
 */
function extractTextFromDocument(doc: any): string {
  let text = '';

  if (doc.body && doc.body.content) {
    for (const element of doc.body.content) {
      if (element.paragraph && element.paragraph.elements) {
        for (const elem of element.paragraph.elements) {
          if (elem.textRun) {
            text += elem.textRun.content;
          }
        }
      }
      if (element.table) {
        // Extract table text
        for (const row of element.table.tableRows || []) {
          for (const cell of row.tableCells || []) {
            for (const cellElem of cell.content || []) {
              if (cellElem.paragraph && cellElem.paragraph.elements) {
                for (const elem of cellElem.paragraph.elements) {
                  if (elem.textRun) {
                    text += elem.textRun.content;
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  return text;
}
