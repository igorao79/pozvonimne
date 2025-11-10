'use client'

import { useEffect } from 'react'
import useCustomThemeStore from '@/store/useCustomThemeStore'
import useCallStore from '@/store/useCallStore'

export function useThemeInitialization() {
  const { isAuthenticated, user } = useCallStore()
  const { loadCustomTheme, startRealtimeSync, stopRealtimeSync } = useCustomThemeStore()

  // Загружаем кастомную тему и запускаем realtime sync при входе пользователя
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      console.log('🎨 Загружаем кастомную тему для пользователя:', user.id.slice(0, 8))
      loadCustomTheme(user.id)

      // Запускаем realtime синхронизацию темы
      console.log('🎨 Запускаем realtime синхронизацию темы')
      startRealtimeSync(user.id)
    } else {
      // Останавливаем realtime sync при выходе
      stopRealtimeSync()
    }

    // Cleanup при размонтировании
    return () => {
      stopRealtimeSync()
    }
  }, [isAuthenticated, user?.id, loadCustomTheme, startRealtimeSync, stopRealtimeSync])

  return {
    // Можно добавить дополнительные методы если нужно
  }
}
