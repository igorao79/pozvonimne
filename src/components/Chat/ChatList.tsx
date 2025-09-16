'use client'

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { createClient } from '@/utils/supabase/client'
import useCallStore from '@/store/useCallStore'

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
  const supabase = createClient()

  // Загрузка чатов
  const loadChats = async () => {
    if (!userId) return

    try {
      setLoading(true)
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
      setLoading(false)
    }
  }

  // Загружаем чаты при монтировании и изменении userId
  useEffect(() => {
    loadChats()
  }, [userId])

  // Экспортируем методы для внешнего использования
  useImperativeHandle(ref, () => ({
    refreshChats: loadChats,
    findAndSelectChat: async (chatId: string) => {
      await loadChats()
      const chat = chats.find(c => c.id === chatId)
      if (chat) {
        onChatSelect(chat)
        return chat
      }
      return null
    }
  }), [chats, onChatSelect])

  // Realtime подписка на изменения чатов
  useEffect(() => {
    if (!userId) return

    console.log('📡 Подписываемся на обновления чатов для пользователя:', userId)

    // Подписка на изменения в чатах
    const chatsChannel = supabase
      .channel('chats_updates')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'chats' 
        }, 
        (payload) => {
          console.log('📡 Изменение в чатах:', payload)
          // Быстрое обновление без задержки
          setTimeout(() => loadChats(), 100)
        }
      )
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'messages' 
        }, 
        (payload) => {
          console.log('📡 Новое сообщение:', payload)
          // Быстрое обновление без задержки
          setTimeout(() => loadChats(), 100)
        }
      )
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'chat_participants' 
        }, 
        (payload) => {
          console.log('📡 Изменение участников чата:', payload)
          // Быстрое обновление без задержки
          setTimeout(() => loadChats(), 100)
        }
      )
      .subscribe()

    return () => {
      console.log('📡 Отписываемся от обновлений чатов')
      supabase.removeChannel(chatsChannel)
    }
  }, [userId, supabase])

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
    <div className="h-full flex flex-col overflow-hidden">
      {/* Ультракомпактный заголовок */}
      <div className="px-2 py-1 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center justify-between min-h-[32px]">
          <h1 className="text-sm font-semibold text-foreground">Чаты</h1>
          <button
            onClick={onCreateNewChat}
            className="p-1 text-primary hover:bg-primary/10 rounded-md transition-colors"
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
                onClick={loadChats}
                className="text-xs text-destructive hover:text-destructive/80 mt-1 transition-colors"
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
          <div className="divide-y divide-gray-100">
            {chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => onChatSelect(chat)}
                className={`px-2 py-1.5 hover:bg-muted cursor-pointer transition-colors chat-list-item ${
                  selectedChatId === chat.id ? 'bg-primary/10 border-r-2 border-primary' : ''
                }`}
              >
                <div className="flex items-center space-x-1.5">
                  {/* Ультракомпактный аватар */}
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex-shrink-0 chat-avatar">
                    {(chat.avatar_url || chat.other_participant_avatar) ? (
                      <img
                        src={chat.avatar_url || chat.other_participant_avatar}
                        alt={chat.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                        <span className="text-white font-medium text-xs">
                          {chat.name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Информация о чате */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-foreground text-sm truncate">
                        {chat.name}
                      </h3>
                      <div className="flex items-center space-x-1">
                        {chat.last_message_at && (
                          <span className="text-xs text-muted-foreground">
                            {formatLastMessageTime(chat.last_message_at)}
                          </span>
                        )}
                        {chat.unread_count > 0 && (
                          <div className="bg-primary text-primary-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center">
                            {chat.unread_count > 99 ? '99+' : chat.unread_count}
                          </div>
                        )}
                      </div>
                    </div>

                    {chat.last_message && (
                      <p className="text-xs text-muted-foreground truncate mt-0">
                        {chat.last_message_sender_name && chat.type === 'group' && (
                          <span className="text-muted-foreground/70">{chat.last_message_sender_name}: </span>
                        )}
                        {truncateText(chat.last_message, 35)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
})

ChatList.displayName = 'ChatList'

export default ChatList
