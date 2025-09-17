import { useEffect } from 'react'
import useSupabaseStore from '@/store/useSupabaseStore'

interface UseChatRealtimeProps {
  chatId: string
  userId?: string
  otherParticipantId?: string
  onNewMessage: (payload: any) => void
  loadMessages: () => Promise<void>
}

export const useChatRealtime = ({
  chatId,
  userId,
  otherParticipantId,
  onNewMessage,
  loadMessages
}: UseChatRealtimeProps) => {
  const { supabase } = useSupabaseStore()

  // Оптимизированная подписка на изменения пользователей
  useEffect(() => {
    if (!otherParticipantId) return

    console.log('📡 Настраиваем realtime подписку на изменения пользователей в чате')

    // Уникальное имя канала
    const channelName = `chat_user_status_${chatId.substring(0, 8)}`

    // Очищаем существующие каналы для статуса пользователей
    const existingChannels = supabase.getChannels().filter(ch => ch.topic.includes('user_status'))
    existingChannels.forEach(ch => supabase.removeChannel(ch))

    const userChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_profiles',
          filter: `id=eq.${otherParticipantId}` // Фильтр только для собеседника
        },
        (payload) => {
          console.log('👤 Изменение статуса собеседника:', payload)
          // Обновления статуса будут обрабатываться через useUsers хук
        }
      )
      .subscribe((status) => {
        console.log('📡 Статус подписки на изменения пользователей:', status)
      })

    return () => {
      console.log('🔌 Отписываемся от изменений пользователей')
      supabase.removeChannel(userChannel)
    }
  }, [otherParticipantId, chatId, supabase])

  // Оптимизированная подписка на новые сообщения
  useEffect(() => {
    if (!chatId || !userId) return

    console.log('📡 Подписываемся на сообщения чата:', chatId)

    let isPollingMode = false
    let pollInterval: NodeJS.Timeout

    const setupMessageSubscription = () => {
      if (isPollingMode) return

      // Создаем стабильное имя канала
      const channelName = `chat_${chatId}_messages`

      // Очищаем все существующие каналы для этого чата
      const existingChannels = supabase.getChannels().filter(ch => ch.topic.includes(chatId))
      existingChannels.forEach(ch => supabase.removeChannel(ch))

      console.log('📡 Создаем новый канал для чата:', chatId)

      // Создаем новый канал с улучшенной обработкой
      const messagesChannel = supabase
        .channel(channelName)
        .on('postgres_changes',
          {
            event: 'INSERT', // Только INSERT для новых сообщений
            schema: 'public',
            table: 'messages',
            filter: `chat_id=eq.${chatId}` // Фильтр по chat_id
          },
          (payload: any) => {
            console.log('📡 Новое сообщение в чате:', payload)
            onNewMessage(payload.new)
          }
        )
        .subscribe((status, err) => {
          console.log('📡 Статус канала сообщений:', status, err ? `Ошибка: ${err}` : '')

          if (status === 'SUBSCRIBED') {
            console.log('📡 Успешно подписались на сообщения чата:', chatId)
            isPollingMode = false
          } else if (status === 'CHANNEL_ERROR') {
            console.error('📡 Ошибка канала сообщений:', err)

            console.log('🚨 CRITICAL REALTIME ERROR - Переключаемся на polling')

            supabase.removeChannel(messagesChannel)
            isPollingMode = true

            // Включаем режим polling
            pollInterval = setInterval(async () => {
              try {
                await loadMessages()
                console.log('📊 POLLING MODE - Сообщения обновлены')
              } catch (error) {
                console.error('📊 POLLING ERROR:', error)
              }
            }, 3000)

            console.log('📊 SWITCHED TO POLLING MODE')
          } else if (status === 'TIMED_OUT') {
            console.warn('📡 Таймаут канала сообщений, переподключение...')
            setTimeout(setupMessageSubscription, 2000)
          } else if (status === 'CLOSED') {
            console.log('📡 Канал сообщений закрыт')
          }
        })

      return messagesChannel
    }

    const channel = setupMessageSubscription()

    return () => {
      console.log('📡 Компонент размонтирован, закрываем канал сообщений для чата:', chatId)

      if (channel) {
        supabase.removeChannel(channel)
      }

      if (pollInterval) {
        clearInterval(pollInterval)
        console.log('📊 POLLING CLEARED - Очистили polling интервал')
      }
    }
  }, [chatId, userId, onNewMessage, loadMessages, supabase])
}
