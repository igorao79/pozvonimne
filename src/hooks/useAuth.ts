'use client'

import { useEffect } from 'react'
import useSupabaseStore from '@/store/useSupabaseStore'
import useCallStore from '@/store/useCallStore'

export function useAuth() {
  const { supabase } = useSupabaseStore()
  const {
    isAuthenticated,
    user,
    setUser,
    setUserId,
    setAuthenticated,
    resetAll,
  } = useCallStore()

  // Listen for auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          // Проверяем, подтвержден ли email (покрываем null и undefined)
          const isEmailConfirmed = !!session.user.email_confirmed_at
          
          if (isEmailConfirmed) {
            setUser(session.user)
            setUserId(session.user.id)
            setAuthenticated(true)
            console.log('✅ Email подтвержден, пользователь авторизован')
          } else {
            // Email не подтвержден - не устанавливаем статус аутентификации
            setUser(session.user)
            setUserId(session.user.id)
            setAuthenticated(false) // Важно! Не аутентифицируем пользователя
            console.log('📧 Email не подтвержден, требуется подтверждение')
          }
        } else if (event === 'SIGNED_OUT') {
          resetAll()
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase, setUser, setUserId, setAuthenticated, resetAll])

  // Check initial session with rememberMe logic
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Сначала проверяем, был ли включен rememberMe в localStorage
        const rememberMeEnabled = typeof window !== 'undefined' &&
                                  localStorage.getItem('rememberMe') === 'true'
        const lastLoginTime = typeof window !== 'undefined' &&
                              localStorage.getItem('lastLoginTime')

        // Если прошло более 90 дней с момента включения rememberMe, отключаем его
        if (rememberMeEnabled && lastLoginTime) {
          const daysSinceLogin = (Date.now() - parseInt(lastLoginTime)) / (1000 * 60 * 60 * 24)
          if (daysSinceLogin > 90) {
            localStorage.removeItem('rememberMe')
            localStorage.removeItem('lastLoginTime')
            console.log('⏰ Срок "Запомнить меня" истек, требуется повторный вход')
          }
        }

        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user) {
          // Проверяем, подтвержден ли email (покрываем null и undefined)
          const isEmailConfirmed = !!session.user.email_confirmed_at
          
          if (isEmailConfirmed) {
            // Проверяем, была ли сессия создана с "Запомнить меня"
            const rememberMe = session.user.user_metadata?.remember_me
            const expiresAt = session.user.user_metadata?.expires_at
            const now = Math.floor(Date.now() / 1000)

            // Если сессия должна истечь в ближайшие 7 дней, обновляем её
            if (rememberMe && expiresAt && (expiresAt - now) < (7 * 24 * 60 * 60)) {
              console.log('🔄 Продление сессии "Запомнить меня"')
              await supabase.auth.updateUser({
                data: {
                  remember_me: true,
                  expires_at: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60),
                }
              })
            }

            setUser(session.user)
            setUserId(session.user.id)
            setAuthenticated(true)
            console.log('✅ Email подтвержден при загрузке сессии')
          } else {
            // Email не подтвержден - не авторизуем пользователя
            setAuthenticated(false)
            console.log('📧 Email не подтвержден при загрузке сессии')
          }
        } else {
          setAuthenticated(false)
        }
      } catch (err) {
        console.error('Error checking session:', err)
        setAuthenticated(false)
      }
    }

    checkSession()
  }, [supabase, setUser, setUserId, setAuthenticated])

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()

      // Очищаем настройки rememberMe при выходе
      if (typeof window !== 'undefined') {
        localStorage.removeItem('rememberMe')
        localStorage.removeItem('lastLoginTime')
        console.log('🗑️ Очищены настройки "Запомнить меня"')
      }

      resetAll()
    } catch (err) {
      console.error('Error signing out:', err)
    }
  }

  return {
    isAuthenticated,
    user,
    handleSignOut
  }
}
