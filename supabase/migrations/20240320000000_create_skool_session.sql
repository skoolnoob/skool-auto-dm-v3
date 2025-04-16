-- Create skool_session table
CREATE TABLE IF NOT EXISTS public.skool_session (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    cookies TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.skool_session ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to access their own session data
CREATE POLICY "Users can access their own session data"
    ON public.skool_session
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX skool_session_user_id_idx ON public.skool_session(user_id); 