import React, { forwardRef, useState, useCallback, useRef, useEffect } from 'react'
import { Message, Chat } from './types'
import { MessageItem } from './MessageItem'
import { DateSeparator } from './DateSeparator'
import { CallMessage } from './CallMessage'

// Компонент для разделителя непрочитанных сообщений
const UnreadSeparator: React.FC = () => {
  return (
    <div id="unread-separator" className="flex items-center justify-center my-6 px-4">
      {/* Левая разделительная линия */}
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-blue-400 dark:via-blue-600 to-transparent"></div>

      {/* Центральный элемент с текстом */}
      <div className="mx-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-600 rounded-full px-4 py-1.5 shadow-sm backdrop-blur-sm">
        <span className="text-xs text-blue-700 dark:text-blue-300 font-semibold tracking-wide uppercase">
          Непрочитанные сообщения
        </span>
      </div>

      {/* Правая разделительная линия */}
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-blue-400 dark:via-blue-600 to-transparent"></div>
    </div>
  )
}

interface MessagesAreaProps {
  messages: Message[]
  loading: boolean
  loadingMore?: boolean
  hasMoreMessages?: boolean
  error?: string
  chat: Chat
  userId?: string
  onRetry?: () => void
  onLoadMore?: () => void
  messagesEndRef: React.RefObject<HTMLDivElement | null>
  onMessageClick?: () => void
  onEditMessage?: (messageId: string, currentContent: string) => void
  onDeleteMessage?: (messageId: string) => void
  onScrollToBottom?: () => void
  hasInitialScrolled?: boolean
  isSwitchingChat?: boolean
  isAutoScrolling?: boolean
  hasUnreadMessages?: boolean
}

// Получаем стабильную дату на основе клиентского времени пользователя
const getClientLocalDateString = (dateString: string) => {
  // Создаем дату напрямую из строки в клиентском времени
  const clientDate = new Date(dateString)
  
  // Получаем компоненты даты в клиентском часовом поясе
  const year = clientDate.getFullYear()
  const month = String(clientDate.getMonth() + 1).padStart(2, '0')
  const day = String(clientDate.getDate()).padStart(2, '0')
  
  const dateKey = `${year}-${month}-${day}`
  
  
  
  return dateKey
}


