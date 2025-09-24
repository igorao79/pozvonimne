'use client'

/**
 * 🔥 РАДИКАЛЬНОЕ ИСПРАВЛЕНИЕ: ГЛОБАЛЬНЫЙ STORE
 * Используем существующую глобальную синхронизацию вместо сложных прямых подписок
 */

import { useEffect, useCallback } from 'react'
import useChatSyncStore from '@/store/useChatSyncStore'

interface UseChatListRealtimeProps {
  userId?: string | null
  onChatUpdate: () => void
}

export const useChatListRealtime = ({
  userId,
  onChatUpdate
}: UseChatListRealtimeProps) => {
  // 🔥 РАДИКАЛЬНОЕ ИСПРАВЛЕНИЕ: Используем ГЛОБАЛЬНЫЙ STORE вместо прямых подписок!
  const { lastMessageUpdate, registerRefreshCallback, isGlobalSyncActive } = useChatSyncStore()

  const stableCallback = useCallback(() => {
    console.log('🔥 ГЛОБАЛЬНЫЙ STORE: Получен сигнал обновления ChatList')
    onChatUpdate()
  }, [onChatUpdate])

  // 🔥 ПОДКЛЮЧАЕМСЯ к глобальному store (он УЖЕ работает!)
  useEffect(() => {
    if (!userId || !isGlobalSyncActive) {
      console.log('🔥 ГЛОБАЛЬНЫЙ STORE: userId отсутствует или sync неактивен')
      return
    }

    console.log('🔥 ГЛОБАЛЬНЫЙ STORE: Регистрируем callback для ChatList')
    console.log('🔍 ГЛОБАЛЬНЫЙ STORE: userId:', userId.slice(0, 8))
    
    // Регистрируем наш callback в глобальном store
    const unregister = registerRefreshCallback(stableCallback)
    
    console.log('🎉 ГЛОБАЛЬНЫЙ STORE: ChatList подключен к глобальной синхронизации!')

    return () => {
      console.log('🔥 ГЛОБАЛЬНЫЙ STORE: Отключаем ChatList от глобальной синхронизации')
      unregister()
    }
  }, [userId, isGlobalSyncActive, registerRefreshCallback, stableCallback])

  // 🔥 ПРИНУДИТЕЛЬНОЕ ОБНОВЛЕНИЕ при изменении lastMessageUpdate
  useEffect(() => {
    if (lastMessageUpdate && userId) {
      console.log('🔥 ГЛОБАЛЬНЫЙ STORE: Принудительное обновление ChatList')
      console.log('🔍 ГЛОБАЛЬНЫЙ STORE: lastMessageUpdate:', lastMessageUpdate)
      stableCallback()
    }
  }, [lastMessageUpdate, userId, stableCallback])
}