'use client'

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import useSupabaseStore from '@/store/useSupabaseStore'
import useChatSyncStore from '@/store/useChatSyncStore'
import useCallStore from '@/store/useCallStore'
import { ChatListItem } from './ChatListItem'
import { RandomFact } from '@/components/ui/random-fact'

interface Chat {
  id: string
  type: 'private' | 'group'
  name: string
  avatar_url?: string
  last_message?: string
  last_message_at?: string
  last_message_sender_name?: string
  unread_count: number
  other_participant_id?: string
  other_participant_name?: string
  other_participant_avatar?: string
  created_at: string
}

interface ChatListProps {
  onChatSelect: (chat: Chat) => void
  onCreateNewChat: () => void
  selectedChatId?: string | undefined
}

const ChatList = forwardRef<any, ChatListProps>(({ onChatSelect, onCreateNewChat, selectedChatId }, ref) => {
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { userId } = useCallStore()
  const { supabase } = useSupabaseStore()
  const { refreshChatList, registerRefreshCallback, lastMessageUpdate } = useChatSyncStore()

  // Загрузка чатов с опциональным лоадером
  const loadChats = async (showLoader = false) => {
    if (!userId) return

    try {
      if (showLoader) {
        setLoading(true)
      }
      setError(null)

      const { data, error: chatsError } = await supabase.rpc('get_user_chats')

      if (chatsError) {
        console.error('Ошибка загрузки чатов:', chatsError)
        setError('Ошибка загрузки чатов')
        return
      }

      setChats(data || [])
    } catch (err) {
      console.error('Ошибка:', err)
      setError('Ошибка подключения')
    } finally {
      if (showLoader) {
        setLoading(false)
      }
    }
  }

  // Загружаем чаты при монтировании и изменении userId (с лоадером)
  useEffect(() => {
    loadChats(true)
  }, [userId])

  // Подписываемся на глобальные обновления через Zustand (без лоадера)
  useEffect(() => {
    const unsubscribe = registerRefreshCallback(() => loadChats(false))
    return unsubscribe
  }, [registerRefreshCallback])

  // Реагируем на изменения lastMessageUpdate (без лоадера)
  useEffect(() => {
    if (lastMessageUpdate > 0) {
      loadChats(false)
    }
  }, [lastMessageUpdate])

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

  // Форматирование времени последнего сообщения
  const formatLastMessageTime = (timestamp?: string) => {
    if (!timestamp) return ''

    const messageDate = new Date(timestamp)
    const now = new Date()
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
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
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
          <h1 className="text-sm font-semibold text-foreground">Чаты</h1>
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
            {/* RandomFact только на мобильных устройствах */}
            <div className="md:hidden">
              <div className="mobile-chatlist-random-fact">
                <RandomFact />
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
