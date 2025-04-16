'use client'

import { useState, useEffect } from 'react'
import { skoolService } from '@/lib/skool'
import { createClient } from '@/utils/supabase/client'

export default function SettingsPage() {
  const [skoolEmail, setSkoolEmail] = useState('')
  const [skoolPassword, setSkoolPassword] = useState('')
  const [keywords, setKeywords] = useState<string[]>([])
  const [dmMessage, setDmMessage] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Please sign in to access settings')
        return
      }

      // Load Skool credentials
      const { data: credentials, error: credentialsError } = await supabase
        .from('skool_credentials')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (credentialsError) {
        console.error('Error loading credentials:', credentialsError)
      } else {
        if (credentials) {
          setSkoolEmail(credentials.email)
          setIsConnected(true)
        } else {
          setSkoolEmail('')
          setIsConnected(false)
        }
      }

      // Load auto-DM settings
      const { data: settings, error: settingsError } = await supabase
        .from('auto_dm_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (settingsError) {
        console.error('Error loading settings:', settingsError)
      } else {
        if (settings) {
          setKeywords(settings.keywords || [])
          setDmMessage(settings.message || '')
          setIsMonitoring(settings.is_monitoring || false)
        } else {
          setKeywords([])
          setDmMessage('')
          setIsMonitoring(false)
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      setError('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSkoolConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Please sign in to connect Skool account')

      // Save credentials to Supabase
      const { error: saveError } = await supabase
        .from('skool_credentials')
        .upsert({
          user_id: user.id,
          email: skoolEmail,
          password: skoolPassword,
          updated_at: new Date().toISOString(),
        })

      if (saveError) throw saveError

      // Test the connection
      await skoolService.signIn(skoolEmail, skoolPassword)
      
      // Log successful connection
      await supabase
        .from('skool_activity')
        .insert({
          user_id: user.id,
          action: 'Connected to Skool',
          status: 'success'
        })

      setIsConnected(true)
      setSuccess('Successfully connected to Skool!')
    } catch (error: any) {
      console.error('Connection error:', error)
      setError(error.message || 'Failed to connect to Skool')
      setIsConnected(false)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Please sign in to save settings')

      // Save settings to Supabase
      const { error: saveError } = await supabase
        .from('auto_dm_settings')
        .upsert({
          user_id: user.id,
          keywords,
          message: dmMessage,
          is_monitoring,
          updated_at: new Date().toISOString(),
        })

      if (saveError) throw saveError

      // Log settings update
      await supabase
        .from('skool_activity')
        .insert({
          user_id: user.id,
          action: 'Updated auto-DM settings',
          status: 'success',
          details: { keywords, is_monitoring }
        })

      setSuccess('Settings saved successfully!')
    } catch (error: any) {
      console.error('Save error:', error)
      setError(error.message || 'Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>

        <div className="mt-6 space-y-6">
          {/* Skool Connection Form */}
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Skool Connection
              </h3>
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p>Connect your Skool account to enable auto-DM functionality.</p>
              </div>
              <form onSubmit={handleSkoolConnect} className="mt-5 space-y-4">
                <div>
                  <label htmlFor="skool-email" className="block text-sm font-medium text-gray-700">
                    Skool Email
                  </label>
                  <input
                    type="email"
                    id="skool-email"
                    value={skoolEmail}
                    onChange={(e) => setSkoolEmail(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="skool-password" className="block text-sm font-medium text-gray-700">
                    Skool Password
                  </label>
                  <input
                    type="password"
                    id="skool-password"
                    value={skoolPassword}
                    onChange={(e) => setSkoolPassword(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {loading ? 'Connecting...' : isConnected ? 'Update Connection' : 'Connect to Skool'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Auto-DM Settings Form */}
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Auto-DM Settings
              </h3>
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p>Configure your auto-DM settings to automatically send messages to users who comment with specific keywords.</p>
              </div>
              <form onSubmit={handleSaveSettings} className="mt-5 space-y-4">
                <div>
                  <label htmlFor="keywords" className="block text-sm font-medium text-gray-700">
                    Keywords (comma-separated)
                  </label>
                  <input
                    type="text"
                    id="keywords"
                    value={keywords.join(', ')}
                    onChange={(e) => setKeywords(e.target.value.split(',').map(k => k.trim()))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="keyword1, keyword2, keyword3"
                  />
                </div>
                <div>
                  <label htmlFor="dm-message" className="block text-sm font-medium text-gray-700">
                    DM Message
                  </label>
                  <textarea
                    id="dm-message"
                    value={dmMessage}
                    onChange={(e) => setDmMessage(e.target.value)}
                    rows={4}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="Enter the message to send when keywords are detected"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    id="monitoring"
                    type="checkbox"
                    checked={isMonitoring}
                    onChange={(e) => setIsMonitoring(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="monitoring" className="ml-2 block text-sm text-gray-900">
                    Enable monitoring
                  </label>
                </div>
                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">{error}</div>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="rounded-md bg-green-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">Success</h3>
                  <div className="mt-2 text-sm text-green-700">{success}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 