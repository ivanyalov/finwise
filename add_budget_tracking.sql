-- Add budget tracking columns to user_settings table

ALTER TABLE user_settings 
ADD COLUMN budget_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN monthly_budget_amount DECIMAL(10, 2),
ADD COLUMN budget_currency TEXT;

-- Update existing rows to have budget_enabled = false
UPDATE user_settings SET budget_enabled = FALSE WHERE budget_enabled IS NULL;

