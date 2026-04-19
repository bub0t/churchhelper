-- Migration: create song_embeddings table and pgvector index
-- Date: 2026-04-19

-- Enable the pgvector extension if it's not already enabled.
-- Requires a Supabase DB with the pgvector extension available.
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the table to store per-user song embeddings.
-- `embedding` dimension should match the OpenAI model used (text-embedding-3-small -> 1536 dims).
CREATE TABLE IF NOT EXISTS song_embeddings (
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  artist TEXT,
  embedding VECTOR(1536) NOT NULL,
  PRIMARY KEY (user_id, title)
);

-- Create an IVFFLAT index for fast ANN searches using cosine similarity.
-- Tune `lists` based on dataset size and query performance (100 is a reasonable starting point).
CREATE INDEX IF NOT EXISTS song_embeddings_embedding_ivfflat_idx
  ON song_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Optional: Grant select/insert/update privileges to a specific role if required.
-- GRANT SELECT, INSERT, UPDATE ON song_embeddings TO authenticated;
