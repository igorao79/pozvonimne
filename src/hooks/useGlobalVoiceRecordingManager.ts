'use client'

import { useEffect, useState } from 'react'
import { globalVoiceRecordingManager } from '@/lib/GlobalVoiceRecordingManager'
import useCallStore from '@/store/useCallStore'

interface UseGlobalVoiceRecordingManagerReturn {
  isGlobalVoiceRecordingManagerActive: boolean
  managerStats: {
    isInitialized: boolean
    subscriptionsCount: number
    timeoutsCount: number
  }
}

export const useGlobalVoiceRecordingManager = (): UseGlobalVoiceRecordingManagerReturn => {
  const { userId } = useCallStore()
  const [isActive, setIsActive] = useState(false)
  const [stats, setStats] = useState({
    isInitialized: false,
    subscriptionsCount: 0,
    timeoutsCount: 0
  })

  console.log('🎯 [useGlobalVoiceRecordingManager] Хук вызван с userId:', userId)

  useEffect(() => {
    if (!userId) return

    console.log('🚀 [useGlobalVoiceRecordingManager] Инициализируем глобальный менеджер записи голоса с userId:', userId)
    
    globalVoiceRecordingManager.initialize(userId)
      .then(() => {
        setIsActive(true)
        setStats(globalVoiceRecordingManager.getStats())
        console.log('✅ [useGlobalVoiceRecordingManager] Глобальный менеджер записи голоса активен')
      })
      .catch((error) => {
        console.error('❌ [useGlobalVoiceRecordingManager] Ошибка инициализации:', error)
        setIsActive(false)
      })

    // Очистка при размонтировании
    return () => {
      console.log('🛑 [useGlobalVoiceRecordingManager] Очистка глобального менеджера записи голоса')
      globalVoiceRecordingManager.cleanup()
    }

  }, [userId])

  // Обновляем статистику периодически
  useEffect(() => {
    if (!isActive) return

    const statsInterval = setInterval(() => {
      setStats(globalVoiceRecordingManager.getStats())
    }, 5000)

    return () => clearInterval(statsInterval)
  }, [isActive])

  return {
    isGlobalVoiceRecordingManagerActive: isActive,
    managerStats: stats
  }
}
