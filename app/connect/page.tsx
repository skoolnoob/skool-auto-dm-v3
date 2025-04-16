'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function ConnectSkool() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Check if user is already signed in
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/signin')
      }
    }
    checkUser()
  }, [router, supabase])

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      console.log('Starting connection process...')
      
      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        console.error('User verification failed:', userError)
        throw new Error('Not authenticated. Please sign in first.')
      }

      // Get the session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session) {
        console.error('Session verification failed:', sessionError)
        throw new Error('Session not found. Please sign in again.')
      }

      console.log('Session obtained, saving Skool credentials...')
      
      // Save the credentials to Supabase
      const { error: saveError } = await supabase
        .from('skool_credentials')
        .upsert({
          user_id: user.id,
          email,
          password
        })

      if (saveError) {
        console.error('Failed to save credentials:', saveError)
        throw new Error('Failed to save Skool credentials')
      }

      console.log('Credentials saved, redirecting to Skool...')
      
      // Store the return URL in localStorage
      localStorage.setItem('skoolReturnUrl', '/settings')
      
      // Redirect to Skool login page
      window.location.href = 'https://www.skool.com/login'
      
    } catch (error: any) {
      console.error('Connection error:', error)
      setError(error.message || 'An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  // Check if we're returning from Skool login
  useEffect(() => {
    const checkReturnFromSkool = async () => {
      const returnUrl = localStorage.getItem('skoolReturnUrl')
      if (returnUrl) {
        console.log('Returning from Skool login, redirecting to settings...')
        localStorage.removeItem('skoolReturnUrl')
        router.push(returnUrl)
      }
    }
    checkReturnFromSkool()
  }, [router])

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-6">Connect to Skool</h2>
          
          {error && (
            <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleConnect} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Skool Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Skool Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div className="text-sm text-gray-500">
              Your Skool credentials will be securely stored and used only for sending automated DMs.
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Connecting...' : 'Connect to Skool'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
} 