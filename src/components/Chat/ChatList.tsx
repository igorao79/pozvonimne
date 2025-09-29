'use client'

import { useState, useEffect, forwardRef, useImperativeHandle, useCallback, useRef } from 'react'
import useSupabaseStore from '@/store/useSupabaseStore'
import useChatSyncStore from '@/store/useChatSyncStore'
import useCallStore from '@/store/useCallStore'
import ChatListItem from './ChatListItem'
import { RandomFact } from '@/components/ui/random-fact'
import { UserCounter } from '@/components/ui/user-counter'
import { useSoundNotifications } from '@/hooks/useSoundNotifications'
import { useChatListRealtime } from '@/hooks/useChatListRealtime' // 🔥 ПРЯМАЯ ПОДПИСКА
import { Volume2 } from 'lucide-react'

interface Chat {
  id: string
  type: 'private' | 'group'
  name: string
  avatar_url?: string
  last_message?: string
  last_message_at?: string
  last_message_sender_id?: string
  last_message_sender_name?: string
  unread_count: number
  other_participant_id?: string
  other_participant_name?: string
  other_participant_avatar?: string
  other_participant_is_creator?: boolean
  other_participant_status?: string
  other_participant_last_seen?: string
  created_at: string
  updated_at?: string
}

interface ChatListProps {
  onChatSelect: (chat: Chat) => void
  onCreateNewChat: () => void
  selectedChatId?: string | undefined
  externalUpdateTrigger?: number // Внешний триггер для обновления данных
}

