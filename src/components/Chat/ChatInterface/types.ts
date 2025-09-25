export interface Message {
  id: string
  chat_id: string
  sender_id: string
  sender_name: string
  sender_avatar?: string
  content: string
  type: 'text' | 'call' | string  // Добавляем тип 'call' для сообщений о звонках
  created_at: string
  updated_at: string
  edited_at?: string
  is_deleted: boolean
  reply_to_id?: string
  reply_to_content?: string
  reply_to_sender_name?: string
  metadata: any
  delivered_at?: string  // Простое поле доставки
  read_at?: string       // Простое поле прочтения
}

// Типы для realtime payload
export interface RealtimeMessagePayload {
  id: string
  chat_id: string
  sender_id: string
  content: string
  type?: string
  created_at: string
  updated_at: string
  edited_at?: string
  is_deleted?: boolean
  metadata?: any
  delivered_at?: string  // Простое поле доставки
  read_at?: string       // Простое поле прочтения
}

export interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new?: RealtimeMessagePayload
  old?: RealtimeMessagePayload
}

export interface Chat {
  id: string
  type: 'private' | 'group'
  name: string
  avatar_url?: string
  last_message?: string
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

export interface ChatInterfaceProps {
  chat: Chat
  onBack: () => void
  isInCall?: boolean
  hasUnreadMessages?: boolean
}




