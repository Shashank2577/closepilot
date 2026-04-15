import type {
  DocumentTemplate,
  DocumentGenerationRequest,
  DocumentGenerationResult,
  GeneratedDocument,
  DriveFolder,
  DocumentMetadata,
} from '@closepilot/core';
import { DocumentType } from '@closepilot/core';
import { google } from 'googleapis';

// Initialize Drive API using Service Account JWT
function getDriveAuth() {
  return new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/documents',
    ],
  });
}

function getDriveClient() {
  return google.drive({ version: 'v3', auth: getDriveAuth() });
}

function getDocsClient() {
  return google.docs({ version: 'v1', auth: getDriveAuth() });
}

/**
 * Register Drive integration tools with MCP server
 * These are stub implementations - will be completed by Jules session J-104
 */
export function registerDriveTools(server: any): void {
  // Stub functions for tool registration
  // Actual implementation will:
  // - List and get document templates
  // - Generate documents from templates
  // - Create and manage Drive folders
  // - Share documents

  console.log('Drive tools registered (stubs)');
}

// Helper to extract placeholders from template descriptions or file content
function extractPlaceholders(description: string = ''): DocumentTemplate['placeholders'] {
  try {
    const parsed = JSON.parse(description);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (e) {
    // Return default or empty if not JSON
  }
  return [];
}

export async function listTemplates(type?: string): Promise<DocumentTemplate[]> {
  const drive = getDriveClient();

  // Look for files with 'template' in properties or name
  let query = "mimeType='application/vnd.google-apps.document' and trashed=false";

  const response = await drive.files.list({
    q: query,
    fields: 'files(id, name, description, createdTime, modifiedTime, properties, appProperties)',
  });

  const templates: DocumentTemplate[] = (response.data.files || [])
    .filter(f => f.appProperties?.isTemplate === 'true' || f.name?.toLowerCase().includes('template'))
    .map(f => {
      // Map Drive file to our DocumentTemplate
      const docType = (f.appProperties?.type as DocumentType) || DocumentType.PROPOSAL;

      return {
        id: f.id!,
        driveId: f.id!,
        name: f.name || 'Untitled Template',
        type: docType,
        category: f.appProperties?.category || 'General',
        description: f.description || undefined,
        placeholders: extractPlaceholders(f.description || ''),
        createdAt: new Date(f.createdTime || Date.now()),
        updatedAt: new Date(f.modifiedTime || Date.now()),
        version: f.appProperties?.version || '1.0'
      };
    });

  if (type) {
    return templates.filter(t => t.type === type);
  }

  return templates;
}

export async function getTemplate(templateId: string): Promise<DocumentTemplate | null> {
  const drive = getDriveClient();
  try {
    const response = await drive.files.get({
      fileId: templateId,
      fields: 'id, name, description, createdTime, modifiedTime, properties, appProperties',
    });

    const f = response.data;
    const docType = (f.appProperties?.type as DocumentType) || DocumentType.PROPOSAL;

    return {
      id: f.id!,
      driveId: f.id!,
      name: f.name || 'Untitled Template',
      type: docType,
      category: f.appProperties?.category || 'General',
      description: f.description || undefined,
      placeholders: extractPlaceholders(f.description || ''),
      createdAt: new Date(f.createdTime || Date.now()),
      updatedAt: new Date(f.modifiedTime || Date.now()),
      version: f.appProperties?.version || '1.0'
    };
  } catch (error) {
    console.error(`Error fetching template ${templateId}:`, error);
    return null;
  }
}

export async function generateDocument(
  request: DocumentGenerationRequest
): Promise<DocumentGenerationResult> {
  const drive = getDriveClient();
  const docs = getDocsClient();

  try {
    // 1. Copy the template document
    const copyResponse = await drive.files.copy({
      fileId: request.templateId,
      requestBody: {
        name: `Generated Document for Deal ${request.dealId}`,
        parents: request.createInFolder ? [request.createInFolder] : undefined,
      },
    });

    const documentId = copyResponse.data.id!;

    // 2. Perform text replacement for placeholders
    if (Object.keys(request.values).length > 0) {
      const requests = Object.entries(request.values).map(([key, value]) => ({
        replaceAllText: {
          containsText: {
            text: `{{${key}}}`,
            matchCase: true,
          },
          replaceText: String(value),
        },
      }));

      await docs.documents.batchUpdate({
        documentId: documentId,
        requestBody: {
          requests,
        },
      });
    }

    // 3. Setup appProperties for workflow
    await drive.files.update({
      fileId: documentId,
      requestBody: {
        appProperties: {
          dealId: request.dealId,
          status: 'draft',
          type: DocumentType.PROPOSAL,
          isGenerated: 'true',
          templateId: request.templateId
        }
      }
    });

    // 4. Retrieve URLs
    const fileInfo = await drive.files.get({
      fileId: documentId,
      fields: 'webViewLink, exportLinks',
    });

    let downloadUrl: string | undefined;
    if (request.outputFormat === 'pdf') {
      downloadUrl = fileInfo.data.exportLinks?.['application/pdf'];
    } else if (request.outputFormat === 'doc' || request.outputFormat === 'both') {
      // Return docx export link
      downloadUrl = fileInfo.data.exportLinks?.['application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    }

    return {
      documentId,
      driveId: documentId,
      driveUrl: fileInfo.data.webViewLink || '',
      downloadUrl,
      status: 'success',
    };
  } catch (error: any) {
    console.error('Error generating document:', error);
    return {
      documentId: '',
      driveId: '',
      driveUrl: '',
      status: 'failed',
      errors: [error.message],
    };
  }
}

export async function getDocument(documentId: string): Promise<GeneratedDocument | null> {
  const drive = getDriveClient();
  try {
    const response = await drive.files.get({
      fileId: documentId,
      fields: 'id, name, createdTime, modifiedTime, webViewLink, appProperties',
    });

    const f = response.data;
    const docType = (f.appProperties?.type as DocumentType) || DocumentType.PROPOSAL;
    const status = (f.appProperties?.status as GeneratedDocument['status']) || 'draft';

    return {
      id: f.id!,
      templateId: f.appProperties?.templateId || '',
      dealId: f.appProperties?.dealId || '',
      type: docType,
      title: f.name || 'Untitled Document',
      driveId: f.id!,
      driveUrl: f.webViewLink || '',
      values: {}, // We don't reconstruct values from the doc here
      status,
      generatedAt: new Date(f.createdTime || Date.now()),
      updatedAt: new Date(f.modifiedTime || Date.now()),
    };
  } catch (error) {
    console.error(`Error fetching document ${documentId}:`, error);
    return null;
  }
}

export async function createFolder(name: string, parentId?: string): Promise<DriveFolder> {
  const drive = getDriveClient();
  const fileMetadata: any = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
  };

  if (parentId) {
    fileMetadata.parents = [parentId];
  }

  try {
    const response = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id, name, parents, createdTime',
    });

    const f = response.data;

    return {
      id: f.id!,
      name: f.name || name,
      path: [], // Computing exact path requires multiple API calls, leaving empty for now
      parentFolderId: f.parents?.[0],
      createdAt: new Date(f.createdTime || Date.now()),
    };
  } catch (error) {
    console.error('Error creating folder:', error);
    throw error;
  }
}

