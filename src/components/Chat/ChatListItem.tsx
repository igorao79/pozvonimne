'use client'

import React from 'react'
import { usePrivateChatTyping } from '@/hooks/useTypingSelectors'
import useCallStore from '@/store/useCallStore'
import { TypingDots } from './TypingIndicator'

interface Chat {
  id: string
  type: 'private' | 'group'
  name: string
  avatar_url?: string
  last_message?: string
  last_message_at?: string
  last_message_sender_name?: string
  unread_count: number
  other_participant_id?: string
  other_participant_name?: string
  other_participant_avatar?: string
  created_at: string
}

interface ChatListItemProps {
  chat: Chat
  onClick: () => void
  isSelected: boolean
  formatLastMessageTime: (timestamp?: string) => string
  truncateText: (text: string, maxLength?: number) => string
}

export const ChatListItem: React.FC<ChatListItemProps> = ({
  chat,
  onClick,
  isSelected,
  formatLastMessageTime,
  truncateText
}) => {
  // Получаем текущего пользователя для исключения
  const { userId } = useCallStore()
  
  // Получаем typing users из оптимизированного хука для приватных чатов (исключаем себя)
  const typingUsers = usePrivateChatTyping(chat.id, chat.type === 'private', userId || undefined)
  
  const isTyping = typingUsers.length > 0

  return (
    <div
      onClick={onClick}
      className={`px-2 py-1.5 hover:bg-muted cursor-pointer transition-colors chat-list-item ${
        isSelected ? 'bg-primary/10 border-r-2 border-primary' : ''
      }`}
    >
      <div className="flex items-center space-x-1.5">
          {/* Ультракомпактный аватар */}
          <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex-shrink-0 chat-avatar">
            {(chat.avatar_url || chat.other_participant_avatar) ? (
              <img
                src={chat.avatar_url || chat.other_participant_avatar}
                alt={chat.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <span className="text-white font-medium text-xs">
                  {chat.name?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
            )}
          </div>

        {/* Информация о чате */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-foreground text-sm truncate">
              {chat.name}
            </h3>
            <div className="flex items-center space-x-1">
              {chat.last_message_at && (
                <span className="text-xs text-muted-foreground">
                  {formatLastMessageTime(chat.last_message_at)}
                </span>
              )}
              {chat.unread_count > 0 && (
                <div className="bg-primary text-primary-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {chat.unread_count > 99 ? '99+' : chat.unread_count}
                </div>
              )}
            </div>
          </div>

          {/* Последнее сообщение или индикатор печатания */}
          <div className="mt-0">
            {isTyping ? (
              <div className="flex items-center space-x-1">
                <span className="text-xs text-primary italic">
                  печатает
                </span>
                <TypingDots size="sm" />
              </div>
            ) : chat.last_message ? (
              <p className="text-xs text-muted-foreground truncate">
                {chat.last_message_sender_name && chat.type === 'group' && (
                  <span className="text-muted-foreground/70">{chat.last_message_sender_name}: </span>
                )}
                {truncateText(chat.last_message, 35)}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
