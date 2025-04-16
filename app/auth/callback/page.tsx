'use client'

import { useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function AuthCallback() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) throw error
        if (session) {
          router.push('/')
        }
      } catch (error) {
        console.error('Error handling auth callback:', error)
        router.push('/auth/signin')
      }
    }

    handleCallback()
  }, [router, supabase])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Verifying your email...</h2>
      </div>
    </div>
  )
} 