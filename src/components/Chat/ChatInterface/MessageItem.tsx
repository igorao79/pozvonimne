import React from 'react'
import { Message, Chat } from './types'
import { formatMessageTime } from './utils'
import { MessageContextMenu } from './MessageContextMenu'

interface MessageItemProps {
  message: Message
  chat: Chat
  userId?: string
  onClick?: () => void
  onEdit?: (messageId: string, currentContent: string) => void
  onDelete?: (messageId: string) => void
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  chat,
  userId,
  onClick,
  onEdit,
  onDelete
}) => {
  const isOwn = message.sender_id === userId
  const isSystemMessage = message.type === 'system'

  // Форматирование времени редактирования
  const formatEditTime = (editedAt: string) => {
    const date = new Date(editedAt)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return 'только что'
    if (diffInMinutes < 60) return `${diffInMinutes} мин назад`

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours} ч назад`

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays} д назад`

    return date.toLocaleDateString('ru-RU')
  }

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

  // Удаленные сообщения
  if (message.is_deleted) {
    return (
      <div
        key={`${message.id}-${message.updated_at}`}
        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
        onClick={onClick}
      >
        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          isOwn
            ? 'bg-primary/50 text-primary-foreground/50'
            : 'bg-muted text-muted-foreground border border-border/50'
        }`}>
          <p className="text-sm italic">[Сообщение удалено]</p>
          <p className={`text-xs mt-1 ${
            isOwn ? 'text-indigo-200/50 dark:text-indigo-100/50' : 'text-muted-foreground/50'
          }`}>
            {formatMessageTime(message.created_at)}
          </p>
        </div>
      </div>
    )
  }

  // Обычные сообщения с контекстным меню
  const messageContent = (
    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
      isOwn
        ? 'bg-primary text-primary-foreground'
        : 'bg-card text-foreground border border-border'
    }`}>
      {!isOwn && chat.type === 'group' && (
        <p className="text-xs text-muted-foreground mb-1">{message.sender_name}</p>
      )}

      <p className="text-sm">{message.content}</p>

      <div className="flex items-center justify-between mt-1">
        <p className={`text-xs ${
          isOwn ? 'text-indigo-200 dark:text-indigo-100' : 'text-muted-foreground'
        }`}>
          {formatMessageTime(message.created_at)}
        </p>

        {/* Метка редактирования */}
        {message.edited_at && (
          <p className={`text-xs ${
            isOwn ? 'text-indigo-200/70 dark:text-indigo-100/70' : 'text-muted-foreground/70'
          }`}>
            (ред. {formatEditTime(message.edited_at)})
          </p>
        )}
      </div>
    </div>
  )

  return (
    <MessageContextMenu
      key={`${message.id}-${message.updated_at}`}
      message={message}
      userId={userId}
      onEdit={onEdit}
      onDelete={onDelete}
    >
      <div
        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
        onClick={onClick}
      >
        {messageContent}
      </div>
    </MessageContextMenu>
  )
}



