-- Migration: Add unique constraint on (business_id, phone) for members table
-- Run this on existing databases to prevent duplicate member phone race conditions.
-- Safe to run multiple times (IF NOT EXISTS).

-- First, remove any existing duplicates by keeping only the earliest record per (business_id, phone).
-- WARNING: review the result before running in production if you suspect duplicates already exist.
DELETE FROM members
WHERE id NOT IN (
  SELECT DISTINCT ON (business_id, phone) id
  FROM members
  ORDER BY business_id, phone, created_at ASC
);

-- Add the unique constraint
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_business_id_phone_key;
ALTER TABLE members ADD CONSTRAINT members_business_id_phone_key UNIQUE (business_id, phone);
