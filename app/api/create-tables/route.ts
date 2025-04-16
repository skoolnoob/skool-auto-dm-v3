import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const CREATE_SENT_DMS_SQL = `
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
DO $$ 
BEGIN 
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
END $$;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS sent_dms_user_id_idx ON public.sent_dms(user_id);
CREATE INDEX IF NOT EXISTS sent_dms_recipient_id_idx ON public.sent_dms(recipient_id);
CREATE INDEX IF NOT EXISTS sent_dms_status_idx ON public.sent_dms(status);
`

export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // Execute the SQL directly
    const { error } = await supabase.from('sent_dms').select('*').limit(1)
    
    if (error?.code === '42P01') { // Table doesn't exist
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: CREATE_SENT_DMS_SQL
      })

      if (createError) {
        console.error('Error creating sent_dms table:', createError)
        return NextResponse.json({ error: createError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error creating tables:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
} 