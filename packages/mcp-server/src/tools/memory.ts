import OpenAI from 'openai';
import { insertDealEmbedding, querySimilarEmbeddings } from '@closepilot/db';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type ContentType = 'email_thread' | 'proposal_chunk' | 'research_summary';

async function embedText(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: text,
  });
  return response.data[0].embedding;
}

export async function storeDealContext(
  dealId: number,
  content: string,
  contentType: ContentType
): Promise<{ id: string }> {
  const embedding = await embedText(content);
  return insertDealEmbedding({ dealId, content, contentType, embedding });
}

export async function searchDealHistory(
  dealId: number,
  query: string,
  limit = 3
): Promise<{ results: Array<{ content: string; contentType: string; similarity: number }> }> {
  const embedding = await embedText(query);
  const results = await querySimilarEmbeddings({ dealId, embedding, limit });
  return { results };
}

export const memoryToolDefinitions = [
  {
    name: 'store_deal_context',
    description: 'Embed and store a piece of content (email thread, proposal chunk, or research summary) for a deal for later semantic retrieval.',
    inputSchema: {
      type: 'object',
      properties: {
        dealId: { type: 'number', description: 'The deal ID' },
        content: { type: 'string', description: 'The text content to embed and store' },
        contentType: {
          type: 'string',
          enum: ['email_thread', 'proposal_chunk', 'research_summary'],
          description: 'The type of content being stored',
        },
      },
      required: ['dealId', 'content', 'contentType'],
    },
  },
  {
    name: 'search_deal_history',
    description: 'Semantic search over stored deal context. Returns the most relevant stored chunks for a given query.',
    inputSchema: {
      type: 'object',
      properties: {
        dealId: { type: 'number', description: 'The deal ID to search within' },
        query: { type: 'string', description: 'The natural language query to search for' },
        limit: { type: 'number', description: 'Maximum number of results to return (default 3)', default: 3 },
      },
      required: ['dealId', 'query'],
    },
  },
];

export const memoryToolHandlers: Record<string, (args: Record<string, unknown>) => Promise<unknown>> = {
  store_deal_context: (args) =>
    storeDealContext(
      args.dealId as number,
      args.content as string,
      args.contentType as ContentType
    ),
  search_deal_history: (args) =>
    searchDealHistory(
      args.dealId as number,
      args.query as string,
      (args.limit as number | undefined) ?? 3
    ),
};
