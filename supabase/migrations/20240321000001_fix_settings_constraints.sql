-- Drop existing constraints if they exist
ALTER TABLE auto_dm_settings DROP CONSTRAINT IF EXISTS auto_dm_settings_user_id_key;

-- Clean up any duplicate rows by keeping only the most recent one
WITH duplicates AS (
  SELECT user_id, MAX(created_at) as max_created_at
  FROM auto_dm_settings
  GROUP BY user_id
  HAVING COUNT(*) > 1
)
DELETE FROM auto_dm_settings a
WHERE EXISTS (
  SELECT 1
  FROM duplicates d
  WHERE a.user_id = d.user_id
  AND a.created_at < d.max_created_at
);

-- Add unique constraint to ensure one row per user
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'auto_dm_settings_user_id_key'
    ) THEN
        ALTER TABLE auto_dm_settings ADD CONSTRAINT auto_dm_settings_user_id_key UNIQUE (user_id);
    END IF;
END $$;

-- Add RLS policies
ALTER TABLE auto_dm_settings ENABLE ROW LEVEL SECURITY;

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