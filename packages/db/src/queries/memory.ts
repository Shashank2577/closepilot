import { sql } from 'drizzle-orm';
import { getDb } from '../db.js';
import { dealEmbeddings } from '../schema/vectors.js';

type ContentType = 'email_thread' | 'proposal_chunk' | 'research_summary';

export async function insertDealEmbedding(params: {
  dealId: number;
  content: string;
  contentType: ContentType;
  embedding: number[];
}): Promise<{ id: string }> {
  const { dealId, content, contentType, embedding } = params;
  const [row] = await getDb()
    .insert(dealEmbeddings)
    .values({ dealId, content, contentType, embedding })
    .returning({ id: dealEmbeddings.id });
  return { id: row.id };
}

export async function querySimilarEmbeddings(params: {
  dealId: number;
  embedding: number[];
  limit: number;
}): Promise<Array<{ content: string; contentType: string; similarity: number }>> {
  const { dealId, embedding, limit } = params;
  const vectorLiteral = `[${embedding.join(',')}]`;

  const rows = await getDb().execute<{
    content: string;
    content_type: string;
    similarity: number;
  }>(sql`
    SELECT content, content_type, 1 - (embedding <=> ${vectorLiteral}::vector) AS similarity
    FROM deal_embeddings
    WHERE deal_id = ${dealId}
    ORDER BY embedding <=> ${vectorLiteral}::vector
    LIMIT ${limit}
  `);

  // postgres.js returns rows as the iterable itself (no .rows property)
  return Array.from(rows).map(r => ({
    content: r.content,
    contentType: r.content_type,
    similarity: r.similarity,
  }));
}