const ChatList = forwardRef<any, ChatListProps>(({ onChatSelect, onCreateNewChat, selectedChatId, externalUpdateTrigger }, ref) => {
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState<number>(Date.now())
  const [updateTrigger, setUpdateTrigger] = useState(0)
  const { userId } = useCallStore()
  const { supabase } = useSupabaseStore()
  // 🔥 ВОЗВРАЩАЕМ ГЛОБАЛЬНУЮ СИСТЕМУ: Прямые подписки вызывали CHANNEL_ERROR, глобальный store работает!
  
  // Импортируем хук звуковых уведомлений для тестирования
  const { testSound } = useSoundNotifications()

  // 🔥 ДЕБАУНСИНГ: useRef для хранения таймаута
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // 🔥 ДИАГНОСТИКА: Уникальный ID для отслеживания экземпляров + стабилизация
  const instanceId = useRef(
    `ChatList_${Date.now()}_${Math.random().toString(36).substr(2, 4)}_${selectedChatId ? 'desktop' : 'mobile'}`
  )
  
  // 🔥 ДИАГНОСТИКА: Логируем создание экземпляра
  useEffect(() => {
    console.log(`🎯 СОЗДАН НОВЫЙ ChatList экземпляр [${instanceId.current}] для пользователя:`, userId?.slice(0, 8))
    console.log(`🔍 ЭКЗЕМПЛЯР КОНТЕКСТ [${instanceId.current}]:`, {
      selectedChatId: selectedChatId?.slice(0, 8),
      hasUserId: !!userId,
      timestamp: new Date().toLocaleTimeString()
    })
    return () => {
      console.log(`🗑️ УДАЛЕН ChatList экземпляр [${instanceId.current}]`)
    }
  }, [])

  // 🔥 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Предотвращаем параллельные вызовы loadChats
  const loadInProgress = useRef(false)
  
  // 🔥 ГЛОБАЛЬНЫЙ STORE: ДЕБАУНСЕННЫЙ обработчик для предотвращения спама
  const handleChatUpdate = useCallback(() => {
    console.log(`🔥 ГЛОБАЛЬНЫЙ STORE [${instanceId.current}]: Получен сигнал обновления ChatList`)
    
    // 🔥 ДЕБАУНСИНГ: Очищаем предыдущий таймаут
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
      console.log(`🔥 ДЕБАУНСИНГ [${instanceId.current}]: Отменяем предыдущий setUpdateTrigger`)
    }
    
    // 🔥 ДЕБАУНСИНГ: Планируем новый вызов
    debounceTimeoutRef.current = setTimeout(() => {
      setUpdateTrigger((prev: number) => {
        const newValue = prev + 1
        console.log(`🔥 ДИАГНОСТИКА [${instanceId.current}]: ДЕБАУНСЕННЫЙ setUpdateTrigger, prev:`, prev, 'new:', newValue)
        return newValue
      })
      debounceTimeoutRef.current = null
    }, 50) // 50мс дебаунс для setUpdateTrigger
  }, [])
  
  useChatListRealtime({
    userId,
    onChatUpdate: handleChatUpdate
  })
  
  // 🔥 ГЛОБАЛЬНЫЙ STORE: useChatListRealtime теперь использует глобальную синхронизацию!

  // Сортировка чатов по времени последнего сообщения (новые сверху)
  const sortChatsByLastMessage = (chatsToSort: Chat[]) => {
    return [...chatsToSort].sort((a, b) => {
      const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
      const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
      return timeB - timeA // Новые сверху
    })
  }

  // Загрузка чатов с опциональным лоадером
  const loadChats = useCallback(async (showLoader = false) => {
    if (!userId) return

    // 🔥 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Предотвращаем параллельные загрузки
    if (loadInProgress.current) {
      console.log(`⏸️ СИНХРОНИЗАЦИЯ [${instanceId.current}]: Загрузка уже в процессе, пропускаем`)
      return
    }

    loadInProgress.current = true

    try {
      if (showLoader) {
        setLoading(true)
      }
      setError(null)

      // 🔥 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Принудительная синхронизация данных
      // Добавляем timestamp чтобы избежать кэширования результатов
      const syncTimestamp = Date.now()
      console.log(`🔄 СИНХРОНИЗАЦИЯ [${instanceId.current}]: Загружаем чаты с принудительным обновлением, timestamp:`, syncTimestamp)

      // Простой вызов без дополнительных параметров (исправлен PGRST203)
      const { data, error: chatsError } = await supabase.rpc('get_user_chats')

      if (chatsError) {
        console.error(`❌ СИНХРОНИЗАЦИЯ [${instanceId.current}]: Ошибка загрузки чатов:`, chatsError)
        setError('Ошибка загрузки чатов')
        return
      }

      // 🔥 ДИАГНОСТИКА: Логируем полученные данные для отладки синхронизации
      console.log(`📊 СИНХРОНИЗАЦИЯ [${instanceId.current}]: Получены данные чатов:`, {
        count: data?.length || 0,
        timestamp: syncTimestamp,
        firstChatLastMessage: data?.[0]?.last_message?.slice(0, 20),
        firstChatId: data?.[0]?.id?.slice(0, 8),
        firstChatUnreadCount: data?.[0]?.unread_count,
        chatsWithUnread: data?.filter((c: any) => c.unread_count > 0).length || 0
      })

      // Сортируем чаты по времени последнего сообщения
      const sortedChats = sortChatsByLastMessage(data || [])

      // Важно: Создаем новые объекты для чатов, чтобы React увидел изменения
      const newChats = sortedChats.map(chat => ({
        ...chat,
        // Добавляем timestamp для принудительного обновления
        _updateTimestamp: Date.now()
      }))

      // 🔥 ДИАГНОСТИКА СИНХРОНИЗАЦИИ: Детальное логирование обновлений
      console.log('🔄 ChatList: Обновление списка чатов:', {
        timestamp: new Date().toLocaleTimeString(),
        oldCount: chats.length,
        newCount: newChats.length,
        changedChats: newChats.filter((newChat, index) => {
          const oldChat = chats[index]
          return !oldChat || oldChat.unread_count !== newChat.unread_count ||
                 oldChat.last_message !== newChat.last_message
        }).length,
        stackTrace: new Error().stack?.split('\n')[2]?.trim() // Показываем откуда вызов
      })

      setChats(newChats)
    } catch (err) {
      console.error(`💥 СИНХРОНИЗАЦИЯ [${instanceId.current}]: Критическая ошибка:`, err)
      setError('Ошибка подключения')
    } finally {
      // 🔥 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Сбрасываем флаг загрузки
      loadInProgress.current = false
      if (showLoader) {
        setLoading(false)
      }
      console.log(`✅ СИНХРОНИЗАЦИЯ [${instanceId.current}]: Завершена, флаг сброшен`)
    }
  }, [userId, supabase, instanceId]) // 🔥 useCallback зависимости

  // Загружаем чаты при монтировании и изменении userId (с лоадером)
  useEffect(() => {
    loadChats(true)
  }, [userId, loadChats])

  // 🔥 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: ДЕБАУНСЕННЫЙ loadChats при изменении updateTrigger!
  useEffect(() => {
    console.log(`🔥 ДИАГНОСТИКА [${instanceId.current}]: useEffect updateTrigger сработал, значение:`, updateTrigger)
    if (updateTrigger > 0) {
      console.log(`🔥 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ [${instanceId.current}]: updateTrigger изменился, планируем дебаунсенный loadChats!`)
      console.log(`🔍 updateTrigger [${instanceId.current}] значение:`, updateTrigger)
      
      // 🔥 ДЕБАУНСИНГ: Отменяем предыдущий вызов и планируем новый
      const timeoutId = setTimeout(() => {
        console.log(`🔥 ДЕБАУНСЕННЫЙ loadChats [${instanceId.current}]: Выполняем загрузку чатов`)
        loadChats(false) // Без лоадера для быстрого обновления
      }, 100) // 100мс дебаунс для группировки обновлений
      
      return () => {
        console.log(`🔥 ДЕБАУНСИНГ [${instanceId.current}]: Отменяем предыдущий loadChats`)
        clearTimeout(timeoutId)
      }
    }
  }, [updateTrigger]) // 🔥 УБИРАЕМ loadChats из зависимостей!

  // Подписка на обновления теперь обрабатывается в ChatApp для мобильной версии

  // 🔥 УБРАНА ГЛОБАЛЬНАЯ ПОДПИСКА: Теперь используем прямые подписки выше
  // Прямые подписки надежнее и не создают каскадных обновлений

  // Реагируем на внешний триггер обновления (для мобильной версии)
  useEffect(() => {
    if (externalUpdateTrigger && externalUpdateTrigger > 0) {
      console.log('🔄 ChatList: Внешний триггер обновления, перезагружаем чаты')
      loadChats(false)
    }
  }, [externalUpdateTrigger])

  // 🔥 ИСПРАВЛЕНИЕ: Менее частое обновление времени и уменьшение логов
  useEffect(() => {
    const timeUpdateInterval = setInterval(() => {
      if (Math.random() < 0.2) { // Логируем только 20% обновлений времени
        console.log('⏰ Обновление времени в ChatList для live статусов')
      }
      setCurrentTime(Date.now())
    }, 30000) // 🔥 УВЕЛИЧИВАЕМ интервал до 30 секунд вместо 15

    return () => clearInterval(timeUpdateInterval)
  }, [])

  // Автоматическая пересортировка чатов когда время обновляется
  useEffect(() => {
    if (chats.length > 0) {
      const sortedChats = sortChatsByLastMessage(chats)
      // Проверяем, изменился ли порядок, чтобы избежать лишних ререндеров
      const hasOrderChanged = chats.some((chat, index) => chat.id !== sortedChats[index]?.id)
      if (hasOrderChanged) {
        console.log('🔄 Пересортировка чатов после обновления времени')
        setChats(sortedChats)
      }
    }
  }, [currentTime])

  // 🔥 УБРАН МОНИТОРИНГ ГЛОБАЛЬНОЙ СИСТЕМЫ: Теперь используем прямые подписки
  // Каждая подписка сама следит за своим состоянием

  // Экспортируем методы для внешнего использования
  useImperativeHandle(ref, () => ({
    refreshChats: () => loadChats(true),
    findAndSelectChat: async (chatId: string) => {
      console.log('🔍 ChatList.findAndSelectChat called with:', chatId)
      console.log('🔍 Current chats count:', chats.length)

      try {
        console.log('🔍 Fast chat search - checking current state first...')
        
        // Сначала проверяем текущее состояние чатов
        let actualChats = chats
        
        // Если чаты не загружены, делаем прямой запрос без loadChats()
        if (actualChats.length === 0) {
          console.log('🔍 No chats in state, making direct database query...')
          
          const { data, error: directQueryError } = await supabase.rpc('get_user_chats')
          
          if (!directQueryError && data) {
            actualChats = data
            console.log('🔍 Direct query successful, found chats:', actualChats.length)
            
            // Обновляем состояние компонента после успешного запроса
            setChats(data)
          } else {
            console.error('🔍 Direct query failed:', directQueryError)
            return null
          }
        } else {
          console.log('🔍 Using cached chats:', actualChats.length)
        }

        const chat = actualChats.find(c => c.id === chatId)
        console.log('🔍 Found chat:', chat ? `${chat.name} (${chat.id})` : 'null')

        if (chat) {
          console.log('🔍 Calling onChatSelect for chat:', chat.name)
          onChatSelect(chat)
          return chat
        }

        console.log('🔍 Chat not found:', chatId)
        return null
      } catch (error) {
        console.error('🔍 Error in findAndSelectChat:', error)
        return null
      }
    }
  }), [chats, onChatSelect, supabase, setChats])

  // Удалили старую realtime подписку - теперь используем глобальную синхронизацию через Zustand
  /*
  useEffect(() => {
    if (!userId) return

    let timeoutId: NodeJS.Timeout
    let isPollingMode = false
    let pollInterval: NodeJS.Timeout

    const setupRealtimeSubscription = () => {
      if (isPollingMode) return

      console.log('📡 Подписываемся на обновления чатов для пользователя:', userId)

      // Уникальное имя канала для избежания конфликтов
      const channelName = `chats_updates_${userId.substring(0, 8)}`
      
      // Проверяем существующие каналы и очищаем дубли
      const existingChannels = supabase.getChannels().filter(ch => ch.topic.includes('chats_updates'))
      existingChannels.forEach(ch => supabase.removeChannel(ch))

      const chatsChannel = supabase
        .channel(channelName)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'chats' 
          }, 
          (payload) => {
            console.log('📡 Изменение в чатах:', payload)
            // Дебаунсинг обновлений
            clearTimeout(timeoutId)
            timeoutId = setTimeout(() => loadChats(), 300)
          }
        )
        .on('postgres_changes', 
          { 
            event: 'INSERT', // Только новые сообщения
            schema: 'public', 
            table: 'messages' 
          }, 
          (payload) => {
            console.log('📡 Новое сообщение:', payload)
            clearTimeout(timeoutId)
            timeoutId = setTimeout(() => loadChats(), 300)
          }
        )
        .subscribe((status, err) => {
          console.log('📡 Статус канала чатов:', status, err ? `Ошибка: ${err}` : '')

          if (status === 'SUBSCRIBED') {
            console.log('📡 Успешно подписались на изменения чатов')
            isPollingMode = false
          } else if (status === 'CHANNEL_ERROR') {
            console.error('📡 Ошибка канала чатов:', err)
            
            // Переключаемся на polling режим при ошибке
            console.log('🚨 CRITICAL REALTIME ERROR (ChatList) - Переключаемся на polling')
            
            supabase.removeChannel(chatsChannel)
            isPollingMode = true
            
            // Запускаем polling
            pollInterval = setInterval(async () => {
              try {
                await loadChats()
                console.log('📊 POLLING MODE (ChatList) - Чаты обновлены')
              } catch (error) {
                console.error('📊 POLLING ERROR (ChatList):', error)
              }
            }, 5000)
            
            console.log('📊 SWITCHED TO POLLING MODE (ChatList)')
          } else if (status === 'TIMED_OUT') {
            console.warn('📡 Таймаут канала чатов, переподключение...')
            // Повторная попытка подключения через 2 секунды
            setTimeout(setupRealtimeSubscription, 2000)
          } else if (status === 'CLOSED') {
            console.log('📡 Канал чатов закрыт')
          }
        })

      return chatsChannel
    }

    const channel = setupRealtimeSubscription()

    return () => {
      console.log('📡 Отписываемся от обновлений чатов')
      clearTimeout(timeoutId)
      
      if (channel) {
        supabase.removeChannel(channel)
      }
      
      if (pollInterval) {
        clearInterval(pollInterval)
        console.log('📊 POLLING CLEARED (ChatList)')
      }
    }
  */

  // Форматирование времени последнего сообщения с учетом currentTime
  const formatLastMessageTime = (timestamp?: string) => {
    if (!timestamp) return ''

    const messageDate = new Date(timestamp)
    const now = new Date(currentTime) // Используем currentTime для live обновлений
    const diffInMinutes = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return 'сейчас'
    if (diffInMinutes < 60) return `${diffInMinutes} мин`

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours} ч`

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const msgDate = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate())

    if (msgDate.getTime() === today.getTime()) {
      return messageDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    }

    const diffInDays = Math.floor((today.getTime() - msgDate.getTime()) / (1000 * 60 * 60 * 24))
    if (diffInDays === 1) return 'вчера'
    if (diffInDays < 7) return `${diffInDays} дн`

    return messageDate.toLocaleDateString('ru-RU', { 
      day: '2-digit', 
      month: '2-digit' 
    })
  }

  // Обрезка длинного текста
  const truncateText = (text: string, maxLength: number = 40) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center chat-pattern-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Загрузка чатов...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden chatlist-mobile-pattern">
      {/* Ультракомпактный заголовок */}
      <div className="px-2 py-1 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center justify-between min-h-[32px]">
            <div className="flex items-center space-x-2">
            <h1 className="text-sm font-semibold text-foreground">Чаты</h1>
            {/* 🔥 ГЛОБАЛЬНЫЙ STORE ИНДИКАТОР: Показываем статус глобальной синхронизации */}
            <div className="flex items-center space-x-1">
              <div
                className="w-2 h-2 rounded-full bg-blue-500 animate-pulse transition-colors"
                title="Глобальная синхронизация активна • Обновления через надежный store"
              />

              {/* 🔥 ГЛОБАЛЬНЫЙ STORE: Надежная синхронизация не требует ручного переподключения */}
            </div>
            {/* Кнопка тестирования звука */}
            <button
              onClick={() => {
                console.log('🧪 Тестирование звука по клику пользователя')
                testSound()
              }}
              className="w-4 h-4 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
              title="Проверить звуковые уведомления"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={onCreateNewChat}
            className="p-1 text-primary hover:bg-primary/10 rounded-md transition-colors chat-create-button"
            title="Создать новый чат"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Список чатов */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div className="p-4">
            <div className="bg-destructive/10 border border-destructive rounded-lg p-3">
              <p className="text-sm text-destructive">{error}</p>
              <button
                onClick={() => loadChats(true)}
                className="text-xs text-destructive hover:text-destructive/80 mt-1 transition-colors chat-retry-button"
              >
                Попробовать снова
              </button>
            </div>
          </div>
        )}

        {chats.length === 0 && !error ? (
          <div className="px-3 py-4 text-center">
            <div className="py-6">
              <svg className="w-8 h-8 mx-auto text-muted-foreground mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-muted-foreground text-sm mb-2">У вас пока нет чатов</p>
              <button
                onClick={onCreateNewChat}
                className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
              >
                Создать первый чат
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100">
              {chats.map((chat) => (
                <ChatListItem
                  key={chat.id}
                  chat={chat}
                  onClick={() => onChatSelect(chat)}
                  isSelected={selectedChatId === chat.id}
                  formatLastMessageTime={formatLastMessageTime}
                  truncateText={truncateText}
                />
              ))}
            </div>
            {/* RandomFact и UserCounter только на мобильных устройствах */}
            <div className="md:hidden">
              <div className="mobile-chatlist-random-fact">
                <RandomFact />
              </div>
              <div className="mt-4">
                <UserCounter />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
})

ChatList.displayName = 'ChatList'

export default ChatList
