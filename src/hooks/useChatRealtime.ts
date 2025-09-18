import { useEffect } from 'react'
import useSupabaseStore from '@/store/useSupabaseStore'

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

    // Создаем канал ТОЛЬКО если его еще нет
    const channelName = `chat_user_status_${chatId.substring(0, 8)}`
    let userChannel = supabase.getChannels().find(ch => ch.topic === channelName)

    if (!userChannel) {
      console.log('📡 Создаем новый канал статуса пользователей:', channelName)
      userChannel = supabase
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
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            console.log('📡 Успешно подписались на статус пользователя')
          } else if (status === 'CHANNEL_ERROR') {
            const errorMessage = err || 'Unknown channel error'
            console.error('📡 Ошибка канала статуса пользователя:', errorMessage)
          }
        })
    } else {
      console.log('📡 Канал статуса уже существует:', channelName)
    }

    return () => {
      // НЕ удаляем канал при размонтировании, чтобы избежать переподключений
      // supabase.removeChannel(userChannel)
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

    const globalChannel = supabase
      .channel(globalChannelName)
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
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('🌍 ✅ Глобальный канал успешно подключен')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('🌍 ❌ Ошибка глобального канала:', err?.message || 'Неизвестная ошибка')
        } else if (status === 'TIMED_OUT') {
          console.warn('🌍 ⏰ Таймаут глобального канала, будет переподключен автоматически')
        }
      })

    return () => {
      // НЕ удаляем глобальный канал при размонтировании компонента
      // Он должен жить на протяжении всей сессии пользователя
      console.log('🌍 Компонент размонтирован, но глобальный канал остается активным')
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
