-- Add currency field to expense_categories table
-- This allows each category to have its own default currency

ALTER TABLE expense_categories 
ADD COLUMN currency TEXT DEFAULT 'USD';

-- Update existing categories to use a default currency (optional)
-- You can change this to match your preferred default
UPDATE expense_categories 
SET currency = 'USD' 
WHERE currency IS NULL;

