'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import useCallStore from '@/store/useCallStore'
import useUsers from '@/hooks/useUsers'

interface Message {
  id: string
  chat_id: string
  sender_id: string
  sender_name: string
  sender_avatar?: string
  content: string
  type: string
  created_at: string
  updated_at: string
  edited_at?: string
  is_deleted: boolean
  reply_to_id?: string
  reply_to_content?: string
  reply_to_sender_name?: string
  metadata: any
}

// Типы для realtime payload
interface RealtimeMessagePayload {
  id: string
  chat_id: string
  sender_id: string
  content: string
  type?: string
  created_at: string
  updated_at: string
  is_deleted?: boolean
  metadata?: any
}

interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new?: RealtimeMessagePayload
  old?: RealtimeMessagePayload
}

interface Chat {
  id: string
  type: 'private' | 'group'
  name: string
  avatar_url?: string
  other_participant_id?: string
  other_participant_name?: string
  other_participant_avatar?: string
}

interface ChatInterfaceProps {
  chat: Chat
  onBack: () => void
}

const ChatInterface = ({ chat, onBack }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { userId, startCall, isInCall } = useCallStore()
  const { users } = useUsers()
  const supabase = createClient()

  // Загрузка сообщений
  const loadMessages = async () => {
    try {
      setLoading(true)
      setError(null)

      // Пропускаем проверку участников для избежания рекурсии RLS
      // Функция get_chat_messages уже проверяет доступ внутри

      // Теперь безопасно загружаем сообщения
      const { data, error: messagesError } = await supabase.rpc('get_chat_messages', {
        chat_uuid: chat.id,
        limit_count: 50
      })

      if (messagesError) {
        console.error('Ошибка загрузки сообщений:', messagesError)
        
        // Если это новый чат без сообщений, это нормально
        if (messagesError.message?.includes('not a participant')) {
          console.log('Новый чат или нет доступа к сообщениям')
          setMessages([])
        } else {
          setError('Ошибка загрузки сообщений')
        }
        return
      }

      // Сообщения приходят в обратном порядке (новые первые), переворачиваем
      const reversedMessages = (data || []).reverse()
      console.log('📨 Загружено сообщений:', reversedMessages.length)
      setMessages(reversedMessages)

      // Помечаем сообщения как прочитанные
      try {
        await supabase.rpc('mark_messages_as_read', { chat_uuid: chat.id })
      } catch (markError) {
        console.warn('Не удалось пометить сообщения как прочитанные:', markError)
        // Это не критичная ошибка
      }
    } catch (err) {
      console.error('Ошибка:', err)
      setError('Ошибка подключения')
    } finally {
      setLoading(false)
    }
  }

  // Загружаем сообщения при монтировании
  useEffect(() => {
    console.log('🔄 Загружаем сообщения для чата:', chat.id)
    loadMessages()
  }, [chat.id])

  // Скролл к последнему сообщению
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    console.log('📜 Скроллим к низу, сообщений:', messages.length)
    scrollToBottom()
  }, [messages])

  // Получение статуса пользователя (теперь обновляется автоматически через realtime)
  const getUserStatus = (userId?: string) => {
    if (!userId) return 'Неизвестно'

    console.log('🔍 Проверяем статус для пользователя:', userId)
    console.log('👥 Все пользователи:', users.map(u => ({ id: u.id.substring(0, 8), status: u.status, last_seen: u.last_seen })))

    const user = users.find(u => u.id === userId)
    console.log('🎯 Найден пользователь:', user)

    if (!user) {
      console.log('⚠️ Пользователь не найден, возвращаем "Загрузка..."')
      return 'Загрузка...'
    }

    // Возвращаем статус напрямую из базы данных (теперь обновляется в realtime)
    console.log('📋 Возвращаем статус из базы данных:', user.status)
    return user.status === 'online' ? 'онлайн' : 'оффлайн'
  }

  // Realtime подписка на изменения пользователей (для обновления статуса в реальном времени)
  useEffect(() => {
    console.log('📡 Настраиваем realtime подписку на изменения пользователей в чате')

    const userChannel = supabase
      .channel('chat_user_status_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_profiles'
        },
        (payload) => {
          console.log('👤 Изменение статуса пользователя:', payload)
          // При изменении любого пользователя обновляем весь список
          if (payload.eventType === 'UPDATE' && payload.new?.id) {
            console.log('🔄 Пользователь обновлен:', payload.new.id)
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Статус подписки на изменения пользователей:', status)
      })

    return () => {
      console.log('🔌 Отписываемся от изменений пользователей')
      supabase.removeChannel(userChannel)
    }
  }, [])

  // Realtime подписка на новые сообщения
  useEffect(() => {
    if (!chat.id || !userId) return

    console.log('📡 Подписываемся на сообщения чата:', chat.id, 'Текущее количество сообщений:', messages.length)

    // Создаем стабильное имя канала
    const channelName = `chat_${chat.id}_messages`

    // Проверяем, существует ли уже канал для этого чата
    const existingChannel = supabase.getChannels().find(ch => ch.topic === channelName)

    if (existingChannel && existingChannel.state === 'joined') {
      console.log('📡 Канал уже существует и подключен, пропускаем создание')
      return
    }

    // Очищаем старый канал если он есть в плохом состоянии
    if (existingChannel && existingChannel.state !== 'joined') {
      console.log('🧹 Очищаем канал в плохом состоянии:', existingChannel.state)
      supabase.removeChannel(existingChannel)
    }

    console.log('📡 Создаем новый канал для чата:', chat.id)

    // Создаем новый канал с улучшенной обработкой
    const messagesChannel = supabase
      .channel(channelName)
      .on('postgres_changes',
        {
          event: 'INSERT', // Только INSERT для новых сообщений
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chat.id}` // Фильтр по chat_id
        },
        (payload: any) => {
          console.log('📡 Новое сообщение в чате:', payload)

          if (!payload.new) return

          const messageData = payload.new as RealtimeMessagePayload

          if (!messageData.id || !messageData.chat_id) {
            console.warn('📡 Неполные данные сообщения:', messageData)
            return
          }

          // Проверяем, что сообщение относится к текущему чату
          if (messageData.chat_id !== chat.id) {
            console.log('📡 Сообщение не для этого чата, игнорируем')
            return
          }

          setMessages(prev => {
            console.log('📡 setMessages вызвана с предыдущим состоянием:', prev.length, 'сообщений')

            // Проверяем, не добавляли ли уже это сообщение
            const existingMessage = prev.find(msg => msg.id === messageData.id)
            if (existingMessage) {
              console.log('📡 Сообщение уже существует, пропускаем')
              return prev
            }

            // Проверяем на дубликаты по содержимому (для временных сообщений)
            const duplicateByContent = prev.find(msg =>
              msg.content === messageData.content &&
              msg.sender_id === messageData.sender_id &&
              Math.abs(new Date(msg.created_at).getTime() - new Date(messageData.created_at).getTime()) < 5000 // 5 секунд
            )

            if (duplicateByContent) {
              console.log('📡 Найден дубликат по содержимому, обновляем ID')
              const updatedMessages = prev.map(msg =>
                msg.id === duplicateByContent.id
                  ? {
                      ...msg,
                      id: messageData.id,
                      updated_at: messageData.updated_at,
                      is_deleted: messageData.is_deleted || false
                    }
                  : msg
              )
              console.log('📡 Новое состояние после обновления дубликата:', updatedMessages.length, 'сообщений')
              return updatedMessages
            }

            // Добавляем новое сообщение
            console.log('📡 Добавляем новое сообщение в список')
            const newMessage: Message = {
              id: messageData.id,
              chat_id: messageData.chat_id,
              sender_id: messageData.sender_id,
              sender_name: messageData.sender_id === userId ? 'Вы' : 'Собеседник',
              sender_avatar: undefined,
              content: messageData.content,
              type: messageData.type || 'text',
              created_at: messageData.created_at,
              updated_at: messageData.updated_at,
              is_deleted: messageData.is_deleted || false,
              metadata: messageData.metadata || {}
            }

            const newMessages = [...prev, newMessage]
            console.log('📡 Новое состояние с добавленным сообщением:', newMessages.length, 'сообщений')
            return newMessages
          })

          // Помечаем как прочитанное, если это не наше сообщение
          if (messageData.sender_id !== userId) {
            setTimeout(async () => {
              try {
                await supabase.rpc('mark_messages_as_read', { chat_uuid: chat.id })
              } catch (err) {
                console.warn('Ошибка пометки как прочитанного:', err)
              }
            }, 200)
          }
        }
      )
      .subscribe((status, err) => {
        console.log('📡 Статус канала сообщений:', status, err ? `Ошибка: ${err}` : '')

        if (status === 'SUBSCRIBED') {
          console.log('📡 Успешно подписались на сообщения чата:', chat.id)
        } else if (status === 'CHANNEL_ERROR') {
          console.error('📡 Ошибка канала сообщений:', err)
        } else if (status === 'TIMED_OUT') {
          console.warn('📡 Таймаут канала сообщений, переподключение...')
        } else if (status === 'CLOSED') {
          console.log('📡 Канал сообщений закрыт')
        }
      })

    // Очистка при размонтировании
    return () => {
      console.log('📡 Компонент ChatInterface размонтирован, закрываем канал сообщений для чата:', chat.id, 'Сообщений было:', messages.length)
      supabase.removeChannel(messagesChannel)
    }
  }, [chat.id, userId])

  // Отправка сообщения
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim() || sending || !userId) return

    const messageText = newMessage.trim()
    setNewMessage('')
    setSending(true)

    try {
      // Создаем временное сообщение для немедленного отображения
      const tempMessage: Message = {
        id: `temp_${Date.now()}`, // Временный ID
        chat_id: chat.id,
        sender_id: userId,
        sender_name: 'Вы',
        sender_avatar: undefined,
        content: messageText,
        type: 'text',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_deleted: false,
        metadata: {}
      }

      // Добавляем сообщение локально для немедленного отображения
      setMessages(prev => [...prev, tempMessage])

      // Отправляем сообщение на сервер
      const { data: messageId, error: sendError } = await supabase.rpc('send_message', {
        chat_uuid: chat.id,
        message_content: messageText,
        message_type: 'text'
      })

      if (sendError) {
        console.error('Ошибка отправки сообщения:', sendError)
        // Удаляем временное сообщение и показываем ошибку
        setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id))
        setError('Ошибка отправки сообщения')
        setNewMessage(messageText) // Возвращаем текст в поле
        return
      }

      console.log('✅ Сообщение отправлено:', messageId)

      // Обновляем временное сообщение реальным ID
      setMessages(prev => prev.map(msg =>
        msg.id === tempMessage.id
          ? { ...msg, id: messageId }
          : msg
      ))

    } catch (err) {
      console.error('Ошибка:', err)
      setError('Ошибка подключения')
      setNewMessage(messageText) // Возвращаем текст в поле
    } finally {
      setSending(false)
    }
  }

  // Форматирование времени сообщения
  const formatMessageTime = (timestamp: string) => {
    const messageDate = new Date(timestamp)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const msgDate = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate())

    if (msgDate.getTime() === today.getTime()) {
      return messageDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    }

    const diffInDays = Math.floor((today.getTime() - msgDate.getTime()) / (1000 * 60 * 60 * 24))
    if (diffInDays === 1) {
      return `вчера ${messageDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
    }

    return messageDate.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }


  // Обработка звонка
  const handleCall = async () => {
    console.log('📞 HandleCall: Нажата кнопка звонка', {
      chatType: chat.type,
      otherParticipantId: chat.other_participant_id,
      chatId: chat.id,
      chatName: chat.name
    })

    if (chat.type === 'private' && chat.other_participant_id) {
      console.log('📞 HandleCall: Запускаем звонок к пользователю:', chat.other_participant_id)

      // Отправляем сигнал incoming_call receiver'у
      try {
        const receiverChannelId = `calls:${chat.other_participant_id}`
        console.log('📞 HandleCall: Отправляем сигнал в канал:', receiverChannelId)

        const result = await supabase.channel(receiverChannelId).send({
          type: 'broadcast',
          event: 'incoming_call',
          payload: {
            caller_id: userId,
            caller_name: chat.name || 'Неизвестный пользователь',
            timestamp: Date.now()
          }
        })

        console.log('📞 HandleCall: Сигнал incoming_call отправлен:', result)

        if (result === 'ok') {
          // Теперь запускаем локальную логику звонка
          startCall(chat.other_participant_id)
        } else {
          console.error('📞 HandleCall: Ошибка отправки сигнала incoming_call:', result)
          setError('Ошибка отправки сигнала звонка')
        }
      } catch (err) {
        console.error('📞 HandleCall: Ошибка при отправке сигнала:', err)
        setError('Ошибка подключения к звонку')
      }
    } else {
      console.warn('📞 HandleCall: Невозможно запустить звонок', {
        reason: chat.type !== 'private' ? 'Не приватный чат' : 'Нет ID собеседника',
        chatType: chat.type,
        hasOtherParticipant: !!chat.other_participant_id
      })
    }
  }

  console.log('🎨 ChatInterface рендерится, сообщений:', messages.length, 'чат:', chat.id)

  return (
    <div className="h-full flex flex-col">
      {/* Заголовок чата */}
      <div className="p-4 border-b bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Кнопка назад */}
            <button
              onClick={onBack}
              className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Аватар */}
            <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex-shrink-0">
              {(chat.avatar_url || chat.other_participant_avatar) ? (
                <img
                  src={chat.avatar_url || chat.other_participant_avatar}
                  alt={chat.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {chat.name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
              )}
            </div>

            {/* Имя */}
            <div>
              <h2 className="font-semibold text-foreground">{chat.name}</h2>
              {chat.type === 'private' && chat.other_participant_id && (
                <p className="text-xs text-muted-foreground">
                  {(() => {
                    const status = getUserStatus(chat.other_participant_id)
                    console.log('📊 Отображаемый статус для', chat.other_participant_id, ':', status)
                    return status
                  })()}
                </p>
              )}
            </div>
          </div>

          {/* Кнопка звонка */}
          {chat.type === 'private' && chat.other_participant_id && (
            <button
              onClick={handleCall}
              disabled={isInCall}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21L6.16 11.37a11.045 11.045 0 005.516 5.516l1.983-4.064a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Позвонить
            </button>
          )}
        </div>
      </div>

      {/* Область сообщений */}
      <div className="flex-1 overflow-y-auto p-4 bg-background">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Загрузка сообщений...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
                <p className="text-destructive mb-2">{error}</p>
              <button
                onClick={loadMessages}
                className="text-primary hover:text-primary/80 text-sm transition-colors"
              >
                Попробовать снова
              </button>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
                <svg className="w-12 h-12 mx-auto text-muted-foreground mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-muted-foreground mb-2">Сообщений пока нет</p>
              <p className="text-sm text-muted-foreground/70">Начните переписку</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              const isOwn = message.sender_id === userId
              console.log('📝 Рендерим сообщение:', message.id, message.content.substring(0, 20) + '...')

              return (
                <div
                  key={`${message.id}-${message.updated_at}`}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    isOwn 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-card text-foreground border border-border'
                  }`}>
                    {!isOwn && chat.type === 'group' && (
                      <p className="text-xs text-muted-foreground mb-1">{message.sender_name}</p>
                    )}
                    
                    <p className="text-sm">{message.content}</p>
                    
                    <p className={`text-xs mt-1 ${
                      isOwn ? 'text-indigo-200 dark:text-indigo-100' : 'text-muted-foreground'
                    }`}>
                      {formatMessageTime(message.created_at)}
                    </p>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Форма отправки сообщения */}
      <div className="p-4 bg-card border-t border-border">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Напишите сообщение..."
            disabled={sending}
            className="flex-1 px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring placeholder:text-muted-foreground disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ChatInterface
