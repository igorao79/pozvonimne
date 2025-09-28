import { create } from 'zustand'

export type ActivityType = 'typing' | 'voice_recording'

interface ActivityState {
  // Карта чатов и активности пользователей: chatId -> userId -> ActivityType[]
  activityByChat: Record<string, Record<string, ActivityType[]>>
  
  // Действия
  startActivity: (chatId: string, userId: string, activityType: ActivityType) => void
  stopActivity: (chatId: string, userId: string, activityType: ActivityType) => void
  clearAllActivity: (chatId: string, userId: string) => void
  clearAll: () => void
}

export const useActivityStore = create<ActivityState>((set) => ({
  activityByChat: {},

  startActivity: (chatId: string, userId: string, activityType: ActivityType) => {
    set((state) => {
      const chatActivity = state.activityByChat[chatId] || {}
      const userActivity = chatActivity[userId] || []
      
      // Если активность уже есть, не добавляем дубликат
      if (userActivity.includes(activityType)) {
        return state
      }
      
      // Добавляем новую активность
      const newUserActivity = [...userActivity, activityType]
      
      return {
        ...state,
        activityByChat: {
          ...state.activityByChat,
          [chatId]: {
            ...chatActivity,
            [userId]: newUserActivity
          }
        }
      }
    })
  },

  stopActivity: (chatId: string, userId: string, activityType: ActivityType) => {
    set((state) => {
      const chatActivity = state.activityByChat[chatId] || {}
      const userActivity = chatActivity[userId] || []
      
      // Если активности нет, ничего не делаем
      if (!userActivity.includes(activityType)) {
        return state
      }
      
      // Убираем активность
      const newUserActivity = userActivity.filter(activity => activity !== activityType)
      
      // Если у пользователя больше нет активности, удаляем его из чата
      const newChatActivity = { ...chatActivity }
      if (newUserActivity.length === 0) {
        delete newChatActivity[userId]
      } else {
        newChatActivity[userId] = newUserActivity
      }
      
      // Если в чате больше нет активности, удаляем чат
      const newActivityByChat = { ...state.activityByChat }
      if (Object.keys(newChatActivity).length === 0) {
        delete newActivityByChat[chatId]
      } else {
        newActivityByChat[chatId] = newChatActivity
      }
      
      return {
        ...state,
        activityByChat: newActivityByChat
      }
    })
  },

  clearAllActivity: (chatId: string, userId: string) => {
    set((state) => {
      const chatActivity = state.activityByChat[chatId] || {}
      const newChatActivity = { ...chatActivity }
      delete newChatActivity[userId]
      
      const newActivityByChat = { ...state.activityByChat }
      if (Object.keys(newChatActivity).length === 0) {
        delete newActivityByChat[chatId]
      } else {
        newActivityByChat[chatId] = newChatActivity
      }
      
      return {
        ...state,
        activityByChat: newActivityByChat
      }
    })
  },

  clearAll: () => {
    set({ activityByChat: {} })
  }
}))

export default useActivityStore
