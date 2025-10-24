'use client'

import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Pin } from 'lucide-react'
import { useTypingUsersWithTypes } from '@/hooks/useTypingSelectors'
import { useSinglePremiumData } from '@/hooks/usePremiumData'
import { PremiumNickname } from '@/components/ui'
import useCallStore from '@/store/useCallStore'
import { TypingDots } from './TypingIndicator'
import { Chat } from '@/types/chat'

interface PinnedChatItemProps {
  chat: Chat
  onClick: () => void
  isSelected: boolean
  formatLastMessageTime: (timestamp?: string) => string
  truncateText: (text: string, maxLength?: number) => string
  onContextMenu: (chatId: string, chatName: string, position: { x: number; y: number }) => void
}

export const PinnedChatItem: React.FC<PinnedChatItemProps> = ({
  chat,
  onClick,
  isSelected,
  formatLastMessageTime,
  truncateText,
  onContextMenu
}) => {
  const { userId } = useCallStore()
  
  // Drag & Drop функциональность
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chat.id })

  // Стили для drag & drop анимации
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // Получаем премиум данные для приватного чата
  const { premiumData: otherParticipantPremiumData } = useSinglePremiumData(
    chat.type === 'private' ? chat.other_participant_id || null : null
  )

  // Получаем информацию о печатании
  const typingUsersWithTypes = useTypingUsersWithTypes(chat.id)
  const otherTypingUsersWithTypes = React.useMemo(() => {
    if (!userId) return typingUsersWithTypes
    return typingUsersWithTypes.filter(user => user.userId !== userId)
  }, [typingUsersWithTypes, userId])

  const isTyping = otherTypingUsersWithTypes.length > 0
  const isSomeoneRecordingVoice = otherTypingUsersWithTypes.some(user => user.type === 'voice')

  // Обработчик правого клика для контекстного меню
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onContextMenu(chat.id, chat.name, { x: e.clientX, y: e.clientY })
  }

  // Обработчик долгого нажатия для мобильных устройств
  const [longPressTimer, setLongPressTimer] = React.useState<NodeJS.Timeout | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    const timer = setTimeout(() => {
      // Создаем события для контекстного меню при долгом нажатии
      const touch = e.touches[0]
      if (touch) {
        onContextMenu(chat.id, chat.name, { x: touch.clientX, y: touch.clientY })
      }
    }, 500) // 500мс для долгого нажатия
    
    setLongPressTimer(timer)
  }

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }

  // Обработчик клика с предотвращением конфликта с drag
  const handleClick = (e: React.MouseEvent) => {
    if (!isDragging) {
      onClick()
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative px-2 py-1.5 chat-list-item-hover hover:bg-muted/50 cursor-pointer transition-all duration-200 chat-list-item border-l-2 border-l-primary/30 bg-primary/5 ${
        isSelected ? 'bg-primary/15 border-r-2 border-r-primary' : ''
      } ${isDragging ? 'shadow-lg z-50 rotate-2' : ''}`}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      {...attributes}
    >
      <div className="flex items-center space-x-1.5">
        {/* Иконка закрепления */}
        <div className="flex-shrink-0 w-3 flex justify-center">
          <Pin className="w-3 h-3 text-primary/70" />
        </div>

        {/* Аватар */}
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
            <div className="w-full h-full bg-gradient-to-br from-primary/70 to-primary flex items-center justify-center">
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
                className="font-medium text-sm truncate text-primary/90"
              />
            ) : (
              <h3 className="font-medium text-primary/90 text-sm truncate">
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
                  {isSomeoneRecordingVoice ? 'записывает голосовое...' : 'печатает'}
                </span>
                <TypingDots size="sm" />
              </div>
            ) : chat.last_message || chat.last_message_type ? (
              <p className="text-xs text-muted-foreground truncate">
                {chat.last_message_sender_name && chat.type === 'group' && (
                  <span className="text-muted-foreground/70">{chat.last_message_sender_name}: </span>
                )}
                {chat.last_message_type === 'voice'
                  ? '🎵 Голосовое сообщение'
                  : chat.last_message_type === 'call'
                  ? 'Звонок'
                  : chat.last_message
                  ? truncateText(chat.last_message, 30)
                  : ''}
              </p>
            ) : null}
          </div>
        </div>

        {/* Иконка перетаскивания */}
        <div 
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
          {...listeners}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
        </div>
      </div>

      {/* Индикатор перетаскивания */}
      {isDragging && (
        <div className="absolute inset-0 bg-primary/10 border border-primary/30 rounded pointer-events-none" />
      )}
    </div>
  )
}

export default PinnedChatItem
