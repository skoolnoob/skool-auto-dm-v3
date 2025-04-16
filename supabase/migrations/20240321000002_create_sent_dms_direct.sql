-- Create sent_dms table directly
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

-- Enable Row Level Security
ALTER TABLE public.sent_dms ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to access their own DM history
CREATE POLICY "Users can access their own DM history"
    ON public.sent_dms
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS sent_dms_user_id_idx ON public.sent_dms(user_id);
CREATE INDEX IF NOT EXISTS sent_dms_recipient_id_idx ON public.sent_dms(recipient_id);
CREATE INDEX IF NOT EXISTS sent_dms_status_idx ON public.sent_dms(status); 