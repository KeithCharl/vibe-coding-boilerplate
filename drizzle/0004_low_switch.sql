-- Enable pgvector extension first
CREATE EXTENSION IF NOT EXISTS vector;

-- Convert documents table embedding column from text to vector
-- The USING clause converts JSON string to vector format
ALTER TABLE "documents" ALTER COLUMN "embedding" SET DATA TYPE vector(1536) USING embedding::text::vector;

-- Convert web_analysis table embedding column from text to vector
ALTER TABLE "web_analysis" ALTER COLUMN "embedding" SET DATA TYPE vector(1536) USING embedding::text::vector;

-- Create HNSW indexes for fast similarity search
CREATE INDEX "documents_embedding_idx" ON "documents" USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX "web_analysis_embedding_idx" ON "web_analysis" USING hnsw ("embedding" vector_cosine_ops);