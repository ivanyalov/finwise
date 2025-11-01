-- Clean up orphaned transactions (transactions with deleted categories)
-- This removes transactions that reference category IDs that no longer exist

-- Option 1: Delete transactions where category doesn't exist in expense_categories
DELETE FROM transactions 
WHERE type = 'expense' 
AND category IS NOT NULL 
AND category NOT IN (SELECT id FROM expense_categories);

-- Option 2: If you want to also delete transactions with NULL categories
-- Uncomment the line below:
-- DELETE FROM transactions WHERE type = 'expense' AND category IS NULL;

