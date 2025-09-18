'use client'

import { useEffect } from 'react'
import { globalTypingManager } from '@/lib/GlobalTypingManager'
import useCallStore from '@/store/useCallStore'

export const useGlobalTypingManager = () => {
  const { userId } = useCallStore()

  useEffect(() => {
    if (!userId) return

    console.log('🌐 [useGlobalTypingManager] Инициализируем глобальный typing менеджер')
    globalTypingManager.initialize(userId)

    // Очистка при размонтировании приложения
    return () => {
      console.log('🌐 [useGlobalTypingManager] Очистка глобального typing менеджера')
      globalTypingManager.cleanup()
    }
  }, [userId])
}

