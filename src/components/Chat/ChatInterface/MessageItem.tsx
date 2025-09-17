import React from 'react'
import { Message, Chat } from './types'
import { formatMessageTime } from './utils'

interface MessageItemProps {
  message: Message
  chat: Chat
  userId?: string
  onClick?: () => void
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  chat,
  userId,
  onClick
}) => {
  const isOwn = message.sender_id === userId
  const isSystemMessage = message.type === 'system'

  // Системные сообщения отображаются по центру
  if (isSystemMessage) {
    return (
      <div
        key={`${message.id}-${message.updated_at}`}
        className="flex justify-center my-4"
        onClick={onClick}
      >
        <div className="max-w-md px-4 py-2 rounded-lg bg-muted/50 text-muted-foreground border border-muted text-center">
          <p className="text-sm font-medium">{message.content}</p>
          <p className="text-xs mt-1 opacity-70">
            {formatMessageTime(message.created_at)}
          </p>
        </div>
      </div>
    )
  }

  // Обычные сообщения
  return (
    <div
      key={`${message.id}-${message.updated_at}`}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
      onClick={onClick}
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
}



