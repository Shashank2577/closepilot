import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import type { Project } from '../schema';
import { projects } from '../schema';
import { getDb } from '../db';

export async function getProjectById(projectId: number): Promise<Project | null> {
  const db = getDb();
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  return (project as Project) || null;
}

export async function searchProjectsByKeywords(
  keywords: string[],
  limit = 10
): Promise<Project[]> {
  const db = getDb();
  const normalized = keywords.map((keyword) => keyword.trim()).filter(Boolean);

  if (normalized.length === 0) {
    const results = await db.select().from(projects).orderBy(desc(projects.createdAt)).limit(limit);
    return results as Project[];
  }

  const clauses = normalized.map((keyword) =>
    or(
      ilike(projects.name, `%${keyword}%`),
      ilike(projects.description, `%${keyword}%`),
      ilike(projects.keywords, `%${keyword}%`),
      ilike(projects.features, `%${keyword}%`),
      ilike(projects.serviceType, `%${keyword}%`)
    )
  );

  const results = await db
    .select()
    .from(projects)
    .where(or(...clauses))
    .orderBy(desc(projects.createdAt))
    .limit(limit);

  return results as Project[];
}

export async function findSimilarProjects(
  industry?: string,
  serviceType?: string,
  keywords: string[] = [],
  limit = 5
): Promise<Project[]> {
  const db = getDb();
  const terms = [
    industry?.trim() || '',
    serviceType?.trim() || '',
    ...keywords.map((term) => term.trim()),
  ].filter(Boolean);

  if (terms.length === 0) {
    const results = await db.select().from(projects).orderBy(desc(projects.createdAt)).limit(limit);
    return results as Project[];
  }

  // Lightweight similarity scoring using text matches so proposal pricing can
  // reference the closest historical projects even without full vector indexing.
  const scoreExpression = sql<number>`(
    ${terms.reduce(
      (acc, term) =>
        sql`${acc}
        + (CASE WHEN ${projects.industry} ILIKE ${`%${term}%`} THEN 3 ELSE 0 END)
        + (CASE WHEN ${projects.serviceType} ILIKE ${`%${term}%`} THEN 3 ELSE 0 END)
        + (CASE WHEN ${projects.name} ILIKE ${`%${term}%`} THEN 2 ELSE 0 END)
        + (CASE WHEN ${projects.description} ILIKE ${`%${term}%`} THEN 2 ELSE 0 END)
        + (CASE WHEN ${projects.keywords} ILIKE ${`%${term}%`} THEN 2 ELSE 0 END)
        + (CASE WHEN ${projects.features} ILIKE ${`%${term}%`} THEN 1 ELSE 0 END)`,
      sql`0`
    )}
  )`;

  const baseFilters = [];
  if (industry) baseFilters.push(ilike(projects.industry, `%${industry}%`));
  if (serviceType) baseFilters.push(ilike(projects.serviceType, `%${serviceType}%`));

  const scopedResults = await db
    .select({
      project: projects,
      score: scoreExpression,
    })
    .from(projects)
    .where(baseFilters.length ? and(...baseFilters) : undefined)
    .orderBy(sql`${scoreExpression} DESC`, desc(projects.createdAt))
    .limit(limit);

  const filteredScoped = scopedResults.filter((row) => Number(row.score) > 0).map((row) => row.project);
  if (filteredScoped.length > 0) {
    return filteredScoped as Project[];
  }

  const fallbackResults = await db
    .select({
      project: projects,
      score: scoreExpression,
    })
    .from(projects)
    .orderBy(sql`${scoreExpression} DESC`, desc(projects.createdAt))
    .limit(limit);

  return fallbackResults.filter((row) => Number(row.score) > 0).map((row) => row.project as Project);
}
