import { useEffect } from 'react'
import useSupabaseStore from '@/store/useSupabaseStore'
import useChatSyncStore from '@/store/useChatSyncStore'
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
  const { registerMessageCallback } = useChatSyncStore()

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


  // Подписка на сообщения через глобальный store (вместо прямых postgres_changes)
  useEffect(() => {
    if (!userId || !chatId) return

    console.log('📨 Подписываемся на сообщения через глобальный store для чата:', chatId?.slice(0, 8))

    // Регистрируем callback для получения уведомлений о сообщениях
    const unsubscribe = registerMessageCallback((messageData) => {
      // Обрабатываем только сообщения для текущего чата
      if (messageData.chatId === chatId) {
        console.log('📨 Получено сообщение для текущего чата:', {
          messageId: messageData.messageId?.slice(0, 8),
          event: messageData.event,
          hasReadAt: !!messageData.fullPayload?.read_at,
          chatId: chatId?.slice(0, 8)
        })
        
        // Вызываем onNewMessage с адаптированными данными
        if (messageData.event === 'INSERT') {
          onNewMessage(messageData.fullPayload)
        } else if (messageData.event === 'UPDATE') {
          console.log('🔄 Передаем UPDATE событие в useChatMessages:', {
            messageId: messageData.messageId?.slice(0, 8),
            oldReadAt: messageData.oldPayload?.read_at,
            newReadAt: messageData.fullPayload?.read_at
          })
          onNewMessage({
            ...messageData.fullPayload,
            _isUpdate: true,
            _oldRecord: messageData.oldPayload
          })
        }
      }
    })

    return () => {
      console.log('📨 Отписываемся от сообщений через глобальный store')
      unsubscribe()
    }
  }, [userId, chatId, registerMessageCallback, onNewMessage])

  // ВРЕМЕННАЯ прямая подписка на сообщения (пока не исправим глобальную систему)
  useEffect(() => {
    if (!userId || !chatId) return

    console.log('🔧 ВРЕМЕННО: создаем прямую подписку на сообщения для чата:', chatId?.slice(0, 8))

    const directChannelName = `direct_messages_${chatId.substring(0, 8)}_${Date.now()}`
    
    const directChannel = supabase
      .channel(directChannelName)
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}` // Фильтруем только по текущему чату
        },
        (payload: any) => {
          console.log('🔧 ВРЕМЕННО: Новое сообщение через прямую подписку:', payload.new.id?.slice(0, 8))
          onNewMessage(payload.new)
        }
      )
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}` // Фильтруем только по текущему чату
        },
        (payload: any) => {
          console.log('🔧 ВРЕМЕННО: Обновление сообщения через прямую подписку:', payload.new.id?.slice(0, 8))
          onNewMessage({
            ...payload.new,
            _isUpdate: true,
            _oldRecord: payload.old
          })
        }
      )
      .subscribe((status) => {
        console.log('🔧 ВРЕМЕННО: Статус прямой подписки:', status)
      })

    return () => {
      console.log('🔧 ВРЕМЕННО: Убираем прямую подписку')
      supabase.removeChannel(directChannel)
    }
  }, [userId, chatId, supabase, onNewMessage])

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
