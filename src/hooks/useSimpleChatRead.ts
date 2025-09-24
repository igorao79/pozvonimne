import { useEffect, useRef } from 'react'
import useSupabaseStore from '@/store/useSupabaseStore'
import useChatSyncStore from '@/store/useChatSyncStore'

interface UseSimpleChatReadProps {
  chatId: string
  userId?: string
  isActive?: boolean
}

export const useSimpleChatRead = ({ chatId, userId, isActive = true }: UseSimpleChatReadProps) => {
  const { supabase } = useSupabaseStore()
  const { refreshChatList } = useChatSyncStore()
  const hasMarkedAsRead = useRef(false)

  useEffect(() => {
    if (!userId || !chatId || !isActive) return
    if (hasMarkedAsRead.current) return

    const markChatAsRead = async () => {
      try {
        console.log('📖 Marking chat as read:', chatId.slice(0, 8))
        
        const { data: updatedCount, error } = await supabase.rpc('mark_chat_as_read', {
          chat_uuid: chatId,
          user_uuid: userId
        })

        if (error) {
          console.error('Ошибка при пометке чата как прочитанного:', error)
        } else {
          console.log('✅ Chat marked as read, updated messages:', updatedCount)
          hasMarkedAsRead.current = true

          // 🔥 ОБНОВЛЕНИЕ: Отправляем сигнал обновления для ChatList после прочтения чата
          console.log('📖 Отправляем сигнал обновления ChatList после прочтения чата')
          refreshChatList()
        }
      } catch (error) {
        console.error('Ошибка при пометке чата как прочитанного:', error)
      }
    }

    // Небольшая задержка чтобы чат успел загрузиться
    const timer = setTimeout(() => {
      markChatAsRead()
    }, 1000)

    return () => clearTimeout(timer)
  }, [chatId, userId, isActive, supabase])

  // Сброс флага при смене чата
  useEffect(() => {
    hasMarkedAsRead.current = false
  }, [chatId])
}



