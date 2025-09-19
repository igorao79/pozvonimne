export interface Message {
  id: string
  chat_id: string
  sender_id: string
  sender_name: string
  sender_avatar?: string
  content: string
  type: string
  created_at: string
  updated_at: string
  edited_at?: string
  is_deleted: boolean
  reply_to_id?: string
  reply_to_content?: string
  reply_to_sender_name?: string
  metadata: any
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
  other_participant_id?: string
  other_participant_name?: string
  other_participant_avatar?: string
}

export interface ChatInterfaceProps {
  chat: Chat
  onBack: () => void
  isInCall?: boolean
}




