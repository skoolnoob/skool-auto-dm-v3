-- Create a function to create the sent_dms table
CREATE OR REPLACE FUNCTION create_sent_dms_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create sent_dms table if it doesn't exist
  CREATE TABLE IF NOT EXISTS public.sent_dms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_name TEXT NOT NULL,
    recipient_id TEXT,
    message TEXT NOT NULL,
    keyword TEXT NOT NULL,
    post_id TEXT,
    comment_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
  );

  -- Enable Row Level Security if table was just created
  ALTER TABLE public.sent_dms ENABLE ROW LEVEL SECURITY;

  -- Create policy to allow users to access their own DM history if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'sent_dms' 
    AND policyname = 'Users can access their own DM history'
  ) THEN
    CREATE POLICY "Users can access their own DM history"
      ON public.sent_dms
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Create indexes if they don't exist
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'sent_dms_user_id_idx') THEN
    CREATE INDEX sent_dms_user_id_idx ON public.sent_dms(user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'sent_dms_recipient_id_idx') THEN
    CREATE INDEX sent_dms_recipient_id_idx ON public.sent_dms(recipient_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'sent_dms_status_idx') THEN
    CREATE INDEX sent_dms_status_idx ON public.sent_dms(status);
  END IF;
END;
$$; 