import { useEffect } from 'react'
import useSupabaseStore from '@/store/useSupabaseStore'
import { resilientChannelManager } from '@/utils/resilientChannelManager'

interface UseChatRealtimeProps {
  chatId: string
  userId?: string
  otherParticipantId?: string
  onNewMessage: (payload: any) => void
}

export const useChatRealtime = ({
  chatId,
  userId,
  otherParticipantId,
  onNewMessage
}: UseChatRealtimeProps) => {
  const { supabase, cleanupChannels } = useSupabaseStore()

  // Оптимизированная подписка на изменения пользователей (ТОЛЬКО если есть собеседник)
  useEffect(() => {
    if (!otherParticipantId || !userId) return

    console.log('📡 Настраиваем realtime подписку на изменения пользователей в чате')

    // Очищаем СТАРЫЕ каналы этого типа перед созданием нового
    const existingUserStatusChannels = supabase.getChannels().filter(ch =>
      ch.topic.includes('chat_user_status_') && ch.topic !== `chat_user_status_${chatId.substring(0, 8)}`
    )
    existingUserStatusChannels.forEach(ch => {
      console.log('🧹 Очищаем старый канал статуса:', ch.topic)
      supabase.removeChannel(ch)
    })

    // Создаем устойчивый канал для статуса пользователя
    const channelName = `chat_user_status_${chatId.substring(0, 8)}`
    
    resilientChannelManager.createResilientChannel({
      channelName,
      setup: (channel) => {
        return channel.on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'user_profiles',
            filter: `id=eq.${otherParticipantId}` // Фильтр только для собеседника
          },
          (payload: any) => {
            console.log('👤 Изменение статуса собеседника:', payload)
            // Обновления статуса будут обрабатываться через useUsers хук
          }
        )
      },
      onSubscribed: () => {
        console.log('📡 Успешно подписались на устойчивый канал статуса пользователя')
      },
      onError: (error) => {
        console.error('📡 Ошибка устойчивого канала статуса пользователя:', error)
      },
      maxReconnectAttempts: 8,
      reconnectDelay: 2000,
      keepAliveInterval: 25000, // Keep-alive каждые 25 секунд
      healthCheckInterval: 45000 // Проверка здоровья каждые 45 секунд
    }).catch(error => {
      console.error('📡 Не удалось создать устойчивый канал статуса пользователя:', error)
    })

    return () => {
      // Удаляем устойчивый канал при размонтировании
      resilientChannelManager.removeChannel(channelName)
    }
  }, [otherParticipantId, chatId, userId, supabase])


  // Глобальная подписка на все изменения сообщений (ТОЛЬКО ОДНА НА ПОЛЬЗОВАТЕЛЯ)
  useEffect(() => {
    if (!userId) return

    // Уникальное имя глобального канала для этого пользователя
    const globalChannelName = `global_messages_${userId}`

    // Проверяем, существует ли уже глобальный канал для этого пользователя
    const existingGlobalChannel = supabase.getChannels().find(ch => ch.topic === globalChannelName)

    if (existingGlobalChannel) {
      console.log('🌍 Глобальный канал уже существует:', globalChannelName)
      return // Не создаем дублированный канал
    }

    console.log('🌍 Создаем глобальную подписку на все сообщения для пользователя:', userId)

    // Очищаем СТАРЫЕ глобальные каналы этого пользователя (если есть с другим userId)
    const oldGlobalChannels = supabase.getChannels().filter(ch =>
      ch.topic.includes('global_messages_') && ch.topic !== globalChannelName
    )
    oldGlobalChannels.forEach(ch => {
      console.log('🧹 Очищаем старый глобальный канал:', ch.topic)
      supabase.removeChannel(ch)
    })

    resilientChannelManager.createResilientChannel({
      channelName: globalChannelName,
      setup: (channel) => {
        return channel
          .on('postgres_changes',
            {
              event: 'INSERT', // Все новые сообщения в системе
              schema: 'public',
              table: 'messages'
              // Без фильтра - подписка на все сообщения
            },
            (payload: any) => {
              // Тихий лог только для текущего чата
              if (payload.new.chat_id === chatId) {
                console.log('🌍 Новое сообщение в текущем чате:', payload.new.id)
                onNewMessage(payload.new)
              }
            }
          )
          .on('postgres_changes',
            {
              event: 'UPDATE', // Все обновления сообщений в системе
              schema: 'public',
              table: 'messages'
              // Без фильтра - подписка на все обновления
            },
            (payload: any) => {
              // Тихий лог только для текущего чата
              if (payload.new.chat_id === chatId) {
                console.log('🌍 Сообщение обновлено в текущем чате:', payload.new.id)
                onNewMessage({
                  ...payload.new,
                  _isUpdate: true,
                  _oldRecord: payload.old
                })
              }
            }
          )
      },
      onSubscribed: () => {
        console.log('🌍 ✅ Устойчивый глобальный канал успешно подключен')
      },
      onError: (error) => {
        console.error('🌍 ❌ Ошибка устойчивого глобального канала:', error)
      },
      maxReconnectAttempts: 12, // Много попыток для критически важного канала
      reconnectDelay: 1500,
      keepAliveInterval: 20000, // Keep-alive каждые 20 секунд
      healthCheckInterval: 40000 // Проверка здоровья каждые 40 секунд
    }).catch(error => {
      console.error('🌍 ❌ Не удалось создать устойчивый глобальный канал:', error)
    })

    return () => {
      // Удаляем устойчивый глобальный канал при размонтировании
      resilientChannelManager.removeChannel(globalChannelName)
      console.log('🌍 Компонент размонтирован, устойчивый глобальный канал очищен')
    }
  }, [userId, supabase]) // Убрали chatId и onNewMessage из зависимостей!

  // Отдельный эффект для обработки сообщений текущего чата
  useEffect(() => {
    if (!userId || !chatId) return

    console.log('🎯 Настраиваем обработку сообщений для чата:', chatId)

    // Здесь мы можем добавить дополнительную логику если нужно
    // Но основная подписка уже работает в эффекте выше

  }, [chatId, userId])

  // Эффект для очистки каналов при уходе со страницы
  useEffect(() => {
    if (!userId) return

    const handleBeforeUnload = () => {
      console.log('🚪 Пользователь уходит со страницы, очищаем каналы...')
      cleanupChannels()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        console.log('👁️ Страница стала невидимой, проверяем необходимость очистки...')
        // Не очищаем сразу, даем время на возвращение
        setTimeout(() => {
          if (document.visibilityState === 'hidden') {
            console.log('👁️ Страница все еще невидима, очищаем временные каналы...')
            cleanupChannels()
          }
        }, 30000) // 30 секунд
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [userId, cleanupChannels])
}
