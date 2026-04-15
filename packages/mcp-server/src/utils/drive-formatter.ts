import type {
  DocumentTemplate,
  DocumentMetadata,
  DriveFolder,
  Placeholder,
} from '@closepilot/core';

/**
 * Format Drive API responses to Closepilot types
 */

/**
 * Convert Drive file metadata to DocumentMetadata
 */
export function formatDocumentMetadata(file: any): DocumentMetadata {
  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    size: parseInt(file.size || '0'),
    created: new Date(file.createdTime),
    modified: new Date(file.modifiedTime),
    webViewLink: file.webViewLink,
    webContentLink: file.webContentLink,
    parents: file.parents || [],
    owners: file.owners?.map((o: any) => o.displayName) || [],
  };
}

/**
 * Convert Drive folder to DriveFolder
 */
export function formatDriveFolder(file: any): DriveFolder {
  return {
    id: file.id,
    name: file.name,
    path: [], // TODO: Build path from parent folders
    parentFolderId: file.parents?.[0],
    createdAt: new Date(file.createdTime),
  };
}

/**
 * Parse placeholders from template file content
 * Extracts {{placeholder}} patterns from document
 */
export function parsePlaceholders(content: string): Placeholder[] {
  const placeholderRegex = /\{\{(\w+)\}\}/g;
  const placeholders = new Map<string, Placeholder>();

  let match;
  while ((match = placeholderRegex.exec(content)) !== null) {
    const key = match[1];

    if (!placeholders.has(key)) {
      placeholders.set(key, {
        key,
        label: formatPlaceholderLabel(key),
        type: inferPlaceholderType(key),
        required: true,
      });
    }
  }

  return Array.from(placeholders.values());
}

/**
 * Format placeholder key to human-readable label
 */
function formatPlaceholderLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Infer placeholder type from key name
 */
function inferPlaceholderType(key: string): Placeholder['type'] {
  const lowerKey = key.toLowerCase();

  if (lowerKey.includes('date') || lowerKey.includes('time')) {
    return 'date';
  }
  if (lowerKey.includes('amount') || lowerKey.includes('price') || lowerKey.includes('cost')) {
    return 'number';
  }
  if (lowerKey.includes('items') || lowerKey.includes('list')) {
    return 'list';
  }
  if (lowerKey.includes('table')) {
    return 'table';
  }

  return 'text';
}

/**
 * Replace placeholders in template with values
 */
export function replacePlaceholders(
  content: string,
  values: Record<string, unknown>
): string {
  let result = content;

  Object.entries(values).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    const replacement = formatValue(value);
    // Use split/join instead of replaceAll for compatibility
    result = result.split(placeholder).join(replacement);
  });

  return result;
}

/**
 * Format value for document content
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    return value.toString();
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (Array.isArray(value)) {
    return value.join(', ');
  }

  if (value instanceof Date) {
    return value.toLocaleDateString();
  }

  return JSON.stringify(value);
}
