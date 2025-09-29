'use client'

import { useState, useEffect } from 'react'
import useCallStore from '@/store/useCallStore'
import AuthForm from '@/components/Auth/AuthForm'
import { BannedUserOverlay } from '@/components/Admin'
import { useSoundNotifications } from '@/hooks/useSoundNotifications'
import ExternalLinkProvider from '@/components/Providers/ExternalLinkProvider'
import LoadingScreen from '@/components/Page/LoadingScreen'
import MainLayout from '@/components/Page/MainLayout'
import { useAuth } from '@/hooks/useAuth'
import { useUserStatus } from '@/hooks/useUserStatus'
import { useAppInitialization } from '@/hooks/useAppInitialization'

export default function Home() {
  const [isLoading, setIsLoading] = useState(true)
  const [resetChatTrigger, setResetChatTrigger] = useState(0)

  // 🔥 КРИТИЧЕСКИЙ DEBUG HOOK для мониторинга производительности (упрощенная версия)
  const debugStartTime = Date.now()

  const { isAuthenticated, user, error } = useCallStore()
  const { isBanned, isAdmin, setIsBanned } = useUserStatus()

  // Используем хук аутентификации
  const auth = useAuth()

  // Используем хук инициализации приложения
  const appInit = useAppInitialization()

  // Используем хук звуковых уведомлений
  const { setCurrentChat } = useSoundNotifications()

  // Устанавливаем isLoading в false после инициализации
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 100)
    return () => clearTimeout(timer)
  }, [])

  const handleLogoClick = () => {
    // Сбрасываем состояние к начальному виду - закрываем профиль и сбрасываем чаты
    setResetChatTrigger(prev => prev + 1) // Триггерим сброс состояния чатов
  }

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!isAuthenticated) {
    return (
      <ExternalLinkProvider>
        <AuthForm />
      </ExternalLinkProvider>
    )
  }

  // Если пользователь забанен, показываем экран бана
  if (isBanned) {
    return (
      <ExternalLinkProvider>
        <BannedUserOverlay
          onUnbanned={() => {
            setIsBanned(false)
            // Перезагружаем страницу для обновления состояния
            window.location.reload()
          }}
        />
      </ExternalLinkProvider>
    )
  }

  return (
    <ExternalLinkProvider>
      <MainLayout
        isAdmin={isAdmin}
        error={error}
        resetChatTrigger={resetChatTrigger}
        onCurrentChatChange={setCurrentChat}
        onSignOut={auth.handleSignOut}
        onLogoClick={handleLogoClick}
      />
    </ExternalLinkProvider>
  )
}