-- Migration: create churches table to persist per-church data
-- Date: 2026-04-19

CREATE TABLE IF NOT EXISTS churches (
  id TEXT PRIMARY KEY,
  password TEXT,
  location TEXT,
  songs TEXT[] DEFAULT ARRAY[]::TEXT[]
);

-- Optional: grant privileges to authenticated role
-- GRANT SELECT, INSERT, UPDATE ON churches TO authenticated;
