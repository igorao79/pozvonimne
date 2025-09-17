'use client'

import { useState, useEffect, useCallback } from 'react'
import useUsers from '@/hooks/useUsers'
import useCallStore from '@/store/useCallStore'

import { ChatHeader } from './ChatHeader'
import { MessagesArea } from './MessagesArea'
import { MessageInput } from './MessageInput'
import { Chat, ChatInterfaceProps } from './types'
import { useTypingUsers } from '@/hooks/useTypingSelectors'
import { useChatMessages } from '@/hooks/useChatMessages'
import { useChatRealtime } from '@/hooks/useChatRealtime'
import { useChatScroll } from '@/hooks/useChatScroll'
import { useChatFocus } from '@/hooks/useChatFocus'
import { useChatActions } from './ChatActions'

const ChatInterface = ({ chat, onBack }: ChatInterfaceProps) => {
  const [newMessage, setNewMessage] = useState('')
  const [error, setError] = useState<string | undefined>(undefined)

  const { userId: rawUserId, isInCall } = useCallStore()
  const { users } = useUsers()

  // Преобразуем null в undefined для совместимости с хуками
  const userId = rawUserId || undefined

  // Получаем typing users из оптимизированного хука (исключаем себя)
  const typingUsers = useTypingUsers(chat.id, userId)

  // Используем кастомные хуки
  const {
    messages,
    loading,
    sending,
    loadMessages,
    sendMessage,
    handleNewMessage
  } = useChatMessages({ chatId: chat.id, userId })

  const { messagesEndRef } = useChatScroll({
    messagesLength: messages.length,
    loading
  })

  const { messageInputRef, focusInput } = useChatFocus()

  const { handleCall } = useChatActions({ chat, onError: setError })

  // Настраиваем realtime подписки
  useChatRealtime({
    chatId: chat.id,
    userId,
    otherParticipantId: chat.other_participant_id,
    onNewMessage: handleNewMessage,
    loadMessages
  })

  // Получение статуса пользователя
  const getUserStatus = useCallback((userId?: string) => {
    if (!userId) return 'Неизвестно'

    // Если список пользователей пустой и идет загрузка, показываем "Загрузка..."
    if (users.length === 0 && loading) {
      return 'Загрузка...'
    }

    // Если список пользователей пустой, но загрузка завершена, показываем "Неизвестно"
    if (users.length === 0 && !loading) {
      return 'Неизвестно'
    }

    const user = users.find(u => u.id === userId)
    if (!user) {
      console.log('⚠️ Пользователь не найден в списке из', users.length, 'пользователей')
      return 'Неизвестно'
    }

    // Возвращаем статус напрямую из базы данных (теперь обновляется в realtime)
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

  // Обработчик отправки сообщения
  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim() || sending || !userId) return

    const messageText = newMessage.trim()
    setNewMessage('')

    const result = await sendMessage(messageText)

    if (result && !result.success) {
      // Если отправка не удалась, возвращаем текст
      setNewMessage(result.text || messageText)
    }
  }, [newMessage, sending, userId, sendMessage])

  // Компонент рендерится

  return (
    <div className="h-full flex flex-col" onClick={focusInput}>
      <ChatHeader
        chat={chat}
        onBack={onBack}
        onCall={handleCall}
        userStatus={chat.type === 'private' && chat.other_participant_id ? getUserStatus(chat.other_participant_id) : undefined}
        isInCall={isInCall}
        typingUsers={typingUsers}
        currentUserId={userId || undefined}
      />

      <MessagesArea
        messages={messages}
        loading={loading}
        error={error || undefined}
        chat={chat}
        userId={userId || undefined}
        onRetry={loadMessages}
        messagesEndRef={messagesEndRef}
        onMessageClick={focusInput}
      />

      <MessageInput
        ref={messageInputRef}
        value={newMessage}
        onChange={setNewMessage}
        onSubmit={handleSendMessage}
        sending={sending}
        chatId={chat.id}
      />
    </div>
  )
}

export default ChatInterface
