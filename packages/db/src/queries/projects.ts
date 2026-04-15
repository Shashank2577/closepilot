import { projects } from '../schema';
import { getDb } from '../db';

/**
 * Query stubs for project operations
 * These will be implemented by Jules session J-101
 */

export async function getProjectById(projectId: number) {
  throw new Error('Not implemented - Jules J-101 will implement');
}

export async function searchProjectsByKeywords(keywords: string[]) {
  throw new Error('Not implemented - Jules J-101 will implement');
}

export async function findSimilarProjects(
  industry?: string,
  serviceType?: string
) {
  throw new Error('Not implemented - Jules J-101 will implement');
}
