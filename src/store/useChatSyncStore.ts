import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import useSupabaseStore from './useSupabaseStore'
import useCallStore from './useCallStore'

interface ChatSyncState {
  lastMessageUpdate: number
  isGlobalSyncActive: boolean
  refreshCallbacks: Set<() => void>
  soundNotificationCallbacks: Set<(messageData: any) => void>
  messageCallbacks: Set<(messageData: any) => void>
  reconnectAttempts: number
  keepAliveInterval: NodeJS.Timeout | null
  
  // Actions
  refreshChatList: () => void
  registerRefreshCallback: (callback: () => void) => () => void
  registerSoundNotificationCallback: (callback: (messageData: any) => void) => () => void
  registerMessageCallback: (callback: (messageData: any) => void) => () => void
  startGlobalSync: () => void
  stopGlobalSync: () => void
}

const useChatSyncStore = create<ChatSyncState>()(
  subscribeWithSelector((set, get) => ({
    lastMessageUpdate: Date.now(),
    isGlobalSyncActive: false,
    refreshCallbacks: new Set(),
    soundNotificationCallbacks: new Set(),
    messageCallbacks: new Set(),
    reconnectAttempts: 0,
    keepAliveInterval: null,

    refreshChatList: () => {
      console.log('🔄 Глобальное обновление списка чатов через Zustand')
      set({ lastMessageUpdate: Date.now() })
      
      const { refreshCallbacks } = get()
      refreshCallbacks.forEach(callback => {
        try {
          callback()
        } catch (error) {
          console.error('Ошибка при вызове callback обновления чата:', error)
        }
      })
    },

    registerRefreshCallback: (callback: () => void) => {
      const { refreshCallbacks } = get()
      const newCallbacks = new Set(refreshCallbacks)
      newCallbacks.add(callback)
      set({ refreshCallbacks: newCallbacks })
      
      // Возвращаем функцию для отписки
      return () => {
        const { refreshCallbacks: currentCallbacks } = get()
        const updatedCallbacks = new Set(currentCallbacks)
        updatedCallbacks.delete(callback)
        set({ refreshCallbacks: updatedCallbacks })
      }
    },

    registerSoundNotificationCallback: (callback: (messageData: any) => void) => {
      const { soundNotificationCallbacks } = get()
      const newCallbacks = new Set(soundNotificationCallbacks)
      newCallbacks.add(callback)
      set({ soundNotificationCallbacks: newCallbacks })
      
      // Возвращаем функцию для отписки
      return () => {
        const { soundNotificationCallbacks: currentCallbacks } = get()
        const updatedCallbacks = new Set(currentCallbacks)
        updatedCallbacks.delete(callback)
        set({ soundNotificationCallbacks: updatedCallbacks })
      }
    },

    registerMessageCallback: (callback: (messageData: any) => void) => {
      const { messageCallbacks } = get()
      const newCallbacks = new Set(messageCallbacks)
      newCallbacks.add(callback)
      set({ messageCallbacks: newCallbacks })
      
      // Возвращаем функцию для отписки
      return () => {
        const { messageCallbacks: currentCallbacks } = get()
        const updatedCallbacks = new Set(currentCallbacks)
        updatedCallbacks.delete(callback)
        set({ messageCallbacks: updatedCallbacks })
      }
    },

    startGlobalSync: () => {
      const { isGlobalSyncActive, reconnectAttempts } = get()
      if (isGlobalSyncActive) return

      const { supabase } = useSupabaseStore.getState()
      const { userId } = useCallStore.getState()
      
      if (!userId) {
        console.warn('🌐 Нет userId для запуска глобальной синхронизации')
        return
      }

      console.log(`🌐 Запуск глобальной синхронизации чатов (попытка ${reconnectAttempts + 1})`)

      let debounceTimeout: NodeJS.Timeout
      let reconnectTimeout: NodeJS.Timeout

      // Функция переподключения с экспоненциальной задержкой
      const scheduleReconnect = () => {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000) // Максимум 30 секунд
        console.log(`🔄 Переподключение через ${delay}мс (попытка ${reconnectAttempts + 1})`)
        
        set({ isGlobalSyncActive: false, reconnectAttempts: reconnectAttempts + 1 })
        
        reconnectTimeout = setTimeout(() => {
          get().startGlobalSync()
        }, delay)
      }

      const globalChannel = supabase
        .channel(`global_chat_sync_${userId}_${Date.now()}`) // Уникальное имя канала
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        }, (payload) => {
          console.log('🌐 Глобальное обновление: новое сообщение', payload)
          
          const messageData = {
            chatId: payload.new.chat_id,
            senderId: payload.new.sender_id,
            content: payload.new.content,
            messageId: payload.new.id,
            timestamp: payload.new.created_at,
            event: 'INSERT',
            fullPayload: payload.new
          }
          
          // Уведомляем компоненты о новом сообщении
          const { soundNotificationCallbacks, messageCallbacks } = get()
          console.log('📨 Обнаружено новое сообщение - уведомляем callbacks:', {
            chatId: payload.new.chat_id?.slice(0, 8),
            senderId: payload.new.sender_id?.slice(0, 8),
            soundCallbacks: soundNotificationCallbacks.size,
            messageCallbacks: messageCallbacks.size
          })
          
          // Звуковые уведомления
          soundNotificationCallbacks.forEach(callback => {
            try {
              callback(messageData)
            } catch (error) {
              console.error('Ошибка при вызове звукового уведомления:', error)
            }
          })
          
          // Уведомления для компонентов чата
          messageCallbacks.forEach(callback => {
            try {
              callback(messageData)
            } catch (error) {
              console.error('Ошибка при вызове message callback:', error)
            }
          })
          
          // Немедленное обновление для новых сообщений
          get().refreshChatList()
          
          // Дополнительное обновление через 50мс для подстраховки
          clearTimeout(debounceTimeout)
          debounceTimeout = setTimeout(() => {
            get().refreshChatList()
          }, 50)
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages'
        }, (payload) => {
          console.log('🌐 Глобальное обновление: изменение сообщения (статус прочтения)', {
            messageId: payload.new?.id?.slice(0, 8),
            chatId: payload.new?.chat_id?.slice(0, 8),
            oldReadAt: payload.old?.read_at,
            newReadAt: payload.new?.read_at,
            hasReadAtChange: !payload.old?.read_at && payload.new?.read_at
          })
          
          const messageData = {
            chatId: payload.new.chat_id,
            senderId: payload.new.sender_id,
            content: payload.new.content,
            messageId: payload.new.id,
            timestamp: payload.new.created_at,
            event: 'UPDATE',
            fullPayload: payload.new,
            oldPayload: payload.old
          }
          
          // Уведомляем компоненты об обновлении сообщения
          const { messageCallbacks } = get()
          console.log('📨 Вызываем message callbacks для UPDATE события:', {
            messageId: messageData.messageId?.slice(0, 8),
            chatId: messageData.chatId?.slice(0, 8),
            callbacksCount: messageCallbacks.size,
            hasReadAtChange: !payload.old?.read_at && payload.new?.read_at
          })
          
          messageCallbacks.forEach(callback => {
            try {
              callback(messageData)
            } catch (error) {
              console.error('Ошибка при вызове message callback для UPDATE:', error)
            }
          })
          
          // Немедленное обновление для изменений статуса прочтения
          get().refreshChatList()
          
          // Дополнительное обновление через 50мс для подстраховки
          clearTimeout(debounceTimeout)
          debounceTimeout = setTimeout(() => {
            get().refreshChatList()
          }, 50)
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'chats'
        }, (payload) => {
          console.log('🌐 Глобальное обновление: изменение чата', payload)
          
          // Немедленное обновление для изменений в чатах
          get().refreshChatList()
          
          // Дополнительное обновление через 50мс для подстраховки
          clearTimeout(debounceTimeout)
          debounceTimeout = setTimeout(() => {
            get().refreshChatList()
          }, 50)
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_participants'
        }, (payload) => {
          console.log('🌐 Глобальное обновление: изменение участника чата (статус прочтения)', {
            chatId: payload.new?.chat_id?.slice(0, 8),
            userId: payload.new?.user_id?.slice(0, 8),
            oldLastReadAt: payload.old?.last_read_at,
            newLastReadAt: payload.new?.last_read_at,
            hasReadStatusChange: payload.old?.last_read_at !== payload.new?.last_read_at
          })
          
          // Обновляем только если изменился last_read_at (статус прочтения)
          if (payload.old?.last_read_at !== payload.new?.last_read_at) {
            console.log('📖 Статус прочтения изменился - обновляем список чатов для badge')
            
            // Немедленное обновление для изменений статуса прочтения
            get().refreshChatList()
            
            // Дополнительное обновление через 100мс для подстраховки
            clearTimeout(debounceTimeout)
            debounceTimeout = setTimeout(() => {
              get().refreshChatList()
            }, 100)
          }
        })
        .subscribe((status, err) => {
          console.log('🌐 Статус глобальной синхронизации чатов:', status, err ? `Ошибка: ${err}` : '')
          
          if (status === 'SUBSCRIBED') {
            console.log('✅ Глобальная синхронизация чатов успешно подключена!')
            set({ isGlobalSyncActive: true, reconnectAttempts: 0 })
            
            // Запускаем keep-alive механизм
            const keepAliveInterval = setInterval(() => {
              if (get().isGlobalSyncActive) {
                console.log('💓 Keep-alive ping для глобальной синхронизации')
                // Отправляем ping через канал
                globalChannel.send({
                  type: 'broadcast',
                  event: 'ping',
                  payload: { timestamp: Date.now() }
                })
              }
            }, 30000) // Ping каждые 30 секунд
            
            set({ keepAliveInterval })
            
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error(`❌ Проблема с каналом: ${status}`, err)
            set({ isGlobalSyncActive: false })
            
            // Очищаем текущий канал
            supabase.removeChannel(globalChannel)
            
            // Планируем переподключение если попыток не слишком много
            if (reconnectAttempts < 10) {
              scheduleReconnect()
            } else {
              console.error('🚨 Максимальное количество попыток переподключения достигнуто')
              set({ reconnectAttempts: 0 })
            }
            
          } else if (status === 'CLOSED') {
            console.log('🔒 Глобальная синхронизация чатов закрыта')
            set({ isGlobalSyncActive: false })
            
            // Автоматическое переподключение при закрытии
            if (reconnectAttempts < 5) {
              scheduleReconnect()
            }
          }
        })

      // Подписываемся на изменения userId для перезапуска синхронизации
      const unsubscribeUserId = useCallStore.subscribe(
        (state) => {
          const currentUserId = state.userId
          if (!currentUserId) {
            get().stopGlobalSync()
          } else if (currentUserId !== userId) {
            // Перезапускаем синхронизацию с новым userId
            get().stopGlobalSync()
            setTimeout(() => get().startGlobalSync(), 100)
          }
        }
      )

      // Функция очистки
      const cleanup = () => {
        clearTimeout(debounceTimeout)
        clearTimeout(reconnectTimeout)
        
        const { keepAliveInterval } = get()
        if (keepAliveInterval) {
          clearInterval(keepAliveInterval)
          set({ keepAliveInterval: null })
        }
        
        supabase.removeChannel(globalChannel)
        unsubscribeUserId()
        set({ isGlobalSyncActive: false, reconnectAttempts: 0 })
      }

      // Сохраняем функцию очистки в store
      ;(globalChannel as any).cleanup = cleanup
    },

    stopGlobalSync: () => {
      console.log('🛑 Остановка глобальной синхронизации чатов')
      
      const { supabase } = useSupabaseStore.getState()
      const { keepAliveInterval } = get()
      
      // Очищаем keep-alive интервал
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval)
        set({ keepAliveInterval: null })
      }
      
      // Очищаем все каналы синхронизации
      const channels = supabase.getChannels()
      channels.forEach(channel => {
        if (channel.topic.includes('global_chat_sync')) {
          console.log('🗑️ Удаление канала:', channel.topic)
          if ((channel as any).cleanup) {
            ;(channel as any).cleanup()
          } else {
            supabase.removeChannel(channel)
          }
        }
      })
      
      set({ 
        isGlobalSyncActive: false, 
        reconnectAttempts: 0, 
        keepAliveInterval: null 
      })
    }
  }))
)

export default useChatSyncStore
