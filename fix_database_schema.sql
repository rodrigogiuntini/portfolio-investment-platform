-- Fix Database Schema - Add Missing Columns
-- Execute este SQL no Supabase SQL Editor

-- Add missing columns to assets table
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS isin VARCHAR(12),
ADD COLUMN IF NOT EXISTS cusip VARCHAR(9),
ADD COLUMN IF NOT EXISTS exchange VARCHAR(10),
ADD COLUMN IF NOT EXISTS industry VARCHAR(100),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add missing columns to portfolios table  
ALTER TABLE portfolios
ADD COLUMN IF NOT EXISTS currency currency DEFAULT 'BRL',
ADD COLUMN IF NOT EXISTS benchmark VARCHAR(50),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Rename owner_id to user_id in portfolios (if needed)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'portfolios' AND column_name = 'owner_id') THEN
        ALTER TABLE portfolios RENAME COLUMN owner_id TO user_id;
    END IF;
END $$;

-- Update existing portfolios to have default values
UPDATE portfolios SET 
    currency = 'BRL' WHERE currency IS NULL,
    is_active = true WHERE is_active IS NULL;

UPDATE assets SET 
    is_active = true WHERE is_active IS NULL;

-- Success message
SELECT 'Database schema fixed successfully! Missing columns added.' as message;
