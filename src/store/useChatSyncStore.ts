import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import useSupabaseStore from './useSupabaseStore'
import useCallStore from './useCallStore'

interface ChatSyncState {
  lastMessageUpdate: number
  isGlobalSyncActive: boolean
  refreshCallbacks: Set<() => void>
  soundNotificationCallbacks: Set<(messageData: { id?: string; chat_id?: string; sender_id?: string; content?: string }) => void>
  messageCallbacks: Set<(messageData: { id?: string; chat_id?: string; sender_id?: string; content?: string }) => void>
  userRefreshCallbacks: Set<() => void>
  reconnectAttempts: number
  keepAliveInterval: NodeJS.Timeout | null
  isNetworkError: boolean // Флаг критической ошибки сети

  // Actions
  refreshChatList: () => void
  registerRefreshCallback: (callback: () => void) => () => void
  registerSoundNotificationCallback: (callback: (messageData: { id?: string; chat_id?: string; sender_id?: string; content?: string }) => void) => () => void
  registerMessageCallback: (callback: (messageData: { id?: string; chat_id?: string; sender_id?: string; content?: string }) => void) => () => void
  registerUserRefreshCallback: (callback: () => void) => () => void
  startGlobalSync: () => void
  stopGlobalSync: () => void
  retryConnection: () => void // Ручной перезапуск соединения
}

