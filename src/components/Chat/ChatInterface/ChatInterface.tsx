'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import useCallStore from '@/store/useCallStore'
import useUsers from '@/hooks/useUsers'

import { ChatHeader } from './ChatHeader'
import { MessagesArea } from './MessagesArea'
import { MessageInput } from './MessageInput'
import { Message, RealtimeMessagePayload, Chat, ChatInterfaceProps } from './types'

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
  const loadMessages = useCallback(async () => {
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

      // Помечаем сообщения как прочитанные сразу после загрузки
      if (messages.length > 0) {
        try {
          console.log('📖 Помечаем сообщения как прочитанные для чата:', chat.id)
          await supabase.rpc('mark_messages_as_read', { chat_uuid: chat.id })
          console.log('✅ Сообщения помечены как прочитанные')
        } catch (markError) {
          console.warn('Не удалось пометить сообщения как прочитанные:', markError)
          // Это не критичная ошибка
        }
      }
    } catch (err) {
      console.error('Ошибка:', err)
      setError('Ошибка подключения')
    } finally {
      setLoading(false)
    }
  }, [chat.id, supabase])

  // Загружаем сообщения при монтировании
  useEffect(() => {
    console.log('🔄 Загружаем сообщения для чата:', chat.id)
    loadMessages()
  }, [chat.id, loadMessages])

  // Скролл к последнему сообщению
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      // Используем requestAnimationFrame для лучшей синхронизации
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
          inline: 'nearest'
        })
      })
    }
  }, [])

  // Автоматическая прокрутка при загрузке сообщений
  useEffect(() => {
    if (!loading && messages.length > 0) {
      console.log('📜 Автоматическая прокрутка к низу после загрузки, сообщений:', messages.length)
      // Небольшая задержка для того, чтобы DOM полностью обновился
      const timeoutId = setTimeout(() => {
        scrollToBottom()
      }, 100)
      return () => clearTimeout(timeoutId)
    }
  }, [messages.length, loading, scrollToBottom])

  // Прокрутка при получении новых сообщений
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      // Прокручиваем вниз для всех новых сообщений
      console.log('📜 Прокрутка к новому сообщению')
      const timeoutId = setTimeout(() => {
        scrollToBottom()
      }, 50)
      return () => clearTimeout(timeoutId)
    }
  }, [messages.length, scrollToBottom])

  // Прокрутка к низу при первом входе в чат (даже если сообщений нет)
  useEffect(() => {
    if (!loading) {
      console.log('📜 Прокрутка к низу при входе в чат')
      const timeoutId = setTimeout(() => {
        scrollToBottom()
      }, 50)
      return () => clearTimeout(timeoutId)
    }
  }, [loading, scrollToBottom])

  // Получение статуса пользователя (теперь обновляется автоматически через realtime)
  const getUserStatus = useCallback((userId?: string) => {
    if (!userId) return 'Неизвестно'

    console.log('🔍 Проверяем статус для пользователя:', userId)
    console.log('👥 Все пользователи:', users.map(u => ({ id: u.id.substring(0, 8), status: u.status, last_seen: u.last_seen })))
    console.log('📊 Количество пользователей:', users.length, 'Загрузка:', loading)

    // Если список пользователей пустой и идет загрузка, показываем "Загрузка..."
    if (users.length === 0 && loading) {
      console.log('⚠️ Список пользователей пустой, идет загрузка, возвращаем "Загрузка..."')
      return 'Загрузка...'
    }

    // Если список пользователей пустой, но загрузка завершена, показываем "Неизвестно"
    if (users.length === 0 && !loading) {
      console.log('⚠️ Список пользователей пустой, загрузка завершена, возвращаем "Неизвестно"')
      return 'Неизвестно'
    }

    const user = users.find(u => u.id === userId)
    console.log('🎯 Найден пользователь:', user)

    if (!user) {
      console.log('⚠️ Пользователь не найден в списке из', users.length, 'пользователей')
      return 'Неизвестно'
    }

    // Возвращаем статус напрямую из базы данных (теперь обновляется в realtime)
    console.log('📋 Возвращаем статус из базы данных:', user.status)
    return user.status === 'online' ? 'онлайн' : 'оффлайн'
  }, [users, loading])

  // Эффект для обработки случаев, когда список пользователей пустой после звонка
  useEffect(() => {
    if (users.length === 0 && !loading) {
      console.log('⚠️ ChatInterface: Список пользователей пустой после загрузки, ждем восстановления realtime подписок')
      // Ждем еще немного, возможно realtime подписки еще восстанавливаются
      const timeoutId = setTimeout(() => {
        console.log('🔄 ChatInterface: Таймаут ожидания пользователей истек, пробуем принудительную перезагрузку')
        // Принудительно обновляем список пользователей через window.dispatchEvent
        // Это вызовет перезагрузку через useUsers хук
        window.dispatchEvent(new CustomEvent('force-refresh-users'))
      }, 3000)

      return () => clearTimeout(timeoutId)
    }
  }, [users.length, loading])

  // Оптимизированная подписка на изменения пользователей
  useEffect(() => {
    if (!chat.other_participant_id) return

    console.log('📡 Настраиваем realtime подписку на изменения пользователей в чате')

    // Уникальное имя канала
    const channelName = `chat_user_status_${chat.id.substring(0, 8)}`
    
    // Очищаем существующие каналы для статуса пользователей
    const existingChannels = supabase.getChannels().filter(ch => ch.topic.includes('user_status'))
    existingChannels.forEach(ch => supabase.removeChannel(ch))

    const userChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_profiles',
          filter: `id=eq.${chat.other_participant_id}` // Фильтр только для собеседника
        },
        (payload) => {
          console.log('👤 Изменение статуса собеседника:', payload)
          // Обновления статуса будут обрабатываться через useUsers хук
        }
      )
      .subscribe((status) => {
        console.log('📡 Статус подписки на изменения пользователей:', status)
      })

    return () => {
      console.log('🔌 Отписываемся от изменений пользователей')
      supabase.removeChannel(userChannel)
    }
  }, [chat.other_participant_id, chat.id]) // Убрали supabase из зависимостей

  // Оптимизированная подписка на новые сообщения
  useEffect(() => {
    if (!chat.id || !userId) return

    console.log('📡 Подписываемся на сообщения чата:', chat.id, 'Текущее количество сообщений:', messages.length)

    let isPollingMode = false
    let pollInterval: NodeJS.Timeout

    const setupMessageSubscription = () => {
      if (isPollingMode) return

      // Создаем стабильное имя канала
      const channelName = `chat_${chat.id}_messages`

      // Очищаем все существующие каналы для этого чата
      const existingChannels = supabase.getChannels().filter(ch => ch.topic.includes(chat.id))
      existingChannels.forEach(ch => supabase.removeChannel(ch))

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
                Math.abs(new Date(msg.created_at).getTime() - new Date(messageData.created_at).getTime()) < 5000
              )

              if (duplicateByContent) {
                console.log('📡 Найден дубликат по содержимому, обновляем ID')
                return prev.map(msg =>
                  msg.id === duplicateByContent.id
                    ? { ...msg, id: messageData.id, updated_at: messageData.updated_at }
                    : msg
                )
              }

              // Добавляем новое сообщение
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

              return [...prev, newMessage]
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
            isPollingMode = false
          } else if (status === 'CHANNEL_ERROR') {
            console.error('📡 Ошибка канала сообщений:', err)
            
            console.log('🚨 CRITICAL REALTIME ERROR - Переключаемся на polling')
            
            supabase.removeChannel(messagesChannel)
            isPollingMode = true
            
            // Включаем режим polling
            pollInterval = setInterval(async () => {
              try {
                await loadMessages()
                console.log('📊 POLLING MODE - Сообщения обновлены')
              } catch (error) {
                console.error('📊 POLLING ERROR:', error)
              }
            }, 3000)
            
            console.log('📊 SWITCHED TO POLLING MODE')
          } else if (status === 'TIMED_OUT') {
            console.warn('📡 Таймаут канала сообщений, переподключение...')
            setTimeout(setupMessageSubscription, 2000)
          } else if (status === 'CLOSED') {
            console.log('📡 Канал сообщений закрыт')
          }
        })

      return messagesChannel
    }

    const channel = setupMessageSubscription()

    return () => {
      console.log('📡 Компонент ChatInterface размонтирован, закрываем канал сообщений для чата:', chat.id, 'Сообщений было:', messages.length)
      
      if (channel) {
        supabase.removeChannel(channel)
      }
      
      if (pollInterval) {
        clearInterval(pollInterval)
        console.log('📊 POLLING CLEARED - Очистили polling интервал')
      }
    }
  }, [chat.id, userId]) // Убрали лишние зависимости

  // Отправка сообщения
  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
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
  }, [newMessage, sending, userId, chat.id, supabase])

  // Обработка звонка
  const handleCall = useCallback(async () => {
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
  }, [chat.type, chat.other_participant_id, chat.id, chat.name, userId, startCall, supabase])

  console.log('🎨 ChatInterface рендерится, сообщений:', messages.length, 'чат:', chat.id)

  return (
    <div className="h-full flex flex-col">
      <ChatHeader
        chat={chat}
        onBack={onBack}
        onCall={handleCall}
        userStatus={chat.type === 'private' && chat.other_participant_id ? getUserStatus(chat.other_participant_id) : undefined}
        isInCall={isInCall}
      />

      <MessagesArea
        messages={messages}
        loading={loading}
        error={error || undefined}
        chat={chat}
        userId={userId || undefined}
        onRetry={loadMessages}
        messagesEndRef={messagesEndRef}
      />

      <MessageInput
        value={newMessage}
        onChange={setNewMessage}
        onSubmit={handleSendMessage}
        sending={sending}
      />
    </div>
  )
}

export default ChatInterface
