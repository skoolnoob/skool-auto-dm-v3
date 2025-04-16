-- First, let's clean up any duplicate settings by keeping only the most recent one
WITH latest_settings AS (
  SELECT DISTINCT ON (user_id) id, user_id
  FROM auto_dm_settings
  ORDER BY user_id, created_at DESC
)
DELETE FROM auto_dm_settings
WHERE id NOT IN (SELECT id FROM latest_settings);

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