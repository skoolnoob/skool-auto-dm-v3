-- Create skool_credentials table
CREATE TABLE IF NOT EXISTS skool_credentials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE skool_credentials ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to access only their own credentials
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'skool_credentials' AND policyname = 'Users can view their own credentials'
    ) THEN
        CREATE POLICY "Users can view their own credentials"
            ON skool_credentials FOR SELECT
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- Create policy to allow users to insert their own credentials
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'skool_credentials' AND policyname = 'Users can insert their own credentials'
    ) THEN
        CREATE POLICY "Users can insert their own credentials"
            ON skool_credentials FOR INSERT
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Create policy to allow users to update their own credentials
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'skool_credentials' AND policyname = 'Users can update their own credentials'
    ) THEN
        CREATE POLICY "Users can update their own credentials"
            ON skool_credentials FOR UPDATE
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Create policy to allow users to delete their own credentials
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'skool_credentials' AND policyname = 'Users can delete their own credentials'
    ) THEN
        CREATE POLICY "Users can delete their own credentials"
            ON skool_credentials FOR DELETE
            USING (auth.uid() = user_id);
    END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS skool_credentials_user_id_idx ON skool_credentials(user_id); 