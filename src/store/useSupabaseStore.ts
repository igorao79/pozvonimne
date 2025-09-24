import { create } from 'zustand'
import { createClient } from '@/utils/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

interface SupabaseState {
  supabase: SupabaseClient
  cleanupChannels: () => void
}

// Создаем единственный экземпляр Supabase клиента
const supabaseInstance = createClient()

// Функция для очистки всех каналов (кроме критически важных)
const cleanupChannels = () => {
  console.log('🧹 Начинаем очистку каналов...')

  const channels = supabaseInstance.getChannels()
  let cleanedCount = 0

  channels.forEach(channel => {
    // Не удаляем критически важные каналы:
    // - глобальные каналы сообщений и статусов пользователей
    // - каналы входящих звонков (calls:)
    // - устойчивые каналы ResilientChannelManager (chat_messages_, webrtc:)
    // Они должны жить на протяжении сессии
    if (!channel.topic.includes('global_messages_') &&
        !channel.topic.includes('user_profiles_changes') &&
        !channel.topic.includes('chat_user_status_') &&
        !channel.topic.includes('chat_messages_') &&
        !channel.topic.includes('webrtc:') &&
        !channel.topic.includes('calls:')) {
      console.log('🗑️ Очищаем канал:', channel.topic)
      supabaseInstance.removeChannel(channel)
      cleanedCount++
    }
  })

  console.log(`🧹 Очищено ${cleanedCount} каналов`)
}

const useSupabaseStore = create<SupabaseState>(() => ({
  supabase: supabaseInstance,
  cleanupChannels
}))

export default useSupabaseStore