export async function listFolder(folderId: string): Promise<DocumentMetadata[]> {
  const drive = getDriveClient();
  try {
    const query = `'${folderId}' in parents and trashed = false`;
    const response = await drive.files.list({
      q: query,
      fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, parents, owners)',
    });

    return (response.data.files || []).map(f => ({
      id: f.id!,
      name: f.name || 'Unknown',
      mimeType: f.mimeType || '',
      size: f.size ? parseInt(f.size, 10) : 0,
      created: new Date(f.createdTime || Date.now()),
      modified: new Date(f.modifiedTime || Date.now()),
      webViewLink: f.webViewLink || '',
      webContentLink: f.webContentLink || undefined,
      parents: f.parents || [],
      owners: f.owners?.map(o => o.emailAddress || '').filter(Boolean) || [],
    }));
  } catch (error) {
    console.error(`Error listing folder ${folderId}:`, error);
    throw error;
  }
}

export async function copyDocument(
  documentId: string,
  destinationFolderId?: string,
  newTitle?: string
): Promise<DocumentMetadata> {
  const drive = getDriveClient();
  try {
    const response = await drive.files.copy({
      fileId: documentId,
      requestBody: {
        name: newTitle,
        parents: destinationFolderId ? [destinationFolderId] : undefined,
      },
      fields: 'id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, parents, owners',
    });

    const f = response.data;
    return {
      id: f.id!,
      name: f.name || 'Unknown',
      mimeType: f.mimeType || '',
      size: f.size ? parseInt(f.size, 10) : 0,
      created: new Date(f.createdTime || Date.now()),
      modified: new Date(f.modifiedTime || Date.now()),
      webViewLink: f.webViewLink || '',
      webContentLink: f.webContentLink || undefined,
      parents: f.parents || [],
      owners: f.owners?.map((o: any) => o.emailAddress || '').filter(Boolean) || [],
    };
  } catch (error) {
    console.error(`Error copying document ${documentId}:`, error);
    throw error;
  }
}

export async function shareDocument(
  documentId: string,
  emails: string[],
  role: 'reader' | 'writer' | 'commenter'
): Promise<void> {
  const drive = getDriveClient();
  try {
    const promises = emails.map(emailAddress =>
      drive.permissions.create({
        fileId: documentId,
        requestBody: {
          type: 'user',
          role,
          emailAddress,
        },
        sendNotificationEmail: true,
      })
    );
    await Promise.all(promises);
  } catch (error) {
    console.error(`Error sharing document ${documentId}:`, error);
    throw error;
  }
}

export async function updateDocumentStatus(
  documentId: string,
  status: 'draft' | 'pending_review' | 'approved' | 'rejected'
): Promise<GeneratedDocument | null> {
  const drive = getDriveClient();
  try {
    await drive.files.update({
      fileId: documentId,
      requestBody: {
        appProperties: {
          status,
        }
      }
    });
    return await getDocument(documentId);
  } catch (error) {
    console.error(`Error updating document status ${documentId}:`, error);
    throw error;
  }
}

export async function getDownloadUrl(documentId: string): Promise<string> {
  const drive = getDriveClient();
  try {
    const fileInfo = await drive.files.get({
      fileId: documentId,
      fields: 'exportLinks, webContentLink',
    });

    if (fileInfo.data.webContentLink) {
      return fileInfo.data.webContentLink;
    }

    // Default to PDF if export link is available
    if (fileInfo.data.exportLinks?.['application/pdf']) {
      return fileInfo.data.exportLinks['application/pdf'];
    }

    throw new Error('No download URL available for this file type.');
  } catch (error) {
    console.error(`Error getting download URL for ${documentId}:`, error);
    throw error;
  }
}
