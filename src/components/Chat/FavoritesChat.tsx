'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import useCallStore from '@/store/useCallStore'
import { ChatHeader } from './ChatInterface/ChatHeader'
import { MessagesArea } from './ChatInterface/MessagesArea'
import { MessageInput } from './ChatInterface/MessageInput'
import { EditMessageModal } from './ChatInterface/EditMessageModal'
import { useFavorites } from '@/hooks/useFavorites'
import { useChatScroll } from '@/hooks/useChatScroll'
import { useChatFocus } from '@/hooks/useChatFocus'
import { Star } from 'lucide-react'

interface FavoritesChatProps {
  onBack?: () => void
  isActive: boolean
}

// Создаем фейковый чат для избранного
const createFavoritesChat = (userId: string) => ({
  id: `favorites_${userId}`,
  type: 'favorites' as any, // Специальный тип для избранного
  name: 'Избранное',
  avatar_url: undefined,
  last_message: undefined,
  last_message_at: undefined,
  unread_count: 0,
  other_participant_id: undefined,
  other_participant_name: undefined,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_archived: false
})

const FavoritesChat = ({ onBack, isActive }: FavoritesChatProps) => {
  const [newMessage, setNewMessage] = useState('')
  const [error, setError] = useState<string | undefined>(undefined)
  const [isMobile, setIsMobile] = useState(false)

  // Состояние для редактирования сообщений
  const [editModal, setEditModal] = useState<{
    isOpen: boolean
    messageId: string
    currentContent: string
  }>({
    isOpen: false,
    messageId: '',
    currentContent: ''
  })

  const { userId: rawUserId } = useCallStore()
  const userId = rawUserId || undefined

  // Определяем мобильное устройство при монтировании
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)

    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  // Создаем фейковый чат для интерфейса
  const favoritesChat = userId ? createFavoritesChat(userId) : null

  // Используем хук для работы с избранными сообщениями
  const {
    messages,
    loading,
    sending,
    error: favoritesError,
    sendMessage,
    editMessage,
    deleteMessage
  } = useFavorites({ userId, isActive })

  // Объединяем ошибки
  useEffect(() => {
    if (favoritesError) {
      setError(favoritesError)
    }
  }, [favoritesError])

  const { messagesEndRef, scrollToBottom } = useChatScroll({
    messagesLength: messages.length,
    loading,
    loadingMore: false
  })

  const { messageInputRef, focusInput, focusAfterSend, disableAutoFocus, enableAutoFocus } = useChatFocus()

  // Слушаем глобальное событие для восстановления фокуса на чат
  useEffect(() => {
    const handleRestoreChatFocus = () => {
      enableAutoFocus()
      setTimeout(() => focusInput(), 100)
    }

    window.addEventListener('restoreChatFocus', handleRestoreChatFocus)
    return () => window.removeEventListener('restoreChatFocus', handleRestoreChatFocus)
  }, [enableAutoFocus, focusInput])

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
    } else {
      // Автоматическая прокрутка вниз при успешной отправке
      console.log('⭐ Избранное сообщение отправлено - прокрутка вниз')
      scrollToBottom()
      focusAfterSend()
    }
  }, [newMessage, sending, userId, sendMessage, focusAfterSend, scrollToBottom])

  // Голосовые сообщения не поддерживаются в избранном
  const handleVoiceSubmit = useCallback(async () => {
    setError('Голосовые сообщения не поддерживаются в избранном')
  }, [])

  // Обработчик начала редактирования сообщения
  const handleEditMessage = useCallback((messageId: string, currentContent: string) => {
    setEditModal({
      isOpen: true,
      messageId,
      currentContent
    })
  }, [])

  // Обработчик сохранения отредактированного сообщения
  const handleSaveEdit = useCallback(async (messageId: string, newContent: string) => {
    try {
      const success = await editMessage(messageId, newContent)
      if (!success) {
        setError('Не удалось отредактировать сообщение')
      }
    } catch (error) {
      console.error('Ошибка при редактировании избранного сообщения:', error)
      setError('Не удалось отредактировать сообщение')
    }
  }, [editMessage])

  // Обработчик отмены редактирования
  const handleCancelEdit = useCallback(() => {
    setEditModal({
      isOpen: false,
      messageId: '',
      currentContent: ''
    })
  }, [])

  // Управление автофокусом при открытии/закрытии модального окна редактирования
  useEffect(() => {
    if (editModal.isOpen) {
      disableAutoFocus()
    } else {
      enableAutoFocus()
    }
  }, [editModal.isOpen, disableAutoFocus, enableAutoFocus])

  // Обработчик удаления сообщения
  const handleDeleteMessage = useCallback(async (messageId: string) => {
    try {
      const success = await deleteMessage(messageId)
      if (!success) {
        setError('Не удалось удалить сообщение')
      }
    } catch (error) {
      console.error('Ошибка при удалении избранного сообщения:', error)
      setError('Не удалось удалить сообщение')
    }
  }, [deleteMessage])

  if (!userId || !favoritesChat) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Star className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Загрузка избранного...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col hover:ring-2 hover:ring-border/60 dark:hover:ring-white/30 transition-all duration-300" onClick={focusInput}>
      {/* Специальный хэдер для избранного */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors mr-3"
            title="Назад"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        
        <div className="flex items-center space-x-3 flex-1">
          {/* Аватарка избранного */}
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
              <Star className="w-5 h-5 text-white" fill="currentColor" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-foreground truncate">Избранное</h1>
            <p className="text-sm text-muted-foreground">Ваши сохраненные заметки</p>
          </div>
        </div>
      </div>

      <MessagesArea
        messages={messages}
        loading={loading}
        loadingMore={false}
        hasMoreMessages={false}
        error={error || undefined}
        chat={favoritesChat}
        userId={userId}
        onRetry={() => {}} // В избранном нет повтора загрузки
        onLoadMore={() => {}} // В избранном нет подгрузки
        messagesEndRef={messagesEndRef}
        onMessageClick={focusInput}
        onEditMessage={handleEditMessage}
        onDeleteMessage={handleDeleteMessage}
        hasInitialScrolled={true} // В избранном всегда прокручиваем к низу
        onScrollToBottom={scrollToBottom}
        isSwitchingChat={false}
        isAutoScrolling={false}
        hasUnreadMessages={false} // В избранном нет непрочитанных сообщений
      />

      <MessageInput
        ref={messageInputRef}
        value={newMessage}
        onChange={setNewMessage}
        onSubmit={handleSendMessage}
        onVoiceSubmit={handleVoiceSubmit}
        sending={sending}
        chatId={favoritesChat.id}
      />

      {/* Модальное окно редактирования сообщения */}
      <EditMessageModal
        isOpen={editModal.isOpen}
        messageId={editModal.messageId}
        currentContent={editModal.currentContent}
        onSave={handleSaveEdit}
        onCancel={() => {
          handleCancelEdit()
          // Восстанавливаем фокус на чат после закрытия модального окна
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('restoreChatFocus'))
          }, 100)
        }}
      />
    </div>
  )
}

export default FavoritesChat
