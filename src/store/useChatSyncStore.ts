import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import useSupabaseStore from './useSupabaseStore'
import useCallStore from './useCallStore'

interface ChatSyncState {
  lastMessageUpdate: number
  isGlobalSyncActive: boolean
  refreshCallbacks: Set<() => void>
  
  // Actions
  refreshChatList: () => void
  registerRefreshCallback: (callback: () => void) => () => void
  startGlobalSync: () => void
  stopGlobalSync: () => void
}

const useChatSyncStore = create<ChatSyncState>()(
  subscribeWithSelector((set, get) => ({
    lastMessageUpdate: Date.now(),
    isGlobalSyncActive: false,
    refreshCallbacks: new Set(),

    refreshChatList: () => {
      console.log('🔄 Глобальное обновление списка чатов через Zustand')
      set({ lastMessageUpdate: Date.now() })
      
      const { refreshCallbacks } = get()
      refreshCallbacks.forEach(callback => {
        try {
          callback()
        } catch (error) {
          console.error('Ошибка при вызове callback обновления чата:', error)
        }
      })
    },

    registerRefreshCallback: (callback: () => void) => {
      const { refreshCallbacks } = get()
      const newCallbacks = new Set(refreshCallbacks)
      newCallbacks.add(callback)
      set({ refreshCallbacks: newCallbacks })
      
      // Возвращаем функцию для отписки
      return () => {
        const { refreshCallbacks: currentCallbacks } = get()
        const updatedCallbacks = new Set(currentCallbacks)
        updatedCallbacks.delete(callback)
        set({ refreshCallbacks: updatedCallbacks })
      }
    },

    startGlobalSync: () => {
      const { isGlobalSyncActive } = get()
      if (isGlobalSyncActive) return

      const { supabase } = useSupabaseStore.getState()
      const { userId } = useCallStore.getState()
      
      if (!userId) {
        console.warn('🌐 Нет userId для запуска глобальной синхронизации')
        return
      }

      console.log('🌐 Запуск глобальной синхронизации чатов для пользователя:', userId)

      let debounceTimeout: NodeJS.Timeout

      const globalChannel = supabase
        .channel(`global_chat_sync_${userId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        }, (payload) => {
          console.log('🌐 Глобальное обновление: новое сообщение', payload)
          
          clearTimeout(debounceTimeout)
          debounceTimeout = setTimeout(() => {
            get().refreshChatList()
          }, 100)
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'chats'
        }, (payload) => {
          console.log('🌐 Глобальное обновление: изменение чата', payload)
          
          clearTimeout(debounceTimeout)
          debounceTimeout = setTimeout(() => {
            get().refreshChatList()
          }, 100)
        })
        .subscribe((status) => {
          console.log('🌐 Статус глобальной синхронизации чатов:', status)
          set({ isGlobalSyncActive: status === 'SUBSCRIBED' })
        })

      // Сохраняем канал для последующей очистки
      set({ isGlobalSyncActive: true })

      // Подписываемся на изменения userId для перезапуска синхронизации
      const unsubscribeUserId = useCallStore.subscribe(
        (state) => state.userId,
        (newUserId) => {
          if (!newUserId) {
            get().stopGlobalSync()
          } else {
            // Перезапускаем синхронизацию с новым userId
            get().stopGlobalSync()
            setTimeout(() => get().startGlobalSync(), 100)
          }
        }
      )

      // Функция очистки
      const cleanup = () => {
        clearTimeout(debounceTimeout)
        supabase.removeChannel(globalChannel)
        unsubscribeUserId()
        set({ isGlobalSyncActive: false })
      }

      // Сохраняем функцию очистки в store
      ;(globalChannel as any).cleanup = cleanup
    },

    stopGlobalSync: () => {
      const { supabase } = useSupabaseStore.getState()
      const channels = supabase.getChannels()
      
      channels.forEach(channel => {
        if (channel.topic.includes('global_chat_sync')) {
          if ((channel as any).cleanup) {
            ;(channel as any).cleanup()
          } else {
            supabase.removeChannel(channel)
          }
        }
      })
      
      set({ isGlobalSyncActive: false })
    }
  }))
)

export default useChatSyncStore
