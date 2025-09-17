import { useState, useEffect, useCallback } from 'react'
import { Message, RealtimeMessagePayload } from '@/components/Chat/ChatInterface/types'
import useSupabaseStore from '@/store/useSupabaseStore'
import useChatSyncStore from '@/store/useChatSyncStore'

interface UseChatMessagesProps {
  chatId: string
  userId?: string
}

export const useChatMessages = ({ chatId, userId }: UseChatMessagesProps) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  const { supabase } = useSupabaseStore()
  const { refreshChatList } = useChatSyncStore()

  // Загрузка сообщений
  const loadMessages = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Пропускаем проверку участников для избежания рекурсии RLS
      // Функция get_chat_messages уже проверяет доступ внутри

      // Теперь безопасно загружаем сообщения
      const { data, error: messagesError } = await supabase.rpc('get_chat_messages', {
        chat_uuid: chatId,
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
          console.log('📖 Помечаем сообщения как прочитанные для чата:', chatId)
          await supabase.rpc('mark_messages_as_read', { chat_uuid: chatId })
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
  }, [chatId, supabase])

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
        is_deleted: false,
        metadata: {}
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

      // Обновляем временное сообщение реальным ID
      setMessages(prev => prev.map(msg =>
        msg.id === tempMessage.id
          ? { ...msg, id: messageId }
          : msg
      ))

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
  const handleNewMessage = useCallback((messageData: RealtimeMessagePayload) => {
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
          await supabase.rpc('mark_messages_as_read', { chat_uuid: chatId })
        } catch (err) {
          console.warn('Ошибка пометки как прочитанного:', err)
        }
      }, 200)
    }

    // Уведомляем о новом сообщении через Zustand для обновления списка чатов
    refreshChatList()
  }, [chatId, userId, supabase, refreshChatList])

  return {
    messages,
    loading,
    sending,
    error,
    loadMessages,
    sendMessage,
    handleNewMessage,
    setError
  }
}
