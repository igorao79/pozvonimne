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
    // Не удаляем глобальные каналы сообщений и статусов пользователей
    // Они должны жить на протяжении сессии
    if (!channel.topic.includes('global_messages_') &&
        !channel.topic.includes('user_profiles_changes') &&
        !channel.topic.includes('chat_user_status_')) {
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
