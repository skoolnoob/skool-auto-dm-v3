'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

export default function HomePage() {
  const [user, setUser] = useState<any>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (!user) {
        setLoading(false)
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
        setIsConnected(!!credentials)
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
        setIsMonitoring(settings?.is_monitoring || false)
      }

      // Load recent activity
      const { data: activity, error: activityError } = await supabase
        .from('skool_activity')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (activityError) {
        console.error('Error loading activity:', activityError)
      } else {
        setRecentActivity(activity || [])
      }

      // Set up realtime subscription
      const subscription = supabase
        .channel('skool_activity')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'skool_activity',
            filter: `user_id=eq.${user.id}`
          }, 
          (payload) => {
            if (payload.new) {
              setRecentActivity(prev => [payload.new, ...prev].slice(0, 10))
            }
          }
        )
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Welcome to Skool Auto DM</h1>
          <p className="mb-6">Please sign in to access your dashboard</p>
          <Link 
            href="/auth/signin" 
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-3xl font-bold text-gray-900">Skool Auto DM Dashboard</h1>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Connection Status */}
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Skool Connection Status
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  {isConnected ? 'Connected to Skool' : 'Not connected to Skool'}
                </p>
              </div>
            </div>
          </div>

          {/* Monitoring Status */}
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Auto-DM Monitoring Status
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  {isMonitoring ? 'Monitoring comments' : 'Not monitoring comments'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Recent Activity
          </h3>
          <div className="mt-4">
            {recentActivity.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {recentActivity.map((activity) => (
                  <li key={activity.id} className="py-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {activity.action}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(activity.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          activity.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {activity.status}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No recent activity</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
