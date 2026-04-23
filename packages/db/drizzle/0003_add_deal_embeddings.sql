-- Enable pgvector extension (idempotent)
CREATE EXTENSION IF NOT EXISTS vector;

-- Create deal_embeddings table
CREATE TABLE IF NOT EXISTS "deal_embeddings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "deal_id" integer NOT NULL REFERENCES "deals"("id") ON DELETE CASCADE,
  "embedding" vector(1536) NOT NULL,
  "content_type" text NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

-- HNSW index for fast cosine-similarity search (pgvector >= 0.5)
CREATE INDEX IF NOT EXISTS "deal_embeddings_embedding_idx"
  ON "deal_embeddings"
  USING hnsw ("embedding" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