const MessagesAreaComponent: React.FC<MessagesAreaProps> = ({
  messages,
  loading,
  loadingMore = false,
  hasMoreMessages = false,
  error,
  chat,
  userId,
  onRetry,
  onLoadMore,
  messagesEndRef,
  onMessageClick,
  onEditMessage,
  onDeleteMessage,
  onScrollToBottom,
  hasInitialScrolled = false,
  isSwitchingChat = false,
  isAutoScrolling = false,
  hasUnreadMessages = false
}) => {
  console.log('📜 [MessagesArea] Рендер компонента:', {
    messagesCount: messages.length,
    chatId: chat.id.slice(0, 8),
    lastMessageId: messages[messages.length - 1]?.id?.slice(0, 8),
    hasUnreadMessages
  })

  const [showScrollButton, setShowScrollButton] = useState(false)
  
  // Простая логика плашки: показываем если есть непрочитанные сообщения и пользователь не скроллил активно
  const [hasUserScrolled, setHasUserScrolled] = useState(false)
  const [showUnreadSeparator, setShowUnreadSeparator] = useState(true)

  // Таймер для принудительного скрытия плашки через некоторое время
  const unreadSeparatorTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Запоминаем состояние непрочитанных для каждого чата
  const chatUnreadStateRef = useRef<{[chatId: string]: boolean}>({}) // Запоминаем состояние непрочитанных для каждого чата
  
  // Обновляем локальный флаг автоскролла
  useEffect(() => {
    console.log('🤖 Автоскролл изменился:', isAutoScrolling)
  }, [isAutoScrolling])
  
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const previousMessagesLength = useRef<number>(messages.length)
  const previousScrollTop = useRef<number>(0)
  const isLoadingMoreRef = useRef<boolean>(false)
  const loadMoreAnchorRef = useRef<HTMLDivElement>(null)
  const previousScrollHeight = useRef<number>(0)
  const lastScrollTop = useRef<number>(0)

  // Обработчик скролла для загрузки дополнительных сообщений и показа кнопки прокрутки
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement
    const { scrollTop, scrollHeight, clientHeight } = target

    // Если пользователь прокрутил до верха (в пределах 100px) и есть еще сообщения
    // НО только если пользователь уже скроллил (чтобы не мешать начальному позиционированию)
    if (hasInitialScrolled && scrollTop <= 100 && hasMoreMessages && !loadingMore && onLoadMore && hasUserScrolled) {
      console.log('🎯 Пользователь прокрутил до верха, загружаем дополнительные сообщения')
      onLoadMore()
    }

    // Определяем расстояние до низа (до последнего сообщения)
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight

    // Показываем кнопку, если пользователь ушел вверх более чем на 100px от последнего сообщения
    setShowScrollButton(distanceFromBottom > 100)

    // Отмечаем что пользователь начал скроллить (только если это НЕ автоматический скролл)
    const scrollDiff = Math.abs(lastScrollTop.current - scrollTop)
    if (scrollDiff > 150) { // Увеличен порог с 10px до 150px для предотвращения случайного скрытия
      if (isAutoScrolling) {
        console.log('🤖 Автоматический скролл обнаружен, НЕ засчитываем как пользовательский. Diff:', scrollDiff)
      } else {
        if (!hasUserScrolled) {
          console.log('🖱️ Пользователь НАМЕРЕННО прокручивает чат (>150px). Diff:', scrollDiff)
          setHasUserScrolled(true)
        }
        
        // Скрываем плашку только при ЗНАЧИТЕЛЬНОМ скролле пользователя (не случайном)
        if (showUnreadSeparator) {
          console.log('📜 Пользователь значительно прокручивает чат, скрываем плашку непрочитанных')
          setShowUnreadSeparator(false)
        }
      }
    } else if (scrollDiff > 10) {
      // Небольшие движения скролла (10-150px) - только логируем, но не скрываем плашку
      if (!isAutoScrolling) {
        console.log('🐭 Небольшое движение скролла (не скрываем плашку). Diff:', scrollDiff)
      }
    }

    lastScrollTop.current = scrollTop
  }, [hasMoreMessages, loadingMore, onLoadMore, hasInitialScrolled, showUnreadSeparator, isAutoScrolling])

  // Сброс состояния при смене чата
  useEffect(() => {
    console.log('🧹 Сброс состояния при смене чата:', chat.id)

    // Очищаем таймер при смене чата
    if (unreadSeparatorTimerRef.current) {
      clearTimeout(unreadSeparatorTimerRef.current)
      unreadSeparatorTimerRef.current = null
    }

    setHasUserScrolled(false)
    // При заходе в новый чат сбрасываем плашку - пусть useEffect определит на основе сообщений
    setShowUnreadSeparator(false)
  }, [chat.id])

  // Простая логика показа плашки: показываем если есть непрочитанные сообщения
  useEffect(() => {
    // Очищаем предыдущий таймер
    if (unreadSeparatorTimerRef.current) {
      clearTimeout(unreadSeparatorTimerRef.current)
      unreadSeparatorTimerRef.current = null
    }

    // Используем информацию из пропса ИЛИ проверяем сообщения
    const hasUnread = hasUnreadMessages || messages.some(message =>
      message.sender_id !== userId && !message.read_at
    )

    // Запоминаем состояние непрочитанных для этого чата
    chatUnreadStateRef.current[chat.id] = hasUnread

    // Простая логика: показываем плашку только если есть непрочитанные И пользователь не скроллил
    if (hasUnread && !hasUserScrolled) {
      if (!showUnreadSeparator) {
        console.log('📧 Есть непрочитанные и пользователь не скроллил - показываем плашку')
        setShowUnreadSeparator(true)
      }

      // Запускаем таймер на автоматическое скрытие через 3 секунды
      unreadSeparatorTimerRef.current = setTimeout(() => {
        console.log('📧 Таймер истек, скрываем плашку непрочитанных')
        setShowUnreadSeparator(false)
      }, 3000) // 3 секунды
    } else {
      if (showUnreadSeparator) {
        console.log('📧 Нет непрочитанных ИЛИ пользователь скроллил - скрываем плашку')
        setShowUnreadSeparator(false)
      }
    }

    // Очистка таймера при размонтировании компонента
    return () => {
      if (unreadSeparatorTimerRef.current) {
        clearTimeout(unreadSeparatorTimerRef.current)
        unreadSeparatorTimerRef.current = null
      }
    }
  }, [messages, userId, chat.id, hasUnreadMessages]) // Добавили hasUnreadMessages в зависимости

  // Отдельная логика для сброса флага скролла когда непрочитанные сообщения становятся видимы
  // Но только через некоторое время после входа в чат, чтобы плашка успела показаться
  useEffect(() => {
    if (!hasUserScrolled) return // Если уже не скроллил, ничего не делаем

    const container = messagesContainerRef.current
    if (!container) return

    // Находим первое непрочитанное сообщение
    const firstUnreadIndex = messages.findIndex(message =>
      message.sender_id !== userId && !message.read_at
    )

    if (firstUnreadIndex === -1) return

    const unreadMessageElement = document.querySelector(`[data-message-id="${messages[firstUnreadIndex].id}"]`) as HTMLElement
    if (unreadMessageElement) {
      const messageRect = unreadMessageElement.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()

      // Проверяем, находится ли сообщение в видимой области
      const isVisible = messageRect.top >= containerRect.top && messageRect.bottom <= containerRect.bottom

      if (isVisible) {
        // Добавляем небольшую задержку перед сбросом флага скролла,
        // чтобы плашка успела отобразиться для пользователя
        setTimeout(() => {
          console.log('📧 Непрочитанные сообщения стали видимы, сбрасываем флаг скролла')
          setHasUserScrolled(false)
        }, 1000) // 1 секунда задержки
      }
    }
  }, [lastScrollTop.current]) // Срабатывает при изменении скролла

  // Стабильная система сохранения позиции при Load more
  useEffect(() => {
    // До первоначального скролла вниз не вмешиваемся в позицию
    if (!hasInitialScrolled) return

    if (loadingMore && !isLoadingMoreRef.current) {
      // Началась загрузка - сохраняем точную позицию
      if (messagesContainerRef.current) {
        const container = messagesContainerRef.current
        previousScrollTop.current = container.scrollTop
        previousScrollHeight.current = container.scrollHeight
        previousMessagesLength.current = messages.length

        console.log('💾 Якорь загрузки установлен:', {
          scrollTop: previousScrollTop.current,
          scrollHeight: previousScrollHeight.current,
          messagesCount: previousMessagesLength.current,
          distanceFromTop: previousScrollTop.current,
          distanceFromBottom: previousScrollHeight.current - previousScrollTop.current - container.clientHeight
        })
      }
      isLoadingMoreRef.current = true
    } else if (!loadingMore && isLoadingMoreRef.current) {
      // Загрузка завершена - восстанавливаем позицию
      if (messagesContainerRef.current && messages.length > previousMessagesLength.current) {
        // Используем requestAnimationFrame для максимальной стабильности
        requestAnimationFrame(() => {
          if (messagesContainerRef.current) {
            const container = messagesContainerRef.current
            const heightDifference = container.scrollHeight - previousScrollHeight.current

            // Устанавливаем новую позицию с учетом добавленного контента
            const newScrollTop = previousScrollTop.current + heightDifference
            container.scrollTop = newScrollTop

            console.log('✅ Позиция стабилизирована:', {
              oldHeight: previousScrollHeight.current,
              newHeight: container.scrollHeight,
              heightDifference,
              oldScrollTop: previousScrollTop.current,
              newScrollTop,
              messagesAdded: messages.length - previousMessagesLength.current
            })
          }
        })
      }
      isLoadingMoreRef.current = false
    }
  }, [loadingMore, messages.length, hasInitialScrolled])



  if (error) {
    return (
      <div className="flex-1 overflow-y-auto p-4 chat-pattern-bg">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-destructive mb-2">{error}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="text-primary hover:text-primary/80 text-sm transition-colors"
              >
                Попробовать снова
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Показываем лоадер если загружаются сообщения
  if (messages.length === 0 && (loading || isSwitchingChat)) {
    return (
      <div className="flex-1 overflow-y-auto p-4 chat-pattern-bg">
        <div className="flex items-center justify-center h-full">
          <div className="text-center bg-card/80 backdrop-blur-sm rounded-lg p-6 border border-border/50">
            {/* Анимированные три точки как в сообщениях */}
            <div className="flex justify-center items-center space-x-1 mb-4">
              <div className="animate-bounce [animation-delay:-0.3s] w-3 h-3 bg-primary rounded-full"></div>
              <div className="animate-bounce [animation-delay:-0.15s] w-3 h-3 bg-primary rounded-full"></div>
              <div className="animate-bounce w-3 h-3 bg-primary rounded-full"></div>
            </div>
            <p className="text-muted-foreground mb-2">Загрузка сообщений...</p>
            <p className="text-sm text-muted-foreground/70">Подождите немного</p>
          </div>
        </div>
      </div>
    )
  }

  // Показываем плашку "Сообщений пока нет" только если:
  // 1. Нет сообщений
  // 2. Не переключаемся между чатами
  // 3. Не идет загрузка
  if (messages.length === 0 && !isSwitchingChat && !loading) {
    return (
      <div className="flex-1 overflow-y-auto p-4 chat-pattern-bg">
        <div className="flex items-center justify-center h-full">
          <div className="text-center bg-card/80 backdrop-blur-sm rounded-lg p-6 border border-border/50">
            <svg className="w-12 h-12 mx-auto text-muted-foreground mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-muted-foreground mb-2">Сообщений пока нет</p>
            <p className="text-sm text-muted-foreground/70">Начните переписку</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={messagesContainerRef}
      className="flex-1 overflow-y-auto p-4 chat-pattern-bg"
      onClick={onMessageClick}
      onScroll={handleScroll}
    >
      <div className="space-y-4">
        {/* Якорь для стабилизации позиции при загрузке */}
        <div ref={loadMoreAnchorRef} className="h-0" />
        
        {/* Индикатор загрузки дополнительных сообщений */}
        {loadingMore && hasMoreMessages && (
          <div className="flex justify-center py-2 sticky top-0 bg-background/80 backdrop-blur-sm z-10">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
            <span className="ml-2 text-sm text-muted-foreground">Загрузка сообщений...</span>
          </div>
        )}

        {/* Сообщения с inline проверкой дат */}
        {(() => {
          // Фильтруем дубликаты
          const uniqueMessages = messages.filter((message, index, arr) =>
            arr.findIndex(m => m.id === message.id) === index
          )

          // Логирование отключено для предотвращения лишних рендеров
          // console.log('📅 MessagesArea rendering:', uniqueMessages.length, 'messages')

          // Находим индекс первого непрочитанного сообщения (не от текущего пользователя)
          let firstUnreadIndex = -1
          for (let i = 0; i < uniqueMessages.length; i++) {
            const message = uniqueMessages[i]
            if (message.sender_id !== userId && !message.read_at) {
              firstUnreadIndex = i
              break
            }
          }

          return uniqueMessages.map((message, index) => {
            const currentMessageDate = getClientLocalDateString(message.created_at)
            const previousMessage = index > 0 ? uniqueMessages[index - 1] : null
            const previousMessageDate = previousMessage ? getClientLocalDateString(previousMessage.created_at) : null

            // Показываем плашку даты если:
            // 1. Это первое сообщение
            // 2. Дата отличается от предыдущего сообщения
            const shouldShowDateSeparator = index === 0 || currentMessageDate !== previousMessageDate

            // Показываем плашку непрочитанных сообщений если:
            // 1. Это первое непрочитанное сообщение 
            // 2. Плашка должна быть показана
            // 3. Есть непрочитанные сообщения в принципе
            const shouldShowUnreadSeparator = index === firstUnreadIndex && firstUnreadIndex !== -1 && showUnreadSeparator

            // Детальное логирование только для отладки
            if (shouldShowDateSeparator) {
              console.log('📅 Показываем плашку даты:', {
                messageId: message.id.slice(0, 8),
                index,
                date: currentMessageDate,
                messageTime: message.created_at
              })
            }

            if (shouldShowUnreadSeparator) {
              console.log('📧 Показываем плашку непрочитанных сообщений:', {
                messageId: message.id.slice(0, 8),
                index,
                firstUnreadIndex
              })
            }

            return (
              <React.Fragment key={`message-wrapper-${message.id}`}>
                {shouldShowDateSeparator && (
                  <DateSeparator
                    key={`date-separator-${currentMessageDate}`}
                    date={message.created_at}
                  />
                )}
                {shouldShowUnreadSeparator && (
                  <UnreadSeparator
                    key={`unread-separator-${message.id}`}
                  />
                )}
                <div key={`message-${message.id}`} data-message-id={message.id}>
                  {message.type === 'call' ? (
                    <CallMessage
                      message={message}
                      chat={chat}
                      userId={userId}
                    />
                  ) : (
                    <MessageItem
                      message={message}
                      chat={chat}
                      userId={userId}
                      onClick={onMessageClick}
                      onEdit={onEditMessage}
                      onDelete={onDeleteMessage}
                    />
                  )}
                </div>
              </React.Fragment>
            )
          })
        })()}

        <div ref={messagesEndRef} />
      </div>

      {/* Кнопка прокрутки к низу */}
      {showScrollButton && onScrollToBottom && (
        <button
          onClick={onScrollToBottom}
          className="fixed bottom-25 right-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full p-3 shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/50 z-50"
          aria-label="Прокрутить к последнему сообщению"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </button>
      )}
    </div>
  )
}

export const MessagesArea = React.memo(MessagesAreaComponent)
