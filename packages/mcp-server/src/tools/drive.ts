import type {
  DocumentTemplate,
  DocumentGenerationRequest,
  DocumentGenerationResult,
} from '@closepilot/core';

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

// Stub implementations that will be replaced
export async function listTemplates(type?: string): Promise<DocumentTemplate[]> {
  throw new Error('Not implemented - Jules J-104 will implement');
}

export async function generateDocument(
  request: DocumentGenerationRequest
): Promise<DocumentGenerationResult> {
  throw new Error('Not implemented - Jules J-104 will implement');
}

export async function createFolder(name: string, parentId?: string): Promise<any> {
  throw new Error('Not implemented - Jules J-104 will implement');
}

export async function shareDocument(
  documentId: string,
  emails: string[],
  role: 'reader' | 'writer' | 'commenter'
): Promise<void> {
  throw new Error('Not implemented - Jules J-104 will implement');
}
