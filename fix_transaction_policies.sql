-- Add missing UPDATE and DELETE policies for transactions table
-- This allows users to edit and delete their own transactions

-- Add UPDATE policy
CREATE POLICY "Users can update own transactions" ON transactions
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add DELETE policy
CREATE POLICY "Users can delete own transactions" ON transactions
  FOR DELETE USING (auth.uid() = user_id);

