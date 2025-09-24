import { useEffect, useRef } from 'react'
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
  // Ref для отслеживания текущего активного чата
  const currentChatIdRef = useRef<string>(chatId)
  const { supabase, cleanupChannels } = useSupabaseStore()
  const { registerMessageCallback, refreshChatList } = useChatSyncStore() // 🔥 ДОБАВЛЯЕМ refreshChatList

  // Обновляем ref при изменении chatId
  useEffect(() => {
    console.log('🔄 Обновляем текущий chatId в realtime хуке:', chatId.slice(0, 8))
    currentChatIdRef.current = chatId
  }, [chatId])

  // Оптимизированная подписка на изменения пользователей (ТОЛЬКО если есть собеседник)
  useEffect(() => {
    if (!otherParticipantId || !userId) return

    console.log('📡 Настраиваем realtime подписку на изменения пользователей в чате:', chatId.slice(0, 8))

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


  // 🚀 ЕДИНАЯ УСТОЙЧИВАЯ ПОДПИСКА: Используем ResilientChannelManager для надежной подписки на сообщения
  useEffect(() => {
    if (!userId || !chatId) return

    console.log('🚀 УСТОЙЧИВАЯ ПОДПИСКА: Создаем устойчивую подписку на сообщения для чата:', chatId?.slice(0, 8))

    // Используем стабильное имя канала без timestamp
    const stableChannelName = `chat_messages_${chatId.substring(0, 8)}`
    
    resilientChannelManager.createResilientChannel({
      channelName: stableChannelName,
      setup: (channel) => {
        return channel
          .on('postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `chat_id=eq.${chatId}` // Фильтруем только по текущему чату
            },
            (payload: any) => {
              console.log('🚀 УСТОЙЧИВАЯ ПОДПИСКА: Новое сообщение:', payload.new.id?.slice(0, 8), 'для чата:', payload.new.chat_id?.slice(0, 8))

              // Проверяем, что сообщение относится к текущему активному чату
              if (payload.new.chat_id !== currentChatIdRef.current) {
                console.log('🚫 Сообщение не для текущего активного чата, игнорируем')
                return
              }

              onNewMessage(payload.new)
              // Обновляем ChatList через глобальный store
              console.log('🚀 УСТОЙЧИВАЯ ПОДПИСКА: Уведомляем ChatList об обновлении')
              refreshChatList()
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
              console.log('🚀 УСТОЙЧИВАЯ ПОДПИСКА: Обновление сообщения:', payload.new.id?.slice(0, 8), 'для чата:', payload.new.chat_id?.slice(0, 8))

              // Проверяем, что обновление относится к текущему активному чату
              if (payload.new.chat_id !== currentChatIdRef.current) {
                console.log('🚫 Обновление не для текущего активного чата, игнорируем')
                return
              }

              onNewMessage({
                ...payload.new,
                _isUpdate: true,
                _oldRecord: payload.old
              })
            }
          )
      },
      onSubscribed: () => {
        console.log('🚀 УСТОЙЧИВАЯ ПОДПИСКА: Успешно подписались на сообщения чата')
      },
      onError: (error) => {
        console.error('🚀 УСТОЙЧИВАЯ ПОДПИСКА: Ошибка подписки на сообщения:', error)
      },
      maxReconnectAttempts: 10,
      reconnectDelay: 2000,
      keepAliveInterval: 30000, // Keep-alive каждые 30 секунд
      healthCheckInterval: 60000 // Проверка здоровья каждые 60 секунд
    }).catch(error => {
      console.error('🚀 УСТОЙЧИВАЯ ПОДПИСКА: Не удалось создать устойчивую подписку на сообщения:', error)
    })

    return () => {
      // Удаляем устойчивый канал при размонтировании
      resilientChannelManager.removeChannel(stableChannelName)
    }
  }, [userId, chatId, onNewMessage, refreshChatList])

  // Агрессивная очистка каналов при смене чата
  useEffect(() => {
    const cleanupOldChannels = () => {
      const currentChatPrefix = chatId.substring(0, 8)

      // Очищаем каналы сообщений для других чатов
      const messageChannels = supabase.getChannels().filter(ch =>
        ch.topic.includes('chat_messages_') && !ch.topic.includes(`chat_messages_${currentChatPrefix}`)
      )

      messageChannels.forEach(ch => {
        console.log('🧹 Агрессивная очистка: удаляем канал сообщений старого чата:', ch.topic)
        supabase.removeChannel(ch)
      })

      // Очищаем каналы статуса пользователей для других чатов
      const userStatusChannels = supabase.getChannels().filter(ch =>
        ch.topic.includes('chat_user_status_') && !ch.topic.includes(`chat_user_status_${currentChatPrefix}`)
      )

      userStatusChannels.forEach(ch => {
        console.log('🧹 Агрессивная очистка: удаляем канал статуса старого чата:', ch.topic)
        supabase.removeChannel(ch)
      })
    }

    // Небольшая задержка перед очисткой, чтобы дать время новым каналам установиться
    const cleanupTimer = setTimeout(cleanupOldChannels, 100)

    return () => {
      clearTimeout(cleanupTimer)
    }
  }, [chatId, supabase])

  // Эффект для очистки каналов при уходе со страницы (ОСТОРОЖНАЯ ОЧИСТКА)
  useEffect(() => {
    if (!userId) return

    const handleBeforeUnload = () => {
      console.log('🚪 Пользователь уходит со страницы, очищаем только временные каналы...')
      // Очищаем только неустойчивые каналы, оставляем ResilientChannelManager каналы
      cleanupChannels()
    }

    let visibilityTimer: NodeJS.Timeout | null = null

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        console.log('👁️ Страница стала невидимой, запускаем таймер очистки...')
        // Увеличиваем время ожидания до 5 минут для лучшей UX
        visibilityTimer = setTimeout(() => {
          if (document.visibilityState === 'hidden') {
            console.log('👁️ Страница все еще невидима 5 минут, очищаем только временные каналы...')
            // Не трогаем ResilientChannelManager каналы - они сами управляют соединениями
            cleanupChannels()
          }
        }, 300000) // 5 минут вместо 30 секунд
      } else if (document.visibilityState === 'visible') {
        console.log('👁️ Страница стала видимой, отменяем таймер очистки')
        if (visibilityTimer) {
          clearTimeout(visibilityTimer)
          visibilityTimer = null
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (visibilityTimer) {
        clearTimeout(visibilityTimer)
      }
    }
  }, [userId, cleanupChannels])
}
