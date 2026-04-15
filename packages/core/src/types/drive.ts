/**
 * Document template in Google Drive
 */
export interface DocumentTemplate {
  id: string;
  name: string;
  type: DocumentType;
  category: string;
  description?: string;
  driveId: string;
  placeholders: Placeholder[];
  createdAt: Date;
  updatedAt: Date;
  version: string;
}

/**
 * Document types
 */
export enum DocumentType {
  PROPOSAL = 'proposal',
  SOW = 'sow',
  CONTRACT = 'contract',
  EMAIL = 'email',
  PRESENTATION = 'presentation',
}

/**
 * Template placeholder
 */
export interface Placeholder {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'list' | 'table';
  required: boolean;
  defaultValue?: unknown;
}

/**
 * Generated document
 */
export interface GeneratedDocument {
  id: string;
  templateId: string;
  dealId: string;
  type: DocumentType;
  title: string;
  driveId: string;
  driveUrl: string;
  values: Record<string, unknown>;
  status: 'draft' | 'pending_review' | 'approved' | 'rejected';
  generatedAt: Date;
  updatedAt: Date;
}

/**
 * Document generation request
 */
export interface DocumentGenerationRequest {
  templateId: string;
  dealId: string;
  values: Record<string, unknown>;
  outputFormat: 'doc' | 'pdf' | 'both';
  createInFolder?: string;
}

/**
 * Document generation result
 */
export interface DocumentGenerationResult {
  documentId: string;
  driveId: string;
  driveUrl: string;
  downloadUrl?: string;
  status: 'success' | 'partial' | 'failed';
  errors?: string[];
}

/**
 * Folder structure in Drive
 */
export interface DriveFolder {
  id: string;
  name: string;
  path: string[];
  parentFolderId?: string;
  createdAt: Date;
}

/**
 * Document metadata
 */
export interface DocumentMetadata {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  created: Date;
  modified: Date;
  webViewLink: string;
  webContentLink?: string;
  parents: string[];
  owners: string[];
}
