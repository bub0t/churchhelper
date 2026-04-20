-- Migration: add contact_email to churches table
-- Date: 2026-04-21

ALTER TABLE churches ADD COLUMN IF NOT EXISTS contact_email TEXT;
