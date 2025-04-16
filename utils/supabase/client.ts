import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function getSkoolCredentials(userId: string) {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('skool_credentials')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      console.error('Error fetching Skool credentials:', error)
      return null
    }
    return data
  } catch (error) {
    console.error('Unexpected error in getSkoolCredentials:', error)
    return null
  }
}

export async function saveSkoolCredentials(userId: string, email: string, password: string) {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('skool_credentials')
      .upsert({
        user_id: userId,
        email,
        password,
        updated_at: new Date().toISOString(),
      })

    if (error) {
      console.error('Error saving Skool credentials:', error)
      throw error
    }
    return data
  } catch (error) {
    console.error('Unexpected error in saveSkoolCredentials:', error)
    throw error
  }
}

export async function getAutoDMSettings(userId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('auto_dm_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('Error fetching auto-DM settings:', error)
    return null
  }
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

  if (error) {
    console.error('Error saving auto-DM settings:', error)
    throw error
  }
  return data
} 