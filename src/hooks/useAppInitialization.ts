'use client'

import { useEffect } from 'react'
import useChatSyncStore from '@/store/useChatSyncStore'
import useCallStore from '@/store/useCallStore'
import { useGlobalTypingManager } from '@/hooks/useGlobalTypingManager'
import { useGlobalCallManager } from '@/hooks/useGlobalCallManager'
import useCallStateSynchronizer from '@/hooks/useCallStateSynchronizer'
import { useSoundNotifications } from '@/hooks/useSoundNotifications'
import { logEnvironment, validateSupabaseConfig } from '@/utils/debug'

export function useAppInitialization() {
  const { startGlobalSync, stopGlobalSync, registerSoundNotificationCallback } = useChatSyncStore()
  const { isAuthenticated, user } = useCallStore()

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
  const { maybePlayNotification, soundLoaded, userHasInteracted } = useSoundNotifications()

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

  return {
    isGlobalCallManagerActive,
    isStateSyncActive
  }
}
