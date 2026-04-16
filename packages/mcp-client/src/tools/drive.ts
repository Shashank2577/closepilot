import { DealStoreClient } from '../client.js';
import type {
  DocumentTemplate,
  DocumentGenerationRequest,
  DocumentGenerationResult,
  GeneratedDocument,
  DriveFolder,
  DocumentMetadata,
} from '@closepilot/core';

/**
 * Drive MCP Tools
 * Typed wrappers for Drive operations
 */
export class DriveTools {
  constructor(private client: DealStoreClient) {}

  /**
   * List document templates
   */
  async listTemplates(type?: string): Promise<DocumentTemplate[]> {
    const response = await this.client.callTool('list_templates', {
      type,
    });
    return JSON.parse(response.content as string) as DocumentTemplate[];
  }

  /**
   * Get a template by ID
   */
  async getTemplate(templateId: string): Promise<DocumentTemplate | null> {
    const response = await this.client.callTool('get_template', { templateId });
    return JSON.parse(response.content as string) as DocumentTemplate | null;
  }

  /**
   * Generate a document from a template
   */
  async generateDocument(
    request: DocumentGenerationRequest
  ): Promise<DocumentGenerationResult> {
    const response = await this.client.callTool('generate_document', request as unknown as Record<string, unknown>);
    return JSON.parse(response.content as string) as DocumentGenerationResult;
  }

  /**
   * Get a generated document by ID
   */
  async getDocument(documentId: string): Promise<GeneratedDocument | null> {
    const response = await this.client.callTool('get_document', { documentId });
    return JSON.parse(response.content as string) as GeneratedDocument | null;
  }

  /**
   * Update document status
   */
  async updateDocumentStatus(
    documentId: string,
    status: 'draft' | 'pending_review' | 'approved' | 'rejected'
  ): Promise<GeneratedDocument> {
    const response = await this.client.callTool('update_document_status', {
      documentId,
      status,
    });
    return JSON.parse(response.content as string) as GeneratedDocument;
  }

  /**
   * Create a folder in Drive
   */
  async createFolder(name: string, parentId?: string): Promise<DriveFolder> {
    const response = await this.client.callTool('create_drive_folder', {
      name,
      parentId,
    });
    return JSON.parse(response.content as string) as DriveFolder;
  }

  /**
   * List documents in a folder
   */
  async listFolder(folderId: string): Promise<DocumentMetadata[]> {
    const response = await this.client.callTool('list_drive_folder', { folderId });
    return JSON.parse(response.content as string) as DocumentMetadata[];
  }

  /**
   * Copy a document
   */
  async copyDocument(
    documentId: string,
    destinationFolderId?: string,
    newTitle?: string
  ): Promise<DocumentMetadata> {
    const response = await this.client.callTool('copy_drive_document', {
      documentId,
      destinationFolderId,
      newTitle,
    });
    return JSON.parse(response.content as string) as DocumentMetadata;
  }

  /**
   * Share a document
   */
  async shareDocument(
    documentId: string,
    emails: string[],
    role: 'reader' | 'writer' | 'commenter'
  ): Promise<void> {
    await this.client.callTool('share_drive_document', {
      documentId,
      emails,
      role,
    });
  }

  /**
   * Get document download URL
   */
  async getDownloadUrl(documentId: string): Promise<string> {
    const response = await this.client.callTool('get_drive_download_url', {
      documentId,
    });
    return response.content as string;
  }
}
