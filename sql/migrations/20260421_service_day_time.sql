-- Migration: add service_day and service_time to churches table
-- Date: 2026-04-21
-- Run in Supabase SQL editor

ALTER TABLE churches ADD COLUMN IF NOT EXISTS service_day TEXT DEFAULT 'Sunday';
ALTER TABLE churches ADD COLUMN IF NOT EXISTS service_time TEXT DEFAULT '10:00';
