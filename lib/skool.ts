import { createClient } from '@/utils/supabase/client'

export class SkoolService {
  private static instance: SkoolService
  private supabase = createClient()
  private isConnected = false
  private isMonitoring = false
  private credentials: { email: string; password: string } | null = null
  private currentCommunityUrl: string | null = null

  private constructor() {}

  static getInstance(): SkoolService {
    if (!SkoolService.instance) {
      SkoolService.instance = new SkoolService()
    }
    return SkoolService.instance
  }

  async signIn(email: string, password: string) {
    try {
      console.log('Attempting to sign in to Skool...')
      
      const response = await fetch('/api/skool/automate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          action: 'connect'
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect to Skool')
      }

      console.log('Skool sign in successful')
      this.credentials = { email, password }
      this.isConnected = true
      
      return data
    } catch (error) {
      console.error('Skool sign in error:', error)
      this.isConnected = false
      throw error
    }
  }

  async monitorComments(communityUrl: string, keywords: string[], dmMessage: string) {
    if (!this.isConnected || !this.credentials) {
      throw new Error('Not connected to Skool')
    }

    try {
      console.log('Starting comment monitoring...')
      
      const response = await fetch('/api/skool/automate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: this.credentials.email,
          password: this.credentials.password,
          action: 'monitor',
          communityUrl,
          keywords,
          dmMessage
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start monitoring')
      }

      this.currentCommunityUrl = communityUrl
      this.isMonitoring = true
      console.log('Monitoring started successfully')
      
      return data
    } catch (error) {
      console.error('Error starting monitoring:', error)
      this.isMonitoring = false
      this.currentCommunityUrl = null
      throw error
    }
  }

  async disconnect() {
    this.isMonitoring = false
    this.isConnected = false
    this.credentials = null
    this.currentCommunityUrl = null
  }

  isConnectedToSkool() {
    return this.isConnected
  }

  isMonitoringComments() {
    return this.isMonitoring
  }

  getCurrentCommunity() {
    return this.currentCommunityUrl
  }
}

export const skoolService = SkoolService.getInstance() 