const useChatSyncStore = create<ChatSyncState>()(
  subscribeWithSelector((set, get) => ({
    lastMessageUpdate: Date.now(),
    isGlobalSyncActive: false,
    refreshCallbacks: new Set(),
    soundNotificationCallbacks: new Set(),
    messageCallbacks: new Set(),
    userRefreshCallbacks: new Set(),
    reconnectAttempts: 0,
    keepAliveInterval: null,
    isNetworkError: false,

    refreshChatList: () => {
      const { refreshCallbacks, isGlobalSyncActive } = get()
      
      console.log('🔄 Глобальное обновление списка чатов через Zustand:', {
        timestamp: new Date().toLocaleTimeString(),
        callbackCount: refreshCallbacks.size,
        isGlobalSyncActive,
        stackTrace: new Error().stack?.split('\n')[2]?.trim() // Показываем откуда вызов
      })
      
      // Во время звонков ChatList может быть неактивен - это нормально
      // Убрано предупреждение чтобы не захламлять консоль
      
      set({ lastMessageUpdate: Date.now() })
      
      let callbackIndex = 0
      refreshCallbacks.forEach((callback) => {
        try {
          callbackIndex++
          console.log(`🔥 ГЛОБАЛЬНАЯ ПОДПИСКА: Уведомляем ChatList об обновлении (callback ${callbackIndex}/${refreshCallbacks.size})`)
          callback()
        } catch (error) {
          console.error('Ошибка при вызове callback обновления чата:', error)
        }
      })
    },

    registerUserRefreshCallback: (callback: () => void) => {
      const { userRefreshCallbacks } = get()
      const newCallbacks = new Set(userRefreshCallbacks)
      newCallbacks.add(callback)
      set({ userRefreshCallbacks: newCallbacks })

      // Возвращаем функцию для отписки
      return () => {
        const { userRefreshCallbacks: currentCallbacks } = get()
        const updatedCallbacks = new Set(currentCallbacks)
        updatedCallbacks.delete(callback)
        set({ userRefreshCallbacks: updatedCallbacks })
      }
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

    registerSoundNotificationCallback: (callback: (messageData: { id?: string; chat_id?: string; sender_id?: string; content?: string }) => void) => {
      const callStack = new Error().stack?.split('\n').slice(1, 4).map(line => line.trim()).join(' -> ')
      const { soundNotificationCallbacks } = get()
      const newCallbacks = new Set(soundNotificationCallbacks)
      newCallbacks.add(callback)
      set({ soundNotificationCallbacks: newCallbacks })
      
      console.log('🔊🔥 РЕГИСТРАЦИЯ: Зарегистрирован callback для звуковых уведомлений.', {
        totalCallbacks: newCallbacks.size,
        stack: callStack
      })
      
      // Возвращаем функцию для отписки
      return () => {
        const { soundNotificationCallbacks: currentCallbacks } = get()
        const updatedCallbacks = new Set(currentCallbacks)
        updatedCallbacks.delete(callback)
        set({ soundNotificationCallbacks: updatedCallbacks })
        console.log('🔇 Отписан callback звуковых уведомлений. Осталось:', updatedCallbacks.size)
      }
    },

    registerMessageCallback: (callback: (messageData: { id?: string; chat_id?: string; sender_id?: string; content?: string }) => void) => {
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
          console.time('startGlobalSync_reconnect')
          get().startGlobalSync()
          console.timeEnd('startGlobalSync_reconnect')
        }, delay)
      }

      // 🆕 Функция для получения актуальных сообщений сразу при старте
      const fetchLatestMessages = async () => {
        try {
          console.log('📨 Получаем последние сообщения перед подпиской на realtime...')

          // Вызываем refreshChatList для получения актуальных данных
          await get().refreshChatList()

          console.log('✅ Получили актуальные сообщения перед realtime подпиской')
        } catch (error) {
          console.warn('⚠️ Не удалось получить актуальные сообщения перед realtime:', error)
        }
      }

      // 🔥 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: НЕ блокируем realtime подписку асинхронной загрузкой!
      // Запускаем параллельно, НЕ ждем завершения
      fetchLatestMessages().catch(error => {
        console.warn('⚠️ Ошибка фоновой загрузки сообщений (не критично):', error)
      })
      
      console.log('🚀 НЕМЕДЛЕННЫЙ запуск realtime подписки БЕЗ ожидания загрузки!')

      // Принудительно очищаем возможные старые каналы глобальной синхронизации перед созданием нового
      const existingGlobalChannels = supabase.getChannels().filter(ch => 
        ch.topic.includes('global_chat_sync_') || ch.topic.includes('global_chat_notifications')
      )
      existingGlobalChannels.forEach(ch => {
        try {
          console.log('🧹 Удаление старого канала глобальной синхронизации:', ch.topic)
          supabase.removeChannel(ch)
        } catch (e) {
          console.warn('⚠️ Не удалось удалить канал:', ch.topic, e)
        }
      })

      const globalChannel = supabase
        .channel('global_chat_notifications') // Единый канал для всех пользователей
        .on('broadcast', {
          event: 'new_message'
        }, (payload) => {
          console.log('🌐 Глобальное broadcast уведомление: новое сообщение', {
            messageId: payload.payload?.messageId?.slice(0, 8),
            chatId: payload.payload?.chatId?.slice(0, 8),
            content: payload.payload?.content?.slice(0, 30),
            timestamp: new Date().toLocaleTimeString(),
            registeredCallbacks: get().refreshCallbacks.size,
            messageCallbacks: get().messageCallbacks.size
          })
          
          const messageData = {
            chatId: payload.payload.chatId,
            senderId: payload.payload.senderId,
            content: payload.payload.content,
            messageId: payload.payload.messageId,
            timestamp: payload.payload.timestamp,
            event: 'INSERT',
            fullPayload: payload.payload
          }
          
          // Уведомляем компоненты о новом сообщении
          const { soundNotificationCallbacks, messageCallbacks } = get()
          console.log('📨 Обнаружено новое сообщение через broadcast - уведомляем callbacks:', {
            chatId: payload.payload.chatId?.slice(0, 8),
            senderId: payload.payload.senderId?.slice(0, 8),
            soundCallbacks: soundNotificationCallbacks.size,
            messageCallbacks: messageCallbacks.size
          })
          
          // Звуковые уведомления для всех зарегистрированных callback'ов
          console.log('🔊 ГЛОБАЛЬНОЕ УВЕДОМЛЕНИЕ: Вызываем звуковые callback:', {
            totalCallbacks: soundNotificationCallbacks.size
          })
          soundNotificationCallbacks.forEach(callback => {
            try {
              console.log('🔊 ГЛОБАЛЬНОЕ УВЕДОМЛЕНИЕ: Вызываем звуковой callback')
              callback(messageData)
            } catch (error) {
              console.error('🔇 Ошибка при вызове звукового уведомления:', error)
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
          
          // 🔥 ИСПРАВЛЕНИЕ: Debounced обновление вместо немедленного
          clearTimeout(debounceTimeout)
          debounceTimeout = setTimeout(() => {
            console.log('🔥 ГЛОБАЛЬНАЯ BROADCAST ПОДПИСКА: Уведомляем ChatList об обновлении')
            get().refreshChatList()
          }, 150) // 150мс debounce для группировки обновлений
        })
        .on('broadcast', {
          event: 'chat_deleted_for_all'
        }, (payload) => {
          console.log('🌐 Глобальное broadcast уведомление: чат удален для всех', {
            chatId: payload.payload?.chatId?.slice(0, 8),
            deletedBy: payload.payload?.deletedBy?.slice(0, 8),
            timestamp: new Date().toLocaleTimeString()
          })
          
          const { chatId, deletedBy } = payload.payload
          
          // Не обрабатываем событие если это наше собственное удаление
          if (deletedBy === userId) {
            console.log('🚫 Пропускаем - это наше собственное удаление чата')
            return
          }
          
          // 📨 Отправляем событие для перенаправления других пользователей на главную
          window.dispatchEvent(new CustomEvent('chatDeletedForAll', {
            detail: { chatId }
          }))
          
          // 🔥 Обновляем списки чатов
          clearTimeout(debounceTimeout)
          debounceTimeout = setTimeout(() => {
            console.log('🔥 ГЛОБАЛЬНАЯ BROADCAST ПОДПИСКА: Обновляем ChatList после удаления чата')
            get().refreshChatList()
          }, 150)
        })
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        }, async (payload) => {
          console.log('🌐 Глобальное обновление: НОВОЕ сообщение', {
            messageId: payload.new?.id?.slice(0, 8),
            chatId: payload.new?.chat_id?.slice(0, 8),
            senderId: payload.new?.sender_id?.slice(0, 8),
            content: payload.new?.content?.slice(0, 30),
            type: payload.new?.type,
            timestamp: new Date().toLocaleTimeString(),
            registeredCallbacks: get().refreshCallbacks.size
          })

          // Уведомляем о новом сообщении
          const messageData = {
            chatId: payload.new.chat_id,
            senderId: payload.new.sender_id,
            content: payload.new.content,
            messageId: payload.new.id,
            timestamp: payload.new.created_at,
            event: 'INSERT',
            fullPayload: payload.new
          }

          // Звуковые уведомления - ТОЛЬКО для участников чата!
          const { soundNotificationCallbacks, messageCallbacks } = get()
          soundNotificationCallbacks.forEach(() => {
            try {
              // НЕ вызываем callback из глобальной подписки
              // Звуки будут воспроизводиться только из локальных подписок ChatList
              console.log('🔇 Пропускаем глобальное звуковое уведомление для INSERT')
            } catch (error) {
              console.error('Ошибка при вызове звукового уведомления для INSERT:', error)
            }
          })

          // Уведомления для компонентов чата
          messageCallbacks.forEach(callback => {
            try {
              callback(messageData)
            } catch (error) {
              console.error('Ошибка при вызове message callback для INSERT:', error)
            }
          })

          // 🔄 Принудительно очищаем все typing индикаторы когда приходят новые сообщения
          try {
            const { globalTypingManager } = await import('@/lib/GlobalTypingManager')
            if (messageData.chatId) {
              globalTypingManager.clearAllTypingInChat(messageData.chatId, 'новое_сообщение')
            }
          } catch (error) {
            console.error('Ошибка при очистке typing индикаторов:', error)
          }

          // 🔥 ИСПРАВЛЕНИЕ: Debounced обновление списка чатов для новых сообщений
          clearTimeout(debounceTimeout)
          debounceTimeout = setTimeout(() => {
            console.log('🔥 ГЛОБАЛЬНАЯ ПОДПИСКА (INSERT): Уведомляем ChatList о новом сообщении')
            get().refreshChatList()
          }, 150) // 150мс debounce для группировки обновлений
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
            hasReadAtChange: !payload.old?.read_at && payload.new?.read_at,
            registeredCallbacks: get().refreshCallbacks.size,
            messageCallbacks: get().messageCallbacks.size
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
          
          // 🔥 ИСПРАВЛЕНИЕ: Debounced обновление для статуса прочтения
          clearTimeout(debounceTimeout)
          debounceTimeout = setTimeout(() => {
            console.log('🔥 ГЛОБАЛЬНАЯ ПОДПИСКА (UPDATE): Уведомляем ChatList об обновлении')
            get().refreshChatList()
          }, 100) // 100мс debounce для статуса прочтения
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'chats'
        }, (payload) => {
          console.log('🌐 Глобальное обновление: изменение чата', payload)
          
          // 🔥 ИСПРАВЛЕНИЕ: Debounced обновление для изменений чатов
          clearTimeout(debounceTimeout)
          debounceTimeout = setTimeout(() => {
            console.log('🔥 ГЛОБАЛЬНАЯ ПОДПИСКА (CHATS): Уведомляем ChatList об обновлении')
            get().refreshChatList()
          }, 200) // 200мс debounce для изменений чатов
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
            
            // 🔥 ИСПРАВЛЕНИЕ: Debounced обновление для статуса прочтения участников
            clearTimeout(debounceTimeout)
            debounceTimeout = setTimeout(() => {
              console.log('🔥 ГЛОБАЛЬНАЯ ПОДПИСКА (PARTICIPANTS): Уведомляем ChatList об обновлении')
              get().refreshChatList()
            }, 300) // 300мс debounce для участников чата
          }
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_profiles'
        }, () => {

          // Вызываем refresh для обновления списка пользователей
          const { userRefreshCallbacks } = get()
          if (userRefreshCallbacks && userRefreshCallbacks.size > 0) {
          
            userRefreshCallbacks.forEach(callback => {
              try {
                callback()
              } catch (error) {
                console.error('Ошибка при вызове user refresh callback:', error)
              }
            })
          } else {
            console.log('⚠️ Нет подписчиков на обновление пользователей')
          }

          // 🔥 ИСПРАВЛЕНИЕ: НЕ обновляем чаты при каждом изменении статуса пользователя
          // Это создавало каскадные обновления! Статусы пользователей обновляются отдельно.
        })
        .subscribe((status, err) => {
          console.log('🌐 Статус глобальной синхронизации чатов:', status, err ? `Ошибка: ${err}` : '')

          if (status === 'SUBSCRIBED') {
            console.log('✅ Глобальная синхронизация чатов успешно подключена!')
            set({ isGlobalSyncActive: true, reconnectAttempts: 0, isNetworkError: false })

            // Keep-alive механизм для поддержания соединения
            const keepAliveInterval = setInterval(() => {
              if (get().isGlobalSyncActive) {
                // Логируем keep-alive только в debug режиме
                if (process.env.NODE_ENV === 'development') {
                  console.log('💓 Keep-alive ping для глобальной синхронизации')
                }
                // Отправляем ping через канал
                globalChannel.send({
                  type: 'broadcast',
                  event: 'ping',
                  payload: { timestamp: Date.now() }
                })
              }
            }, 30000) // Ping каждые 30 секунд

            set({ keepAliveInterval })

          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Критическая ошибка WebSocket:', err || 'Неизвестная ошибка')
            // При критических ошибках WebSocket - временно отключаем realtime
            console.log('🚫 Отключаем realtime из-за критических ошибок сети')
            set({ isGlobalSyncActive: false, isNetworkError: true })
            // Не пытаемся переподключаться автоматически при WebSocket ошибках
            return

          } else if (status === 'TIMED_OUT') {
            console.error('⏰ Таймаут подключения к realtime')
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
            setTimeout(() => {
              console.time('startGlobalSync_userid_change')
              get().startGlobalSync()
              console.timeEnd('startGlobalSync_userid_change')
            }, 100)
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
      ;(globalChannel as { cleanup?: () => void }).cleanup = cleanup
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
        if (channel.topic.includes('global_chat_sync') || channel.topic.includes('global_chat_notifications')) {
          console.log('🗑️ Удаление канала:', channel.topic)
          const cleanupFn = (channel as { cleanup?: () => void }).cleanup
          if (cleanupFn) {
            cleanupFn()
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
    },

    retryConnection: () => {
      console.log('🔄 Ручная попытка переподключения к realtime...')
      set({ isNetworkError: false, reconnectAttempts: 0 })
      get().startGlobalSync()
    }
  }))
)

export default useChatSyncStore
