-- First, let's clean up any duplicate settings
WITH ranked_settings AS (
  SELECT 
    id,
    user_id,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
  FROM auto_dm_settings
)
DELETE FROM auto_dm_settings
WHERE id IN (
  SELECT id FROM ranked_settings WHERE rn > 1
);

-- Ensure we have the correct constraints
ALTER TABLE auto_dm_settings 
  DROP CONSTRAINT IF EXISTS auto_dm_settings_user_id_key,
  ADD CONSTRAINT auto_dm_settings_user_id_key UNIQUE (user_id);

-- Update RLS policies
DROP POLICY IF EXISTS "Users can view their own settings" ON auto_dm_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON auto_dm_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON auto_dm_settings;
DROP POLICY IF EXISTS "Users can delete their own settings" ON auto_dm_settings;

CREATE POLICY "Users can view their own settings"
  ON auto_dm_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON auto_dm_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON auto_dm_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings"
  ON auto_dm_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Add an index to improve query performance
CREATE INDEX IF NOT EXISTS idx_auto_dm_settings_user_id ON auto_dm_settings(user_id); 