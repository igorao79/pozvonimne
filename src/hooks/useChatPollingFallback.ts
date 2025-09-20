'use client'

/**
 * Fallback система polling для чатов при сбоях realtime
 * Автоматически переключается на опрос базы данных когда realtime не работает
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import useSupabaseStore from '@/store/useSupabaseStore'

interface UseChatPollingFallbackProps {
  chatId: string
  userId: string | null
  isActive: boolean
  onNewMessage: (message: any) => void
  isRealtimeHealthy: boolean // Здоровье realtime соединения
}

interface PollingState {
  isPolling: boolean
  interval: number
  lastMessageId: string | null
  lastPollTime: number
  consecutiveErrors: number
  messagesReceived: number
}

export const useChatPollingFallback = ({
  chatId,
  userId,
  isActive,
  onNewMessage,
  isRealtimeHealthy
}: UseChatPollingFallbackProps) => {
  const { supabase } = useSupabaseStore()
  const [pollingActive, setPollingActive] = useState(false)
  
  const pollingStateRef = useRef<PollingState>({
    isPolling: false,
    interval: 3000, // Начинаем с 3 секунд
    lastMessageId: null,
    lastPollTime: 0,
    consecutiveErrors: 0,
    messagesReceived: 0
  })
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Получение новых сообщений через API
  const pollMessages = useCallback(async () => {
    if (!userId || !isActive) return

    const state = pollingStateRef.current
    const now = Date.now()

    try {
      console.log('📊 PollingFallback: Polling messages for chat', {
        chatId: chatId.slice(0, 8),
        lastMessageId: state.lastMessageId?.slice(0, 8),
        interval: state.interval
      })

      // Получаем сообщения после последнего известного
      const query = supabase
        .from('messages')
        .select(`
          id,
          content,
          sender_id,
          chat_id,
          created_at,
          updated_at,
          is_edited,
          is_deleted,
          message_type
        `)
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })
        .limit(50)

      // Если есть последнее сообщение, получаем только новые
      if (state.lastMessageId) {
        query.gt('created_at', new Date(state.lastPollTime).toISOString())
      } else {
        // Первый запрос - получаем последние 10 сообщений
        query.limit(10)
      }

      const { data: messages, error } = await query

      if (error) {
        console.error('❌ PollingFallback: Error polling messages:', error)
        state.consecutiveErrors++
        
        // Увеличиваем интервал при ошибках
        if (state.consecutiveErrors >= 3) {
          state.interval = Math.min(30000, state.interval * 1.5) // Максимум 30 секунд
        }
        return
      }

      // Сбрасываем ошибки при успехе
      state.consecutiveErrors = 0
      state.lastPollTime = now

      if (messages && messages.length > 0) {
        console.log(`✅ PollingFallback: Received ${messages.length} new messages`, {
          chatId: chatId.slice(0, 8),
          messageIds: messages.map(m => m.id.slice(0, 8))
        })

        // Обрабатываем каждое новое сообщение
        messages.forEach((message) => {
          // Пропускаем собственные сообщения чтобы избежать дублирования
          if (message.sender_id !== userId) {
            onNewMessage(message)
          }
          state.lastMessageId = message.id
        })

        state.messagesReceived += messages.length

        // Уменьшаем интервал если получаем сообщения активно
        if (messages.length > 1) {
          state.interval = Math.max(2000, state.interval * 0.8) // Минимум 2 секунды
        }
      } else {
        // Увеличиваем интервал если нет новых сообщений
        state.interval = Math.min(10000, state.interval * 1.1) // Максимум 10 секунд при отсутствии активности
      }

    } catch (error) {
      console.error('💥 PollingFallback: Critical polling error:', error)
      state.consecutiveErrors++
      state.interval = Math.min(30000, state.interval * 2)
    }
  }, [chatId, userId, isActive, onNewMessage, supabase])

  // Старт polling
  const startPolling = useCallback(() => {
    if (pollingStateRef.current.isPolling) return

    console.log('🚀 PollingFallback: Starting polling fallback for chat', chatId.slice(0, 8))
    
    pollingStateRef.current.isPolling = true
    pollingStateRef.current.interval = 3000 // Сброс интервала
    pollingStateRef.current.consecutiveErrors = 0
    pollingStateRef.current.messagesReceived = 0
    setPollingActive(true)

    // Первый запрос сразу
    pollMessages()

    // Настройка повторяющихся запросов
    const scheduleNextPoll = () => {
      pollingIntervalRef.current = setTimeout(() => {
        if (pollingStateRef.current.isPolling) {
          pollMessages().finally(() => {
            if (pollingStateRef.current.isPolling) {
              scheduleNextPoll()
            }
          })
        }
      }, pollingStateRef.current.interval)
    }

    scheduleNextPoll()
  }, [chatId, pollMessages])

  // Остановка polling
  const stopPolling = useCallback(() => {
    if (!pollingStateRef.current.isPolling) return

    console.log('🛑 PollingFallback: Stopping polling fallback for chat', {
      chatId: chatId.slice(0, 8),
      messagesReceived: pollingStateRef.current.messagesReceived
    })

    pollingStateRef.current.isPolling = false
    setPollingActive(false)

    if (pollingIntervalRef.current) {
      clearTimeout(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
  }, [chatId])

  // Автоматическое переключение между realtime и polling
  useEffect(() => {
    if (!userId || !isActive) {
      stopPolling()
      return
    }

    const shouldUsePolling = !isRealtimeHealthy

    if (shouldUsePolling && !pollingStateRef.current.isPolling) {
      console.warn('⚠️ PollingFallback: Realtime unhealthy, switching to polling mode')
      startPolling()
    } else if (!shouldUsePolling && pollingStateRef.current.isPolling) {
      console.log('✅ PollingFallback: Realtime recovered, switching back from polling mode')
      stopPolling()
    }
  }, [userId, isActive, isRealtimeHealthy, startPolling, stopPolling])

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      stopPolling()
    }
  }, [stopPolling])

  // Принудительная синхронизация
  const forcePoll = useCallback(() => {
    if (userId && isActive) {
      console.log('🔄 PollingFallback: Force polling messages')
      pollMessages()
    }
  }, [userId, isActive, pollMessages])

  return {
    isPollingActive: pollingActive,
    pollingInterval: pollingStateRef.current.interval,
    forcePoll,
    startPolling,
    stopPolling,
    getPollingStats: () => ({
      messagesReceived: pollingStateRef.current.messagesReceived,
      consecutiveErrors: pollingStateRef.current.consecutiveErrors,
      lastPollTime: pollingStateRef.current.lastPollTime
    })
  }
}

export default useChatPollingFallback
