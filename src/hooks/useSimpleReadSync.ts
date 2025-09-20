import { useEffect, useRef, useCallback } from 'react'
import useSupabaseStore from '@/store/useSupabaseStore'
import useChatSyncStore from '@/store/useChatSyncStore'

interface UseSimpleReadSyncProps {
  userId?: string
  isActive?: boolean
}

export const useSimpleReadSync = ({ userId, isActive = true }: UseSimpleReadSyncProps) => {
  const { supabase } = useSupabaseStore()
  const { refreshChatList } = useChatSyncStore()
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastUpdateRef = useRef<string>('')

  // Дебаунсированное обновление списка чатов
  const debouncedRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }
    
    refreshTimeoutRef.current = setTimeout(() => {
      console.log('🔄 Refreshing chat list due to read status change (debounced)')
      refreshChatList()
    }, 2000) // 2 секунды задержки
  }, [refreshChatList])

  // Обработчик изменений статуса прочтения
  const handleReadStatusChange = useCallback((payload: any) => {
    if (!payload.new?.read_at) return
    
    const updateKey = `${payload.new.id}-${payload.new.read_at}`
    
    // Предотвращаем дублирование обновлений
    if (lastUpdateRef.current === updateKey) return
    lastUpdateRef.current = updateKey
    
    console.log('📖 Message read status changed:', payload.new.id?.slice(0, 8))
    
    // Обновляем список чатов с задержкой
    debouncedRefresh()
  }, [debouncedRefresh])

  useEffect(() => {
    if (!userId || !isActive) return

    console.log('📡 Setting up simple read status sync for user:', userId.slice(0, 8))

    // Подписываемся только на изменения read_at
    const readStatusChannel = supabase
      .channel(`read_status_${userId}`)
      .on('postgres_changes', 
        { 
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `read_at=neq.null`
        }, 
        handleReadStatusChange
      )
      .subscribe()

    return () => {
      console.log('📡 Cleaning up simple read status sync')
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
      supabase.removeChannel(readStatusChannel)
    }
  }, [userId, isActive, supabase, handleReadStatusChange])
}
