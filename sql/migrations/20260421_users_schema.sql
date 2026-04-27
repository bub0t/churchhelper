-- Migration: introduce users table, add name/status to churches
-- Date: 2026-04-21

-- Add name and status columns to churches
ALTER TABLE churches ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE churches ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved';

-- Update the existing CBC church record
UPDATE churches
SET name = 'Canterbury Baptist Church', status = 'approved'
WHERE id = 'cbc';

-- Users table: individual login accounts, each associated to a church
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,                          -- username, e.g. 'ariel'
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  church_id TEXT REFERENCES churches(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',       -- 'pending' | 'approved'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Password reset tokens (users only)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
