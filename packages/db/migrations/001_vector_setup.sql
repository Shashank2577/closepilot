CREATE EXTENSION IF NOT EXISTS vector;

CREATE INDEX IF NOT EXISTS deal_embeddings_embedding_idx
  ON deal_embeddings
  USING hnsw (embedding vector_cosine_ops);
