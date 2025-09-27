'use client'

import React from 'react'
import { usePrivateChatTyping } from '@/hooks/useTypingSelectors'
import { useSinglePremiumData } from '@/hooks/usePremiumData'
import { PremiumNickname } from '@/components/ui'
import useCallStore from '@/store/useCallStore'
import { TypingDots } from './TypingIndicator'

interface Chat {
  id: string
  type: 'private' | 'group'
  name: string
  avatar_url?: string
  last_message?: string
  last_message_type?: string
  last_message_at?: string
  last_message_sender_id?: string
  last_message_sender_name?: string
  unread_count?: number
  other_participant_id?: string
  other_participant_name?: string
  other_participant_avatar?: string
  other_participant_is_creator?: boolean
  other_participant_status?: string
  other_participant_last_seen?: string
  created_at?: string
  updated_at?: string
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

  // Получаем премиум данные для приватного чата (для другого участника)
  const { premiumData: otherParticipantPremiumData } = useSinglePremiumData(
    chat.type === 'private' ? chat.other_participant_id || null : null
  )

  // Получаем typing users из оптимизированного хука для приватных чатов (исключаем себя)
  const typingUsers = usePrivateChatTyping(chat.id, chat.type === 'private', userId || undefined)

  const isTyping = typingUsers.length > 0

  // 🔥 ИСПРАВЛЕНИЕ: Throttled debug логи (только 5% обновлений для уменьшения спама)
  React.useEffect(() => {
    if (Math.random() < 0.05) { // Логируем только 5% обновлений
      console.log(`📱 ChatListItem [${chat.id.slice(0, 8)}] получил обновление:`, {
        unread_count: chat.unread_count ?? 0,
        last_message: chat.last_message?.slice(0, 20),
        last_message_at: chat.last_message_at,
        isSelected
      })
    }
  }, [chat.unread_count, chat.last_message, chat.last_message_at, isSelected])

  return (
    <div
      onClick={onClick}
      className={`px-2 py-1.5 chat-list-item-hover hover:bg-muted cursor-pointer transition-colors chat-list-item ${
        isSelected ? 'bg-primary/10 border-r-2 border-primary' : ''
      }`}
      key={chat.id} // Добавляем key для стабильности
    >
      <div className="flex items-center space-x-1.5">
          {/* Ультракомпактный аватар */}
          <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex-shrink-0 chat-avatar">
            {(chat.avatar_url || chat.other_participant_avatar) ? (
              <img
                src={chat.avatar_url || chat.other_participant_avatar}
                alt={chat.name}
                className="w-full h-full object-cover select-none"
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
                onMouseDown={(e) => e.preventDefault()}
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
            {chat.type === 'private' ? (
              <PremiumNickname 
                displayName={chat.name}
                premiumData={otherParticipantPremiumData}
                showIcon={true}
                showGlow={false}
                className="font-medium text-sm truncate"
              />
            ) : (
              <h3 className="font-medium text-foreground text-sm truncate">
                {chat.name}
              </h3>
            )}
            <div className="flex items-center space-x-1">
              {chat.last_message_at && (
                <span className="text-xs text-muted-foreground">
                  {formatLastMessageTime(chat.last_message_at)}
                </span>
              )}
              {(chat.unread_count ?? 0) > 0 && (
                <div className="bg-primary text-primary-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center animate-pulse">
                  {(chat.unread_count ?? 0) > 99 ? '99+' : (chat.unread_count ?? 0)}
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
                {chat.last_message_type === 'voice'
                  ? 'Голосовое сообщение'
                  : truncateText(chat.last_message, 35)
                }
              </p>
            ) : chat.last_message_type === 'voice' ? (
              <p className="text-xs text-muted-foreground truncate">
                {chat.last_message_sender_name && chat.type === 'group' && (
                  <span className="text-muted-foreground/70">{chat.last_message_sender_name}: </span>
                )}
                Голосовое сообщение
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

export default React.memo(ChatListItem)
