import { useEffect, useRef, useCallback } from 'react'
import { useInView } from 'react-intersection-observer'
import useSupabaseStore from '@/store/useSupabaseStore'

interface UseMessageVisibilityProps {
  threshold?: number
  rootMargin?: string
  triggerOnce?: boolean // Если true, срабатывает только один раз
}

export const useMessageVisibility = ({
  threshold = 0.3, // 30% видимости достаточно
  rootMargin = '0px 0px -100px 0px', // -100px снизу для предзагрузки
  triggerOnce = true // Сообщение помечается прочитанным только один раз
}: UseMessageVisibilityProps = {}) => {
  const hasBeenVisible = useRef(false)

  const { ref, inView, entry } = useInView({
    threshold,
    rootMargin,
    triggerOnce,
    // Отключаем для сообщений, которые уже были прочитаны
    skip: hasBeenVisible.current
  })

  // Обновляем состояние видимости
  useEffect(() => {
    if (inView && !hasBeenVisible.current) {
      hasBeenVisible.current = true
      console.log('👁️ Сообщение стало видимым:', entry?.target?.id?.slice(0, 8))
    }
  }, [inView, entry])

  // Сброс состояния при размонтировании
  useEffect(() => {
    return () => {
      hasBeenVisible.current = false
    }
  }, [])

  return {
    elementRef: ref,
    isVisible: inView,
    hasBeenVisible: hasBeenVisible.current,
    entry
  }
}

// Хук для отслеживания прочтения сообщений
interface UseMessageReadTrackingProps {
  messageId: string
  isOwn: boolean
  isVisible: boolean
  userId?: string
  chatId?: string
}

export const useMessageReadTracking = ({
  messageId,
  isOwn,
  isVisible,
  userId,
  chatId
}: UseMessageReadTrackingProps) => {
  const { supabase } = useSupabaseStore()
  const hasMarkedAsRead = useRef(false)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Дебаунсированная функция для пометки сообщения как прочитанное
  const markAsRead = useCallback(async () => {
    if (!messageId || !userId || isOwn || hasMarkedAsRead.current) return

    // Очищаем предыдущий таймер
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        console.log('👁️ Помечаем сообщение как прочитанное:', messageId.slice(0, 8))

        // Помечаем ТОЛЬКО это конкретное сообщение как прочитанное
        const { error } = await supabase
          .from('messages')
          .update({
            read_at: new Date().toISOString()
          })
          .eq('id', messageId)

        if (error) {
          console.warn('Ошибка при пометке сообщения как прочитанного:', error)
        } else {
          console.log('✅ Сообщение помечено как прочитанное:', messageId.slice(0, 8))
          hasMarkedAsRead.current = true
        }
      } catch (error) {
        console.warn('Ошибка при пометке сообщения как прочитанного:', error)
      }
    }, 1000) // 1 секунда задержки для уверенности в видимости
  }, [messageId, userId, isOwn, supabase])

  useEffect(() => {
    if (isVisible && !isOwn && !hasMarkedAsRead.current) {
      markAsRead()
    }
  }, [isVisible, isOwn, markAsRead])

  // Сброс при смене сообщения
  useEffect(() => {
    hasMarkedAsRead.current = false
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
  }, [messageId])

  // Очистка таймера при размонтировании
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])
}

// Хук для отслеживания видимости всех сообщений в чате
interface UseChatReadTrackingProps {
  chatId: string
  userId?: string
  messageIds: string[]
}

export const useChatReadTracking = ({
  chatId,
  userId,
  messageIds
}: UseChatReadTrackingProps) => {
  const { supabase } = useSupabaseStore()
  const hasMarkedChatAsRead = useRef(false)
  const visibleMessagesRef = useRef<Set<string>>(new Set())
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Дебаунсированная функция для пометки чата как прочитанного
  const markChatAsRead = useCallback(async () => {
    if (!chatId || !userId || hasMarkedChatAsRead.current || visibleMessagesRef.current.size === 0) return

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        console.log('📖 Marking chat as read (visibility-based):', chatId.slice(0, 8))

        const { data: updatedCount, error } = await supabase.rpc('mark_chat_as_read', {
          chat_uuid: chatId,
          user_uuid: userId
        })

        if (error) {
          console.warn('Ошибка при пометке чата как прочитанного:', error)
        } else {
          console.log('✅ Chat marked as read, updated messages:', updatedCount)
          hasMarkedChatAsRead.current = true
        }
      } catch (error) {
        console.warn('Ошибка при пометке чата как прочитанного:', error)
      }
    }, 1000) // 1 секунда задержки
  }, [chatId, userId, supabase])

  // Функция для уведомления о видимости сообщения
  const markMessageVisible = useCallback((messageId: string) => {
    visibleMessagesRef.current.add(messageId)
    markChatAsRead()
  }, [markChatAsRead])

  // Функция для уведомления о невидимости сообщения
  const markMessageHidden = useCallback((messageId: string) => {
    visibleMessagesRef.current.delete(messageId)
  }, [])

  // Сброс при смене чата
  useEffect(() => {
    hasMarkedChatAsRead.current = false
    visibleMessagesRef.current.clear()
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
  }, [chatId])

  // Сброс при изменении списка сообщений
  useEffect(() => {
    hasMarkedChatAsRead.current = false
  }, [messageIds.length])

  // Очистка таймера при размонтировании
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])

  return {
    markMessageVisible,
    markMessageHidden,
    visibleMessagesCount: visibleMessagesRef.current.size
  }
}
