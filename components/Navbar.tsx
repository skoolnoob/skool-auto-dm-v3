'use client'

import Link from 'next/link'
import { User } from '@supabase/supabase-js'

interface NavbarProps {
  user: User | null
}

export default function Navbar({ user }: NavbarProps) {
  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-xl font-bold text-indigo-600">
                Skool Auto DM
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/"
                className="border-indigo-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Dashboard
              </Link>
              <Link
                href="/settings"
                className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Settings
              </Link>
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-4">
            {user ? (
              <Link
                href="/auth/signout"
                className="btn-secondary"
              >
                Sign Out
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/signup"
                  className="btn-secondary"
                >
                  Sign Up
                </Link>
                <Link
                  href="/auth/signin"
                  className="btn-primary"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
} 