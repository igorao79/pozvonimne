import React from 'react'
import { Chat } from '@/types/chat'
import ChatListItem from './ChatListItem'

interface ArchiveViewProps {
  archivedChats: Chat[]
  selectedChatId?: string
  onChatSelect: (chat: Chat) => void
  formatLastMessageTime: (timestamp?: string) => string
  truncateText: (text: string, maxLength?: number) => string
  onContextMenu: (chatId: string, chatName: string, position: { x: number; y: number }) => void
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({
  archivedChats,
  selectedChatId,
  onChatSelect,
  formatLastMessageTime,
  truncateText,
  onContextMenu
}) => {
  if (archivedChats.length === 0) {
    return (
      <div className="px-3 py-4 text-center">
        <div className="py-6">
          <svg className="w-8 h-8 mx-auto text-muted-foreground mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
          <p className="text-muted-foreground text-sm">Архив пуст</p>
        </div>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-100">
      {archivedChats.map((chat) => (
        <ChatListItem
          key={chat.id}
          chat={chat}
          onClick={() => onChatSelect(chat)}
          isSelected={selectedChatId === chat.id}
          formatLastMessageTime={formatLastMessageTime}
          truncateText={truncateText}
          onContextMenu={onContextMenu}
        />
      ))}
    </div>
  )
}

export default ArchiveView
