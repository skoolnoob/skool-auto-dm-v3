'use client'

import { useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function SignOut() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const signOut = async () => {
      await supabase.auth.signOut()
      router.push('/auth/signin')
    }

    signOut()
  }, [router, supabase])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Signing out...</h2>
      </div>
    </div>
  )
} 