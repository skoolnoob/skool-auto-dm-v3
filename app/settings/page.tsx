'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [keywords, setKeywords] = useState('')
  const [message, setMessage] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [testMode, setTestMode] = useState(false)
  const [dmHistory, setDmHistory] = useState<any[]>([])
  const [testUsername, setTestUsername] = useState('')
  const [testKeyword, setTestKeyword] = useState('')
  const [testLoading, setTestLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const loadDmHistory = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Try to fetch the DM history
      const { data: history, error } = await supabase
        .from('sent_dms')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error loading DM history:', error);
        setDmHistory([]);
        return;
      }

      setDmHistory(history || []);
    } catch (error) {
      console.error('Error in loadDmHistory:', error);
      setDmHistory([]);
    }
  };

  const ensureTablesExist = async () => {
    try {
      const response = await fetch('/api/create-tables', {
        method: 'POST',
      });
      
      if (!response.ok) {
        console.error('Failed to create tables:', await response.text());
      }
    } catch (error) {
      console.error('Error ensuring tables exist:', error);
    }
  };

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push('/auth/signin')
          return
        }

        // Check for stored Skool credentials - get all and use the most recent
        const { data: credentials, error: credentialsError } = await supabase
          .from('skool_credentials')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(1)

        if (credentialsError) {
          console.error('Error fetching credentials:', credentialsError)
          setError('Failed to load credentials. Please try again.')
          return
        }

        if (credentials && credentials.length > 0) {
          console.log('Found Skool credentials:', credentials[0])
          setIsConnected(true)
          setEmail(credentials[0].email)
          setPassword(credentials[0].password)
          
          try {
            // Load settings and DM history
            await loadSettings()
            await loadDmHistory()
          } catch (error) {
            console.error('Error loading settings or history:', error)
            setError('Failed to load some settings. Please refresh the page.')
          }
        } else {
          console.log('No Skool credentials found')
          setIsConnected(false)
        }
      } catch (error) {
        console.error('Error checking connection:', error)
        setError('An unexpected error occurred. Please try again.')
      }
    }

    checkConnection()
  }, [router, supabase])

  const loadSettings = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: settings, error: settingsError } = await supabase
        .from('auto_dm_settings')
        .select('*')
        .eq('user_id', session.user.id)
        .single()

      if (settingsError) {
        console.error('Error loading settings:', settingsError)
        setError('Failed to load settings. Please try again.')
        return
      }

      if (settings) {
        setKeywords(settings.keywords.join(', '))
        setMessage(settings.message)
        setIsMonitoring(settings.is_monitoring)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      setError('An unexpected error occurred while loading settings.')
    }
  }

  const handleSkoolConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError || !session) {
        router.push('/auth/signin');
        return;
      }

      const response = await fetch('/api/skool/automate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          email,
          password,
          action: 'connect',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect to Skool');
      }

      setIsConnected(true);
      setSuccess('Successfully connected to Skool!');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError || !session) {
        router.push('/auth/signin');
        return;
      }

      // Save credentials if not connected
      if (!isConnected) {
        const { error: credentialsError } = await supabase
          .from('skool_credentials')
          .upsert({
            user_id: session.user.id,
            email,
            password,
          });

        if (credentialsError) throw credentialsError;
        setIsConnected(true);
      }

      // Save settings
      const { error: settingsError } = await supabase
        .from('auto_dm_settings')
        .upsert({
          user_id: session.user.id,
          keywords: keywords.split(',').map(k => k.trim()),
          message,
          is_monitoring: true,
        });

      if (settingsError) throw settingsError;

      // Start monitoring
      const response = await fetch('/api/skool/automate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          email,
          password,
          keywords: keywords.split(',').map(k => k.trim()),
          message,
          action: 'monitor',
          testMode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start monitoring');
      }

      setIsMonitoring(true);
      setSuccess('Settings saved and monitoring started!');
      loadDmHistory(); // Refresh DM history
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestDM = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestLoading(true);
    setError('');
    setSuccess('');

    try {
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError || !session) {
        router.push('/auth/signin');
        return;
      }

      const response = await fetch('/api/skool/automate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          email,
          password,
          action: 'test_dm',
          recipient: testUsername,
          keyword: testKeyword,
          message,
          testMode: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send test DM');
      }

      setSuccess('Test DM sent successfully!');
      setTestUsername('');
      setTestKeyword('');
      loadDmHistory(); // Refresh DM history
    } catch (error: any) {
      setError(error.message);
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-6">Skool Auto DM Settings</h2>

          {error && (
            <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-md">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-md">
              {success}
            </div>
          )}

          {!isConnected ? (
            <form onSubmit={handleSkoolConnect} className="space-y-4">
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

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Connecting...' : 'Connect to Skool'}
              </button>
            </form>
          ) : (
            <>
              <form onSubmit={handleSaveSettings} className="space-y-4 mb-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Keywords (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="goggles, glasses, eyewear"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    DM Message
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    rows={4}
                    placeholder="Hi! Thanks for your interest in our goggles..."
                    required
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="testMode"
                    checked={testMode}
                    onChange={(e) => setTestMode(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="testMode" className="ml-2 block text-sm text-gray-700">
                    Test Mode (log DMs without sending)
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Settings & Start Monitoring'}
                </button>
              </form>

              {/* Test DM Section */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Send Test DM</h3>
                <form onSubmit={handleTestDM} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Username to Test
                    </label>
                    <input
                      type="text"
                      value={testUsername}
                      onChange={(e) => setTestUsername(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Enter Skool username"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Test Keyword
                    </label>
                    <input
                      type="text"
                      value={testKeyword}
                      onChange={(e) => setTestKeyword(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Enter keyword to test"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={testLoading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {testLoading ? 'Sending Test DM...' : 'Send Test DM'}
                  </button>
                </form>
              </div>

              {/* DM History */}
              {dmHistory.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Recent DM Activity</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Keyword</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {dmHistory.map((dm) => (
                          <tr key={dm.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{dm.recipient_name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{dm.keyword}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                dm.status === 'sent' ? 'bg-green-100 text-green-800' :
                                dm.status === 'tested' ? 'bg-blue-100 text-blue-800' :
                                dm.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {dm.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(dm.created_at).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
} 