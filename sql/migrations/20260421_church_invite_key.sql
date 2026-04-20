-- Migration: add invite_key_encrypted to churches table
-- Date: 2026-04-21
-- Run in Supabase SQL editor

ALTER TABLE churches ADD COLUMN IF NOT EXISTS invite_key_encrypted TEXT;
