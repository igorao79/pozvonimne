import { useState, useEffect, useCallback } from 'react'
import { Message, RealtimeMessagePayload } from '@/components/Chat/ChatInterface/types'
import useSupabaseStore from '@/store/useSupabaseStore'
import useChatSyncStore from '@/store/useChatSyncStore'
import useChatConnectionMonitor from '@/hooks/useChatConnectionMonitor'
// import useChatPollingFallback from '@/hooks/useChatPollingFallback' // ОТКЛЮЧЕНО - только realtime

interface UseChatMessagesProps {
  chatId: string
  userId?: string
  isActive?: boolean // Активен ли чат в данный момент
}

export const useChatMessages = ({ chatId, userId, isActive = true }: UseChatMessagesProps) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMoreMessages, setHasMoreMessages] = useState(true)
  const [error, setError] = useState<string | undefined>(undefined)

  const { supabase } = useSupabaseStore()
  const { refreshChatList } = useChatSyncStore()
  
  // Мониторинг соединения и fallback polling
  const {
    updateMessageReceived,
    isConnectionHealthy,
    getConnectionScore,
    sendPing
  } = useChatConnectionMonitor({
    chatId,
    userId: userId || null,
    isActive,
    onConnectionIssue: () => {
      console.warn('⚠️ ChatMessages: Connection issue detected, may need recovery')
      setError('Проблемы с соединением, проверяем...')
    }
  })
  
  // ОТКЛЮЧЕНО: Polling fallback - только realtime
  // const {
  //   isPollingActive,
  //   forcePoll,
  //   getPollingStats
  // } = useChatPollingFallback({
  //   chatId,
  //   userId: userId || null,
  //   isActive,
  //   onNewMessage: (message) => {
  //     console.log('📊 ChatMessages: Message received via polling fallback')
  //     handleNewMessage(message)
  //   },
  //   isRealtimeHealthy: isConnectionHealthy()
  // })

  // Заглушки для отключенных функций
  const isPollingActive = false
  const forcePoll = () => {}
  const getPollingStats = () => ({})

  // Загрузка сообщений
  const loadMessages = useCallback(async () => {
    try {
      setLoading(true)
      setError(undefined)

      // Пропускаем проверку участников для избежания рекурсии RLS
      // Функция get_chat_messages уже проверяет доступ внутри

      // Теперь безопасно загружаем сообщения
      const { data, error: messagesError } = await supabase.rpc('get_chat_messages', {
        chat_uuid: chatId,
        limit_count: 30
      })

      if (messagesError) {
        console.error('Ошибка загрузки сообщений:', messagesError)

        // Если это новый чат без сообщений, это нормально
        if (messagesError.message?.includes('not a participant')) {
          console.log('Новый чат или нет доступа к сообщениям')
          setMessages([])
          setHasMoreMessages(false)
        } else {
          setError('Ошибка загрузки сообщений')
          setHasMoreMessages(false)
        }
        return
      }

      // Сообщения приходят в обратном порядке (новые первые), сортируем по времени (старые первыми)
      const sortedMessages = (data || []).sort((a: Message, b: Message) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      console.log('📨 Загружено сообщений:', sortedMessages.length)

      // Проверяем, есть ли еще сообщения для загрузки
      setHasMoreMessages(sortedMessages.length >= 30)

      // Фильтруем дубликаты перед установкой сообщений
      const uniqueMessages = sortedMessages.filter((message: Message, index: number, arr: Message[]) =>
        arr.findIndex((m: Message) => m.id === message.id) === index
      )

      console.log(`📨 Загружено ${sortedMessages.length} сообщений, уникальных: ${uniqueMessages.length}`)
      setMessages(uniqueMessages)

      // УБРАНО: Автоматическая пометка всех сообщений как прочитанных при загрузке
      // Теперь сообщения помечаются как прочитанные только при их фактической видимости
      // Это предотвращает ложную пометку непросмотренных сообщений
    } catch (err) {
      console.error('Ошибка:', err)
      setError('Ошибка подключения')
      setHasMoreMessages(false)
    } finally {
      setLoading(false)
    }
  }, [chatId, supabase])

  // Загрузка дополнительных сообщений (пагинация)
  const loadMoreMessages = useCallback(async () => {
    if (!hasMoreMessages || loadingMore) return

    try {
      setLoadingMore(true)
      console.log('📜 Загружаем дополнительные сообщения, текущий offset:', messages.length)

      const { data, error: messagesError } = await supabase.rpc('get_chat_messages', {
        chat_uuid: chatId,
        limit_count: 30,
        offset_count: messages.length
      })

      if (messagesError) {
        console.error('Ошибка загрузки дополнительных сообщений:', messagesError)
        setHasMoreMessages(false)
        return
      }

      const newMessages = (data || []).reverse()
      console.log('📜 Загружено дополнительных сообщений:', newMessages.length)

      // Проверяем, есть ли еще сообщения
      setHasMoreMessages(newMessages.length >= 30)

      // Добавляем новые сообщения в начало массива (старые сообщения)
      if (newMessages.length > 0) {
        setMessages(prev => {
          // Фильтруем дубликаты среди новых сообщений
          const uniqueNewMessages = newMessages.filter((message: Message, index: number, arr: Message[]) =>
            arr.findIndex((m: Message) => m.id === message.id) === index
          )

          // Объединяем сообщения: новые старые сообщения + существующие
          const combined = [...uniqueNewMessages, ...prev]
          const finalUnique = combined.filter((message: Message, index: number, arr: Message[]) =>
            arr.findIndex((m: Message) => m.id === message.id) === index
          )

          // Сортируем по времени создания (старые сообщения первыми для корректной группировки по дням)
          finalUnique.sort((a: Message, b: Message) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )

          console.log('📜 Финальная сортировка сообщений:', {
            total: finalUnique.length,
            first: finalUnique[0]?.created_at,
            last: finalUnique[finalUnique.length - 1]?.created_at
          })

          return finalUnique
        })
      }

    } catch (err) {
      console.error('Ошибка загрузки дополнительных сообщений:', err)
      setHasMoreMessages(false)
    } finally {
      setLoadingMore(false)
    }
  }, [chatId, messages.length, hasMoreMessages, loadingMore, supabase])

  // Загружаем сообщения при монтировании
  useEffect(() => {
    console.log('🔄 Загружаем сообщения для чата:', chatId)
    loadMessages()
  }, [chatId, loadMessages])

  // Отправка сообщения
  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || sending || !userId) return { success: false, text: messageText }

    const text = messageText.trim()
    setSending(true)

    try {
      // Создаем временное сообщение для немедленного отображения
      const tempMessage: Message = {
        id: `temp_${Date.now()}`, // Временный ID
        chat_id: chatId,
        sender_id: userId,
        sender_name: 'Вы',
        sender_avatar: undefined,
        content: text,
        type: 'text',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        edited_at: undefined,
        is_deleted: false,
        reply_to_id: undefined,
        reply_to_content: undefined,
        reply_to_sender_name: undefined,
        metadata: {},
        delivered_at: undefined, // Пока не доставлено
        read_at: undefined      // Пока не прочитано
      }

      // Добавляем сообщение локально для немедленного отображения
      setMessages(prev => [...prev, tempMessage])

      // Отправляем сообщение на сервер
      const { data: messageId, error: sendError } = await supabase.rpc('send_message', {
        chat_uuid: chatId,
        message_content: text,
        message_type: 'text'
      })

      if (sendError) {
        console.error('Ошибка отправки сообщения:', sendError)
        // Удаляем временное сообщение и показываем ошибку
        setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id))
        setError('Ошибка отправки сообщения')
        return { success: false, text }
      }

      console.log('✅ Сообщение отправлено:', messageId)

      // 🔥 ГЛОБАЛЬНОЕ УВЕДОМЛЕНИЕ: Отправляем broadcast для всех пользователей
      try {
        await supabase.channel('global_chat_notifications').send({
          type: 'broadcast',
          event: 'new_message',
          payload: {
            messageId: messageId,
            chatId: chatId,
            senderId: userId,
            content: text,
            timestamp: new Date().toISOString()
          }
        })
        console.log('📡 Глобальное broadcast уведомление отправлено для всех пользователей')
      } catch (broadcastError) {
        console.error('⚠️ Ошибка отправки broadcast уведомления:', broadcastError)
      }

      // Обновляем временное сообщение реальным ID
      setMessages(prev => prev.map(msg =>
        msg.id === tempMessage.id
          ? { ...msg, id: messageId }
          : msg
      ))

      // 🔥 УБРАНО: Принудительное обновление больше не нужно - прямые подписки сами обновляют
      // ChatList теперь получает обновления через прямую подписку на изменения messages

      return { success: true }

    } catch (err) {
      console.error('Ошибка:', err)
      setError('Ошибка подключения')
      return { success: false, text }
    } finally {
      setSending(false)
    }
  }, [chatId, userId, sending, supabase])

  // Обработка новых сообщений из realtime
  const handleNewMessage = useCallback((messageData: RealtimeMessagePayload & { _isUpdate?: boolean, _oldRecord?: any }) => {
    // Уведомляем монитор соединения о получении сообщения
    updateMessageReceived()
    
    // 🔥 УБРАНО: Принудительное обновление больше не нужно - прямые подписки сами обновляют
    // ChatList теперь получает обновления через прямую подписку на изменения messages
    
    // Очищаем ошибки при получении сообщений
    if (error) {
      setError(undefined)
    }
    
    if (!messageData.id || !messageData.chat_id) {
      console.warn('📡 Неполные данные сообщения:', messageData)
      return
    }

    // Проверяем, что сообщение относится к текущему чату
    if (messageData.chat_id !== chatId) {
      console.log('📡 Сообщение не для этого чата, игнорируем')
      return
    }

    setMessages(prev => {
      // Если это обновление существующего сообщения
      if (messageData._isUpdate) {
        console.log('📡 Обновляем существующее сообщение:', {
          messageId: messageData.id?.slice(0, 8),
          oldReadAt: messageData._oldRecord?.read_at,
          newReadAt: messageData.read_at,
          isReadStatusUpdate: !messageData._oldRecord?.read_at && messageData.read_at
        })

        return prev.map(msg => {
          if (msg.id === messageData.id) {
            // Обновляем сообщение новыми данными
            const updatedMessage = {
              ...msg,
              content: messageData.content,
              updated_at: messageData.updated_at,
              edited_at: messageData.edited_at,
              is_deleted: messageData.is_deleted || false,
              reply_to_id: undefined,
              reply_to_content: undefined,
              reply_to_sender_name: undefined,
              metadata: messageData.metadata || {},
              delivered_at: messageData.delivered_at, // Поле доставки
              read_at: messageData.read_at          // Поле прочтения
            }
            
            console.log('✅ Сообщение обновлено:', {
              messageId: msg.id?.slice(0, 8),
              wasRead: !!msg.read_at,
              nowRead: !!updatedMessage.read_at,
              readAtValue: updatedMessage.read_at
            })
            
            return updatedMessage
          }
          return msg
        })
      }

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
        edited_at: messageData.edited_at,
        is_deleted: messageData.is_deleted || false,
        reply_to_id: undefined,
        reply_to_content: undefined,
        reply_to_sender_name: undefined,
        metadata: messageData.metadata || {},
        delivered_at: messageData.delivered_at, // Поле доставки
        read_at: messageData.read_at          // Поле прочтения
      }

      // Добавляем новое сообщение, предварительно фильтруя дубликаты
      const newMessages = [...prev, newMessage]
      const uniqueMessages = newMessages.filter((message: Message, index: number, arr: Message[]) =>
        arr.findIndex((m: Message) => m.id === message.id) === index
      )

      return uniqueMessages
    })

    // УБРАНО: Автоматическая пометка как прочитанного при получении сообщения
    // Теперь это обрабатывается через отслеживание видимости в MessageItem компоненте
    // Это предотвращает автоматическую пометку сообщений как прочитанных без их просмотра

    // УБРАНО: Вызов refreshChatList() в handleNewMessage вызывает бесконечный цикл
    // Обновление списка чатов теперь происходит через глобальную синхронизацию realtime
  }, [chatId, userId, supabase, updateMessageReceived, error])

  return {
    messages,
    loading,
    sending,
    loadingMore,
    hasMoreMessages,
    error,
    loadMessages,
    loadMoreMessages,
    sendMessage,
    handleNewMessage,
    setError,
    // Дополнительные диагностические данные
    connectionHealth: {
      isHealthy: isConnectionHealthy(),
      score: getConnectionScore(),
      isPollingActive,
      pollingStats: getPollingStats(),
      sendPing,
      forcePoll
    }
  }
}
