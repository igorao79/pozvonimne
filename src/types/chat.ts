// Общие типы для чатов используемые во всем приложении

export interface Chat {
  id: string
  type: 'private' | 'group'
  name: string
  avatar_url?: string
  last_message?: string
  last_message_type?: string
  last_message_at?: string
  last_message_sender_id?: string
  last_message_sender_name?: string
  unread_count?: number // Сделаем опциональным везде для совместимости
  other_participant_id?: string
  other_participant_name?: string
  other_participant_avatar?: string
  other_participant_is_creator?: boolean
  other_participant_status?: string
  other_participant_last_seen?: string
  created_at?: string
  updated_at?: string
  _updateTimestamp?: number // Для принудительного обновления
}

export interface ChatContextMenuData {
  chatId: string
  chatName: string
  position: { x: number; y: number }
}

export interface ChatListItemProps {
  chat: Chat
  onClick: () => void
  isSelected: boolean
  formatLastMessageTime: (timestamp?: string) => string
  truncateText: (text: string, maxLength?: number) => string
  onContextMenu?: (chatId: string, chatName: string, position: { x: number; y: number }) => void
}

export interface PinnedChatRecord {
  chat_id: string
  "position": number
  pinned_at: string
}

export interface PinnedChatsHookReturn {
  pinnedChats: string[]
  isPinned: (chatId: string) => boolean
  pinChat: (chatId: string) => Promise<boolean>
  unpinChat: (chatId: string) => Promise<boolean>
  reorderPinnedChats: (oldIndex: number, newIndex: number) => Promise<boolean>
  getPinnedChatsCount: () => number
  isLoading: boolean
}
