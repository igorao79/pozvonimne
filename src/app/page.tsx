'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import useCallStore from '@/store/useCallStore'
import AuthForm from '@/components/Auth/AuthForm'
import CallInterface from '@/components/Call/CallInterface'
import { UserProfile } from '@/components/Profile'
import { RingtoneSettings } from '@/components/Settings'

export default function Home() {
  const [isLoading, setIsLoading] = useState(true)
  const [showProfile, setShowProfile] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const supabase = createClient()
  
  const {
    isAuthenticated,
    user,
    setUser,
    setUserId,
    setAuthenticated,
    resetAll,
    error
  } = useCallStore()

  useEffect(() => {
    // Check initial session
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          setUser(session.user)
          setUserId(session.user.id)
          setAuthenticated(true)
        } else {
          setAuthenticated(false)
        }
      } catch (err) {
        console.error('Error checking session:', err)
        setAuthenticated(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          setUserId(session.user.id)
          setAuthenticated(true)
        } else if (event === 'SIGNED_OUT') {
          resetAll()
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase, setUser, setUserId, setAuthenticated, resetAll])

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      resetAll()
    } catch (err) {
      console.error('Error signing out:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <AuthForm />
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Позвони.мне
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 text-gray-600 hover:text-blue-600 transition-colors rounded-md hover:bg-gray-100"
                title="Настройки"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <button
                onClick={() => setShowProfile(true)}
                className="text-sm text-gray-600 hover:text-blue-600 transition-colors cursor-pointer"
              >
                {user?.email}
              </button>
              <button
                onClick={handleSignOut}
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main>
        <CallInterface />
      </main>

      {/* Profile Modal */}
      {showProfile && (
        <UserProfile onClose={() => setShowProfile(false)} />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <RingtoneSettings onClose={() => setShowSettings(false)} />
      )}
    </div>
  )
}