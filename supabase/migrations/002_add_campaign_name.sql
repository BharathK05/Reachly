-- Migration 002: Add name field to campaigns table
-- Run this in the Supabase SQL editor

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS name text;
