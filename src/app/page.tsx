'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import useSupabaseStore from '@/store/useSupabaseStore'
import useChatSyncStore from '@/store/useChatSyncStore'
import useCallStore from '@/store/useCallStore'
import AuthForm from '@/components/Auth/AuthForm'
import CallInterface from '@/components/Call/CallInterface'
import { UserProfile } from '@/components/Profile'
import { getAssetPath } from '@/lib/utils'
import OptimizedImage from '@/components/ui/OptimizedImage'
import { ThemeToggler } from '@/components/ui/theme-toggler'
import { logEnvironment, validateSupabaseConfig } from '@/utils/debug'
import { useGlobalTypingManager } from '@/hooks/useGlobalTypingManager'
import { useGlobalCallManager } from '@/hooks/useGlobalCallManager'
import useCallStateSynchronizer from '@/hooks/useCallStateSynchronizer'
import { useSoundNotifications } from '@/hooks/useSoundNotifications'
import { User } from 'lucide-react'

export default function Home() {
  const [isLoading, setIsLoading] = useState(true)
  const [showProfile, setShowProfile] = useState(false)
  const [resetChatTrigger, setResetChatTrigger] = useState(0)
  
  // 🔥 КРИТИЧЕСКИЙ DEBUG HOOK для мониторинга производительности (упрощенная версия)
  const debugStartTime = Date.now()
  const { supabase } = useSupabaseStore()
  const { startGlobalSync, stopGlobalSync, registerSoundNotificationCallback } = useChatSyncStore()
  
  const {
    isAuthenticated,
    user,
    setUser,
    setUserId,
    setAuthenticated,
    resetAll,
    error
  } = useCallStore()

  // Инициализируем глобальный typing менеджер
  useGlobalTypingManager()

  // Инициализируем глобальный менеджер звонков
  const { isGlobalCallManagerActive } = useGlobalCallManager({
    isAuthenticated,
    userId: user?.id || null
  })

  // Инициализируем синхронизатор состояний звонков
  const { isStateSyncActive } = useCallStateSynchronizer({
    isAuthenticated,
    userId: user?.id || null
  })

  // Инициализируем систему звуковых уведомлений
  const { maybePlayNotification, setCurrentChat, soundLoaded, userHasInteracted } = useSoundNotifications()

  // Интегрируем звуковые уведомления с глобальной системой
  useEffect(() => {
    // Debug environment in production
    logEnvironment()
    validateSupabaseConfig()
    
    if (!isAuthenticated || !user?.id) return

    console.log('🔊 Sound notification state:', {
      soundLoaded,
      userHasInteracted,
      isAuthenticated,
      userId: user?.id?.slice(0, 8)
    })

    // Регистрируем колбэк сразу при аутентификации, независимо от других условий
    // maybePlayNotification сам проверит условия внутри
    console.log('🔊 Регистрация звуковых уведомлений')

    const unsubscribe = registerSoundNotificationCallback((messageData) => {
      console.log('🔊 Получено уведомление о новом сообщении:', {
        chatId: messageData.chatId?.slice(0, 8),
        senderId: messageData.senderId?.slice(0, 8),
        content: messageData.content?.slice(0, 50),
        soundLoaded,
        userHasInteracted
      })
      
      maybePlayNotification(messageData)
    })

    return unsubscribe
  }, [isAuthenticated, user?.id, registerSoundNotificationCallback, maybePlayNotification])

  // Логирование состояния глобального менеджера звонков
  useEffect(() => {
    console.log('🌐 Page: Global call manager state:', {
      isAuthenticated,
      userId: user?.id?.slice(0, 8),
      isGlobalCallManagerActive,
      isStateSyncActive,
      timestamp: new Date().toISOString()
    })
  }, [isAuthenticated, user?.id, isGlobalCallManagerActive, isStateSyncActive])

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

  // 🔥 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: НЕМЕДЛЕННЫЙ запуск синхронизации с детальной отладкой
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      const syncStartTime = performance.now()
      console.log('🌐🔥 НЕМЕДЛЕННЫЙ запуск глобальной синхронизации чатов в:', new Date().toLocaleTimeString())
      console.time('startGlobalSync_page_auth')
      
      // DEBUG: Логируем начало запуска
      console.log('🔥 DEBUG: Запуск глобальной синхронизации для пользователя:', user.id.slice(0, 8))
      
      // НЕМЕДЛЕННЫЙ запуск без задержек
      startGlobalSync()
      
      console.timeEnd('startGlobalSync_page_auth')
      const initTime = Math.round(performance.now() - syncStartTime)
      console.log('🌐✅ Глобальная синхронизация запущена за:', initTime, 'мс')
      console.log('🔥 DEBUG: Глобальная синхронизация запущена за:', initTime, 'мс')
    } else {
      console.log('🌐 Остановка глобальной синхронизации чатов')
      stopGlobalSync()
      console.log('🔥 DEBUG: Глобальная синхронизация остановлена')
    }

    return () => {
      stopGlobalSync()
    }
  }, [isAuthenticated, user?.id, startGlobalSync, stopGlobalSync])

  // Убрали дублирующую регистрацию звуковых уведомлений (регистрация выше при аутентификации)

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      resetAll()
    } catch (err) {
      console.error('Error signing out:', err)
    }
  }

  const handleLogoClick = () => {
    // Сбрасываем состояние к начальному виду - закрываем профиль и сбрасываем чаты
    setShowProfile(false)
    setResetChatTrigger(prev => prev + 1) // Триггерим сброс состояния чатов
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
              <OptimizedImage
                src="/logo.webp"
                alt="Позвони.мне логотип"
                width={32}
                height={32}
                className="mr-2 select-none"
                priority
                quality={95}
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
              />
              <h1
                className="text-lg font-semibold text-foreground hover:text-primary hover:ring-2 hover:ring-primary/30 dark:hover:ring-primary/50 hover:ring-offset-1 transition-all duration-200 cursor-pointer rounded px-2 py-1"
                onClick={handleLogoClick}
              >
                Позвони.мне
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              <ThemeToggler />
              <button
                onClick={() => setShowProfile(true)}
                className="p-2 rounded-md profile-button hover:bg-secondary/80 hover:ring-2 hover:ring-secondary/60 dark:hover:bg-gray-600 dark:hover:ring-gray-300 transition-all duration-200 border border-border cursor-pointer"
                aria-label="Открыть профиль"
              >
                <User className="h-5 w-5 text-foreground" />
              </button>
              <button
                onClick={handleSignOut}
                className="text-sm logout-button text-primary hover:text-primary/80 hover:bg-primary/10 hover:ring-1 hover:ring-primary/30 dark:hover:bg-gray-600 dark:hover:ring-gray-300 transition-all duration-200 px-3 py-1 rounded cursor-pointer"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Error Display - не показываем специальную ошибку для визуального изменения цвета */}
      {error && error !== 'CALL_REJECTED_VISUAL' && (
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
        <CallInterface 
          resetChatTrigger={resetChatTrigger}
          onCurrentChatChange={setCurrentChat}
        />
      </main>

      {/* Profile Modal */}
      {showProfile && (
        <UserProfile onClose={() => setShowProfile(false)} />
      )}

      
    </div>
  )
}