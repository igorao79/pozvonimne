'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import useCallStore from '@/store/useCallStore'
import AuthForm from '@/components/Auth/AuthForm'
import CallInterface from '@/components/Call/CallInterface'
import { UserProfile } from '@/components/Profile'
import { ThemeToggler } from '@/components/ui/theme-toggler'

export default function Home() {
  const [isLoading, setIsLoading] = useState(true)
  const [showProfile, setShowProfile] = useState(false)
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <AuthForm />
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background transition-colors">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border flex-shrink-0 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-2">
            <div className="flex items-center">
              <h1 className="text-lg font-semibold text-foreground">
                Позвони.мне
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              <ThemeToggler />
              <button
                onClick={() => setShowProfile(true)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer"
              >
                {user?.email}
              </button>
              <button
                onClick={handleSignOut}
                className="text-sm text-primary hover:text-primary/80 transition-colors"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Error Display */}
      {error && (
        <div className="bg-destructive/10 border-l-4 border-destructive p-2 flex-shrink-0">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <CallInterface />
      </main>

      {/* Profile Modal */}
      {showProfile && (
        <UserProfile onClose={() => setShowProfile(false)} />
      )}

    </div>
  )
}