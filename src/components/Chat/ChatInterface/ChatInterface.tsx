'use client'

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react'
import useUsers from '@/hooks/useUsers'
import useCallStore from '@/store/useCallStore'
import useSupabaseStore from '@/store/useSupabaseStore'
import useChatSyncStore from '@/store/useChatSyncStore'

import { ChatHeader } from './ChatHeader'
import { MessagesArea } from './MessagesArea'
import { MessageInput } from './MessageInput'
import { EditMessageModal } from './EditMessageModal'
import { Chat, ChatInterfaceProps } from './types'
import { useTypingUsers } from '@/hooks/useTypingSelectors'
import { useChatMessages } from '@/hooks/useChatMessages'
import { useChatRealtime } from '@/hooks/useChatRealtime'
import { useChatScroll } from '@/hooks/useChatScroll'
import { useChatFocus } from '@/hooks/useChatFocus'
import { useChatActions } from './ChatActions'
import { useMessageActions } from '@/hooks/useMessageActions'
import { useCallMessages } from '@/hooks/useCallMessages'


const ChatInterface = ({ chat, onBack, isInCall, hasUnreadMessages }: ChatInterfaceProps) => {
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

  const { userId: rawUserId, isInCall: storeIsInCall } = useCallStore()
  const { users } = useUsers()
  const { supabase } = useSupabaseStore()
  const { refreshChatList } = useChatSyncStore()

  // Преобразуем null в undefined для совместимости с хуками
  const userId = rawUserId || undefined

  // Ref для отслеживания, был ли чат уже помечен как прочитанный в этой сессии
  const hasMarkedAsReadRef = useRef(false)

  // Состояние для отслеживания переключения между чатами
  const [isSwitchingChat, setIsSwitchingChat] = useState(false)
  const [isAutoScrolling, setIsAutoScrolling] = useState(false)

  // Ref для отслеживания, была ли выполнена первоначальная прокрутка для текущего чата
  const hasScrolledToUnreadRef = useRef(false)

  // Определяем мобильное устройство при монтировании
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768) // md breakpoint
    }

    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)

    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  // Используем проп isInCall если он передан, иначе из store
  const effectiveIsInCall = isInCall !== undefined ? isInCall : storeIsInCall

  // Получаем typing users из оптимизированного хука (исключаем себя)
  const typingUsers = useTypingUsers(chat.id, userId)

  // Используем кастомные хуки
  const {
    messages,
    loading,
    sending,
    loadingMore,
    hasMoreMessages,
    loadMessages,
    loadMoreMessages,
    sendMessage,
    handleNewMessage
  } = useChatMessages({ chatId: chat.id, userId, isActive: true })

  const { messagesEndRef, scrollToBottom, scrollToElement, hasInitialScrolled } = useChatScroll({
    messagesLength: messages.length,
    loading,
    loadingMore
  })

  const { messageInputRef, focusInput, focusAfterSend, disableAutoFocus, enableAutoFocus } = useChatFocus()

  const { handleCall, handleCancelCall } = useChatActions({ 
    chat, 
    onError: setError
  })

  // Хуки для работы с сообщениями
  const { editMessage, deleteMessage } = useMessageActions()

  // Хук для создания сообщений о звонках
  useCallMessages({ chatId: chat.id, userId })

  // Настраиваем realtime подписки
  useChatRealtime({
    chatId: chat.id,
    userId,
    otherParticipantId: chat.other_participant_id,
    onNewMessage: handleNewMessage
  })

  // ОТКЛЮЧЕНО: Автоматическая пометка чата как прочитанного при открытии
  // Это мешает показу плашки "Непрочитанные сообщения"
  // Чат помечается как прочитанный только при реальном просмотре сообщений
  /*
  useEffect(() => {
    if (!userId || !chat.id || hasMarkedAsReadRef.current) return

    const markChatAsRead = async () => {
      try {
        console.log('📖 Автоматическая пометка чата как прочитанного при открытии:', chat.id.slice(0, 8))

        const { data: updatedCount, error } = await supabase.rpc('mark_chat_as_read', {
          chat_uuid: chat.id,
          user_uuid: userId
        })

        if (error) {
          console.warn('Ошибка при автоматической пометке чата как прочитанного:', error)
        } else {
          console.log('✅ Чат автоматически помечен как прочитанный при открытии, обновлено сообщений:', updatedCount)
          hasMarkedAsReadRef.current = true

          // 🔥 ОБНОВЛЕНИЕ: Отправляем сигнал обновления для ChatList после прочтения чата
          console.log('📖 Отправляем сигнал обновления ChatList после прочтения чата при открытии')
          refreshChatList()
        }
      } catch (error) {
        console.warn('Ошибка при автоматической пометке чата как прочитанного:', error)
      }
    }

    // Небольшая задержка, чтобы дать время на загрузку сообщений
    const timer = setTimeout(() => {
      markChatAsRead()
    }, 500)

    return () => clearTimeout(timer)
  }, [chat.id, userId, supabase])
  */

  // Сброс флагов при смене чата
  useEffect(() => {
    hasMarkedAsReadRef.current = false
    hasScrolledToUnreadRef.current = false
  }, [chat.id])

  // Управление состоянием переключения чата
  useEffect(() => {
    setIsSwitchingChat(true)

    // Через 300мс снимаем флаг переключения, давая время на загрузку сообщений
    const timer = setTimeout(() => {
      setIsSwitchingChat(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [chat.id])

  // Прокрутка к плашке непрочитанных сообщений при загрузке чата
  useLayoutEffect(() => {
    if (!loading && messages.length > 0 && !hasScrolledToUnreadRef.current) {
      // Важно: отключаем любые другие прокрутки, устанавливая флаг сразу
      hasScrolledToUnreadRef.current = true

      // Находим первое непрочитанное сообщение (которое не от текущего пользователя и не прочитано)
      const hasUnreadMessages = messages.some(message =>
        message.sender_id !== userId && !message.read_at
      )

      if (hasUnreadMessages) {
        console.log('📜 Прокрутка к плашке непрочитанных сообщений (приоритетная, useLayoutEffect)')

        // Используем setTimeout для гарантированной работы после всех layout изменений
        setTimeout(() => {
          // Начинаем автоматический скролл
          setIsAutoScrolling(true)
          
          // Находим плашку непрочитанных сообщений
          const unreadSeparator = document.getElementById('unread-separator') as HTMLElement
          if (unreadSeparator) {
            console.log('📜 Найдена плашка непрочитанных, прокручиваем к ней')
            scrollToElement(unreadSeparator)
          } else {
            // Если плашки еще нет, пробуем найти первое непрочитанное сообщение
            const firstUnreadMessage = messages.find(message =>
              message.sender_id !== userId && !message.read_at
            )
            if (firstUnreadMessage) {
              const messageElement = document.querySelector(`[data-message-id="${firstUnreadMessage.id}"]`) as HTMLElement
              if (messageElement) {
                console.log('📜 Найдено первое непрочитанное сообщение, прокручиваем к нему')
                scrollToElement(messageElement)
              } else {
                console.log('📜 Не найдено ни плашки, ни сообщения для прокрутки')
              }
            }
          }
          
          // Заканчиваем автоматический скролл через небольшую задержку
          setTimeout(() => {
            setIsAutoScrolling(false)
          }, 300)
        }, 200) // Увеличенная задержка для надежности
      } else {
        // Если нет непрочитанных сообщений, прокручиваем к низу
        console.log('📜 Нет непрочитанных сообщений, прокрутка к низу')
        setTimeout(() => {
          setIsAutoScrolling(true)
          scrollToBottom()
          setTimeout(() => {
            setIsAutoScrolling(false)
          }, 300)
        }, 200)
      }
    }
  }, [loading, messages, userId, scrollToElement, scrollToBottom])

  // Синхронизация статуса прочитанности - теперь обрабатывается через visibility-based систему в MessageItem
  // useSimpleChatRead убран, но заменен на автоматическую пометку при открытии чата

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
    } else {
      // Автоматическая прокрутка вниз только при успешной отправке собственного сообщения (как в Telegram)
      console.log('📜 Автоматическая прокрутка вниз после отправки сообщения')
      scrollToBottom()
      // Всегда восстанавливаем фокус после отправки сообщения
      focusAfterSend()
    }
  }, [newMessage, sending, userId, sendMessage, focusAfterSend, scrollToBottom])

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
      await editMessage(messageId, newContent)
      // Сообщение обновится автоматически через realtime подписку
    } catch (error) {
      console.error('Ошибка при редактировании сообщения:', error)
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
      // Отключаем автофокус на основном инпуте при открытии модального окна
      disableAutoFocus()
    } else {
      // Включаем автофокус обратно при закрытии модального окна
      enableAutoFocus()
    }
  }, [editModal.isOpen, disableAutoFocus, enableAutoFocus])

  // Обработчик удаления сообщения
  const handleDeleteMessage = useCallback(async (messageId: string) => {
    try {
      await deleteMessage(messageId)
      // Сообщение обновится автоматически через realtime подписку
    } catch (error) {
      console.error('Ошибка при удалении сообщения:', error)
      setError('Не удалось удалить сообщение')
    }
  }, [deleteMessage])

  // Компонент рендерится

  return (
    <div className="h-full flex flex-col hover:ring-2 hover:ring-border/60 dark:hover:ring-white/30 transition-all duration-300" onClick={focusInput}>
      {/* На мобильных устройствах всегда показываем хэдер, так как звонок показывается в отдельном модальном окне
          На десктопе скрываем хэдер только если звонок активен, так как там звонок показывается в интерфейсе чата */}
      {isMobile || !effectiveIsInCall ? (
        <ChatHeader
          chat={chat}
          onBack={onBack}
          onCall={handleCall}
          onCancel={handleCancelCall}
          userStatus={chat.type === 'private' && chat.other_participant_id ? getUserStatus(chat.other_participant_id) : undefined}
          isInCall={effectiveIsInCall}
          typingUsers={typingUsers}
          currentUserId={userId || undefined}
        />
      ) : null}

      <MessagesArea
        messages={messages}
        loading={loading}
        loadingMore={loadingMore}
        hasMoreMessages={hasMoreMessages}
        error={error || undefined}
        chat={chat}
        userId={userId || undefined}
        onRetry={loadMessages}
        onLoadMore={loadMoreMessages}
        messagesEndRef={messagesEndRef}
        onMessageClick={focusInput}
        onEditMessage={handleEditMessage}
        onDeleteMessage={handleDeleteMessage}
        hasInitialScrolled={hasInitialScrolled}
        onScrollToBottom={scrollToBottom}
        isSwitchingChat={isSwitchingChat}
        isAutoScrolling={isAutoScrolling}
        hasUnreadMessages={hasUnreadMessages}
      />

      <MessageInput
        ref={messageInputRef}
        value={newMessage}
        onChange={setNewMessage}
        onSubmit={handleSendMessage}
        sending={sending}
        chatId={chat.id}
      />

      {/* Модальное окно редактирования сообщения */}
      <EditMessageModal
        isOpen={editModal.isOpen}
        messageId={editModal.messageId}
        currentContent={editModal.currentContent}
        onSave={handleSaveEdit}
        onCancel={handleCancelEdit}
      />
    </div>
  )
}

export default ChatInterface
