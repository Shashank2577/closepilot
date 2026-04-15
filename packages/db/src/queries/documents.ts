import { documents } from '../schema';
import { getDb } from '../db';

/**
 * Query stubs for document operations
 * These will be implemented by Jules session J-101
 */

export async function createDocument(data: {
  dealId: number;
  templateId?: string;
  type: string;
  title: string;
  values: string;
}) {
  throw new Error('Not implemented - Jules J-101 will implement');
}

export async function getDocumentById(documentId: number) {
  throw new Error('Not implemented - Jules J-101 will implement');
}

export async function getDocumentsByDeal(dealId: number) {
  throw new Error('Not implemented - Jules J-101 will implement');
}

export async function updateDocumentStatus(
  documentId: number,
  status: string
) {
  throw new Error('Not implemented - Jules J-101 will implement');
}
