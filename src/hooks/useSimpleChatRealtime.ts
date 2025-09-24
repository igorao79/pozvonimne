import { useEffect, useRef } from 'react'
import useSupabaseStore from '@/store/useSupabaseStore'
import useChatSyncStore from '@/store/useChatSyncStore'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface UseSimpleChatRealtimeProps {
  chatId: string
  userId?: string
  onNewMessage: (payload: any) => void
}

/**
 * Простая версия real-time подписки на чат без сложной логики переподключений
 * Используется как альтернатива useChatRealtime при проблемах с ResilientChannelManager
 */
export const useSimpleChatRealtime = ({
  chatId,
  userId,
  onNewMessage
}: UseSimpleChatRealtimeProps) => {
  const { supabase } = useSupabaseStore()
  const { refreshChatList } = useChatSyncStore()
  const channelRef = useRef<RealtimeChannel | null>(null)
  const currentChatIdRef = useRef<string>(chatId)

  // Обновляем ref при изменении chatId
  useEffect(() => {
    console.log('🔄 [SimpleChatRealtime] Обновляем текущий chatId:', chatId.slice(0, 8))
    currentChatIdRef.current = chatId
  }, [chatId])

  // Основная подписка на сообщения
  useEffect(() => {
    if (!userId || !chatId) return

    console.log('📡 [SimpleChatRealtime] Создаем простую подписку на сообщения для чата:', chatId.slice(0, 8))

    // Очищаем предыдущий канал
    if (channelRef.current) {
      console.log('🧹 [SimpleChatRealtime] Очищаем предыдущий канал')
      channelRef.current.unsubscribe()
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    // Создаем новый канал
    const channelName = `simple_chat_${chatId.substring(0, 8)}_${Date.now()}`
    const channel = supabase.channel(channelName)

    // Подписка на INSERT сообщений
    channel
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`
        },
        (payload: any) => {
          console.log('📨 [SimpleChatRealtime] Новое сообщение:', payload.new.id?.slice(0, 8))
          
          // Проверяем что сообщение для текущего чата
          if (payload.new.chat_id !== currentChatIdRef.current) {
            console.log('🚫 [SimpleChatRealtime] Сообщение не для текущего чата, игнорируем')
            return
          }

          onNewMessage(payload.new)
          refreshChatList()
        }
      )
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`
        },
        (payload: any) => {
          console.log('📝 [SimpleChatRealtime] Обновление сообщения:', payload.new.id?.slice(0, 8))
          
          // Проверяем что обновление для текущего чата
          if (payload.new.chat_id !== currentChatIdRef.current) {
            console.log('🚫 [SimpleChatRealtime] Обновление не для текущего чата, игнорируем')
            return
          }

          onNewMessage({
            ...payload.new,
            _isUpdate: true,
            _oldRecord: payload.old
          })
        }
      )
      .subscribe((status) => {
        console.log('📡 [SimpleChatRealtime] Статус подписки:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ [SimpleChatRealtime] Успешно подписались на чат:', chatId.slice(0, 8))
        } else if (status === 'CLOSED') {
          console.warn('⚠️ [SimpleChatRealtime] Подписка закрыта для чата:', chatId.slice(0, 8))
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ [SimpleChatRealtime] Ошибка канала для чата:', chatId.slice(0, 8))
        }
      })

    channelRef.current = channel

    return () => {
      console.log('🧹 [SimpleChatRealtime] Очистка при размонтировании для чата:', chatId.slice(0, 8))
      if (channelRef.current) {
        channelRef.current.unsubscribe()
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [userId, chatId, onNewMessage, refreshChatList, supabase])

  return {
    isConnected: channelRef.current?.state === 'joined'
  }
}
