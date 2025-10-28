'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import useCallStore from '@/store/useCallStore'
import useSupabaseStore from '@/store/useSupabaseStore'
import useChatActions from '@/hooks/useChatActions'

interface UseChatArchiveReturn {
  refreshChatList: () => Promise<void>
  isLoading: boolean
}

export const useChatArchive = (): UseChatArchiveReturn => {
  const { userId } = useCallStore()
  const { supabase } = useSupabaseStore()
  const { archiveChat, deleteChatForSelf } = useChatActions()
  const [isLoading, setIsLoading] = useState(false)
  const realtimeChannelRef = useRef<any>(null)

  // Функция для принудительного обновления списка чатов
  const refreshChatList = useCallback(async () => {
    if (!userId || !supabase) {
      return
    }

    try {
      setIsLoading(true)
      console.log('🗂️ Принудительное обновление списка чатов из-за изменения архива/удаления')

      // Имитируем обновление через глобальный store
      // Это вызовет перезагрузку чатов во всех компонентах ChatList
      window.dispatchEvent(new CustomEvent('chatArchiveChanged', {
        detail: { userId, timestamp: Date.now() }
      }))

    } catch (error) {
      console.error('🗂️ Ошибка принудительного обновления:', error)
    } finally {
      setIsLoading(false)
    }
  }, [userId, supabase])

// Realtime подписка временно отключена - используем только оптимистичные обновления
// TODO: Восстановить realtime после исправления Supabase конфигурации

  return {
    refreshChatList,
    isLoading
  }
}

export default useChatArchive

