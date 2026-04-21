import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockEmbeddingsCreate, mockInsertDealEmbedding, mockQuerySimilarEmbeddings } = vi.hoisted(() => ({
  mockEmbeddingsCreate: vi.fn(),
  mockInsertDealEmbedding: vi.fn(),
  mockQuerySimilarEmbeddings: vi.fn(),
}));

// Mock OpenAI — must be a class (constructor)
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(function () {
    return { embeddings: { create: mockEmbeddingsCreate } };
  }),
}));

// Mock @closepilot/db query functions
vi.mock('@closepilot/db', () => ({
  insertDealEmbedding: mockInsertDealEmbedding,
  querySimilarEmbeddings: mockQuerySimilarEmbeddings,
}));

import { storeDealContext, searchDealHistory } from './memory.js';

const FAKE_EMBEDDING = Array.from({ length: 1536 }, (_, i) => i / 1536);

beforeEach(() => {
  vi.clearAllMocks();
  mockEmbeddingsCreate.mockResolvedValue({
    data: [{ embedding: FAKE_EMBEDDING }],
  });
});

describe('storeDealContext', () => {
  it('calls OpenAI embeddings then inserts into db', async () => {
    mockInsertDealEmbedding.mockResolvedValue({ id: 'uuid-123' });

    const result = await storeDealContext(42, 'Test email content', 'email_thread');

    expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
      model: 'text-embedding-ada-002',
      input: 'Test email content',
    });
    expect(mockInsertDealEmbedding).toHaveBeenCalledWith({
      dealId: 42,
      content: 'Test email content',
      contentType: 'email_thread',
      embedding: FAKE_EMBEDDING,
    });
    expect(result).toEqual({ id: 'uuid-123' });
  });
});

describe('searchDealHistory', () => {
  it('embeds query and runs cosine similarity search', async () => {
    mockQuerySimilarEmbeddings.mockResolvedValue([
      { content: 'Relevant email', contentType: 'email_thread', similarity: 0.92 },
      { content: 'Proposal chunk', contentType: 'proposal_chunk', similarity: 0.85 },
    ]);

    const result = await searchDealHistory(42, 'budget discussion', 2);

    expect(mockEmbeddingsCreate).toHaveBeenCalledWith({
      model: 'text-embedding-ada-002',
      input: 'budget discussion',
    });
    expect(mockQuerySimilarEmbeddings).toHaveBeenCalledWith({
      dealId: 42,
      embedding: FAKE_EMBEDDING,
      limit: 2,
    });
    expect(result.results).toHaveLength(2);
    expect(result.results[0]).toEqual({
      content: 'Relevant email',
      contentType: 'email_thread',
      similarity: 0.92,
    });
  });

  it('uses default limit of 3 when not specified', async () => {
    mockQuerySimilarEmbeddings.mockResolvedValue([]);
    await searchDealHistory(1, 'query');
    expect(mockQuerySimilarEmbeddings).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 3 })
    );
  });
});
