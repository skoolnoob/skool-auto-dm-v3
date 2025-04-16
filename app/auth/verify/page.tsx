'use client'

import Link from 'next/link'

export default function Verify() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Check your email
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            We've sent you a verification link. Please check your email to verify your account.
          </p>
        </div>
        <div className="text-center">
          <Link
            href="/auth/signin"
            className="text-sm text-indigo-600 hover:text-indigo-500"
          >
            Return to sign in
          </Link>
        </div>
      </div>
    </div>
  )
} 