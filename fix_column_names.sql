-- Fix column name mismatch between code and database
-- The code expects 'owner_id' but we created 'user_id'

-- Rename user_id to owner_id in portfolios table
ALTER TABLE portfolios 
RENAME COLUMN user_id TO owner_id;

-- Also check if we need to add missing columns that might exist in models
-- Add is_active column to portfolios if not exists
ALTER TABLE portfolios 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add is_active column to assets if not exists  
ALTER TABLE assets
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing records to have is_active = true
UPDATE portfolios SET is_active = true WHERE is_active IS NULL;
UPDATE assets SET is_active = true WHERE is_active IS NULL;

-- Success message
SELECT 'Column names fixed successfully! owner_id renamed and is_active added.' as message;
