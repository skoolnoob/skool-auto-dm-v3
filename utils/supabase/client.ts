import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function getSkoolCredentials(userId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('skool_credentials')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function saveSkoolCredentials(userId: string, email: string, password: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('skool_credentials')
    .upsert({
      user_id: userId,
      email,
      password,
      updated_at: new Date().toISOString(),
    })

  if (error) throw error
  return data
}

export async function getAutoDMSettings(userId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('auto_dm_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function saveAutoDMSettings(
  userId: string,
  keywords: string[],
  message: string,
  is_monitoring: boolean
) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('auto_dm_settings')
    .upsert({
      user_id: userId,
      keywords,
      message,
      is_monitoring,
      updated_at: new Date().toISOString(),
    })

  if (error) throw error
  return data
} 