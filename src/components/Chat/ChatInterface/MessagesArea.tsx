import React, { forwardRef } from 'react'
import { Message, Chat } from './types'
import { MessageItem } from './MessageItem'

interface MessagesAreaProps {
  messages: Message[]
  loading: boolean
  error?: string
  chat: Chat
  userId?: string
  onRetry?: () => void
  messagesEndRef: React.RefObject<HTMLDivElement | null>
  onMessageClick?: () => void
  onEditMessage?: (messageId: string, currentContent: string) => void
  onDeleteMessage?: (messageId: string) => void
}

export const MessagesArea: React.FC<MessagesAreaProps> = ({
  messages,
  loading,
  error,
  chat,
  userId,
  onRetry,
  messagesEndRef,
  onMessageClick,
  onEditMessage,
  onDeleteMessage
}) => {
  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-4 bg-background">
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
      <div className="flex-1 overflow-y-auto p-4 bg-background">
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
      className="flex-1 overflow-y-auto p-4 chat-pattern-bg"
      onClick={onMessageClick}
    >
      <div className="space-y-4">
        {messages.map((message) => (
          <MessageItem
            key={`${message.id}-${message.updated_at}`}
            message={message}
            chat={chat}
            userId={userId}
            onClick={onMessageClick}
            onEdit={onEditMessage}
            onDelete={onDeleteMessage}
          />
        ))}

        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}
