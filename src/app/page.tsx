'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import useCallStore from '@/store/useCallStore'
import AuthForm from '@/components/Auth/AuthForm'
import CallInterface from '@/components/Call/CallInterface'

export default function Home() {
  const [isLoading, setIsLoading] = useState(true)
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
                Аудио звонки
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user?.email}
              </span>
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
    </div>
  )
}