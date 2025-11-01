-- Add theme column to user_settings table
-- Run this in your Supabase SQL Editor

-- Add the theme column if it doesn't exist
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'dark' CHECK (theme IN ('light', 'dark'));

-- Update any existing rows to have the default theme
UPDATE user_settings 
SET theme = 'dark' 
WHERE theme IS NULL;

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'user_settings' 
  AND column_name = 'theme';



