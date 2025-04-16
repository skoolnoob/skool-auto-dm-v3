import { createClient } from '@/utils/supabase/client'

export class SkoolService {
  private static instance: SkoolService
  private supabase = createClient()

  private constructor() {}

  static getInstance(): SkoolService {
    if (!SkoolService.instance) {
      SkoolService.instance = new SkoolService()
    }
    return SkoolService.instance
  }

  async signIn(email: string, password: string) {
    try {
      // First, get the user's Skool credentials from Supabase
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: credentials, error: credentialsError } = await this.supabase
        .from('skool_credentials')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (credentialsError) throw credentialsError
      if (!credentials) throw new Error('No Skool credentials found')

      // Here you would implement the actual Skool authentication
      // This is a placeholder for the actual Skool API call
      const response = await fetch('https://api.skool.com/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
        }),
      })

      if (!response.ok) {
        throw new Error('Invalid Skool credentials')
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Skool sign in error:', error)
      throw error
    }
  }

  async saveCredentials(email: string, password: string) {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await this.supabase
        .from('skool_credentials')
        .upsert({
          user_id: user.id,
          email,
          password,
          updated_at: new Date().toISOString(),
        })

      if (error) throw error
    } catch (error) {
      console.error('Error saving Skool credentials:', error)
      throw error
    }
  }

  private isConnected = false
  private isMonitoring = false
  private credentials: { email: string; password: string } | null = null

  async connect(credentials: { email: string; password: string }) {
    try {
      // Here you would implement the actual Skool API connection
      // For now, we'll simulate a successful connection
      this.credentials = credentials
      this.isConnected = true

      // Save credentials to Supabase
      const user = await this.supabase.auth.getUser()
      if (user.data.user) {
        await this.supabase
          .from('skool_credentials')
          .upsert({
            user_id: user.data.user.id,
            email: credentials.email,
            password: credentials.password // Note: In production, you should encrypt this
          })
      }

      return true
    } catch (error) {
      console.error('Error connecting to Skool:', error)
      return false
    }
  }

  async disconnect() {
    this.isConnected = false
    this.credentials = null
    this.isMonitoring = false
  }

  async monitorComments(settings: { keywords: string[]; dmMessage: string }) {
    if (!this.isConnected) {
      throw new Error('Not connected to Skool')
    }

    try {
      // Here you would implement the actual comment monitoring
      // For now, we'll simulate starting monitoring
      this.isMonitoring = true

      // Save settings to Supabase
      const user = await this.supabase.auth.getUser()
      if (user.data.user) {
        await this.supabase
          .from('skool_settings')
          .upsert({
            user_id: user.data.user.id,
            keywords: settings.keywords,
            dm_message: settings.dmMessage
          })

        // Log the activity
        await this.supabase
          .from('skool_activity')
          .insert({
            user_id: user.data.user.id,
            action: 'Started monitoring comments',
            status: 'success'
          })
      }

      return true
    } catch (error) {
      console.error('Error starting monitoring:', error)
      return false
    }
  }

  async stopMonitoring() {
    this.isMonitoring = false
  }

  isConnectedToSkool() {
    return this.isConnected
  }

  isMonitoringComments() {
    return this.isMonitoring
  }
}

export const skoolService = SkoolService.getInstance() 