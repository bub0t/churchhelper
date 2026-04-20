-- Migration: refactor song storage to a shared pool + per-church junction table
-- Date: 2026-04-20

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Shared song pool: one row per unique song, embedding stored once regardless of how many churches use it
CREATE TABLE IF NOT EXISTS songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL UNIQUE,
  artist TEXT,
  tempo TEXT,
  ccli TEXT,
  band_requirements TEXT,
  is_hymn BOOLEAN DEFAULT FALSE,
  embedding VECTOR(1536)
);

-- IVFFlat index for fast cosine similarity search over all songs
CREATE INDEX IF NOT EXISTS songs_embedding_idx
  ON songs
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Per-church song list: links a church to songs in the shared pool
CREATE TABLE IF NOT EXISTS church_songs (
  church_id TEXT NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  PRIMARY KEY (church_id, song_id)
);

-- Keep old song_embeddings table in place temporarily for backward compatibility.
-- It can be dropped once all data has been migrated to the new schema.
-- DROP TABLE IF EXISTS song_embeddings;
