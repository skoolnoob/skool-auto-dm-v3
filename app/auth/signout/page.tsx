'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function SignOut() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const signOut = async () => {
      try {
        const { error } = await supabase.auth.signOut()
        if (error) {
          console.error('Error signing out:', error)
          // Even if there's an error, we should still redirect
          router.push('/auth/signin')
        } else {
          router.push('/auth/signin')
        }
      } catch (error) {
        console.error('Unexpected error during sign out:', error)
        router.push('/auth/signin')
      }
    }

    signOut()
  }, [router, supabase])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Signing out...
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please wait while we sign you out.
          </p>
        </div>
      </div>
    </div>
  )
} 