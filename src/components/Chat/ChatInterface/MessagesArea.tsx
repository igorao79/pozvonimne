import React, { forwardRef, useState, useCallback, useRef, useEffect } from 'react'
import { Message, Chat } from './types'
import { MessageItem } from './MessageItem'
import { DateSeparator } from './DateSeparator'

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


export const MessagesArea: React.FC<MessagesAreaProps> = ({
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
  hasInitialScrolled = false
}) => {
  const [showScrollButton, setShowScrollButton] = useState(false)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const previousMessagesLength = useRef<number>(messages.length)
  const previousScrollTop = useRef<number>(0)
  const isLoadingMoreRef = useRef<boolean>(false)
  const loadMoreAnchorRef = useRef<HTMLDivElement>(null)
  const previousScrollHeight = useRef<number>(0)

  // Обработчик скролла для загрузки дополнительных сообщений и показа кнопки прокрутки
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement
    const { scrollTop, scrollHeight, clientHeight } = target

    // Если пользователь прокрутил до верха (в пределах 100px) и есть еще сообщения
    if (hasInitialScrolled && scrollTop <= 100 && hasMoreMessages && !loadingMore && onLoadMore) {
      console.log('🎯 Пользователь прокрутил до верха, загружаем дополнительные сообщения')
      onLoadMore()
    }

    // Определяем расстояние до низа (до последнего сообщения)
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight

    // Показываем кнопку, если пользователь ушел вверх более чем на 100px от последнего сообщения
    setShowScrollButton(distanceFromBottom > 100)
  }, [hasMoreMessages, loadingMore, onLoadMore, hasInitialScrolled])

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

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-4 chat-pattern-bg">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Загрузка сообщений...</p>
          </div>
        </div>
      </div>
    )
  }

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

  if (messages.length === 0) {
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

          console.log('📅 MessagesArea rendering:', uniqueMessages.length, 'messages')

          return uniqueMessages.map((message, index) => {
            const currentMessageDate = getClientLocalDateString(message.created_at)
            const previousMessage = index > 0 ? uniqueMessages[index - 1] : null
            const previousMessageDate = previousMessage ? getClientLocalDateString(previousMessage.created_at) : null
            
            // Показываем плашку даты если:
            // 1. Это первое сообщение 
            // 2. Дата отличается от предыдущего сообщения
            const shouldShowDateSeparator = index === 0 || currentMessageDate !== previousMessageDate

            // Детальное логирование только для отладки
            if (shouldShowDateSeparator) {
              console.log('📅 Показываем плашку даты:', {
                messageId: message.id.slice(0, 8),
                index,
                date: currentMessageDate,
                messageTime: message.created_at
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
                <MessageItem
                  key={`message-${message.id}`}
                  message={message}
                  chat={chat}
                  userId={userId}
                  onClick={onMessageClick}
                  onEdit={onEditMessage}
                  onDelete={onDeleteMessage}
                />
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
