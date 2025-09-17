'use client'

import { create } from 'zustand'

// Пустой массив как константа для стабильной ссылки
const EMPTY_ARRAY: string[] = []

interface TypingState {
  // Храним массивы напрямую для стабильных ссылок
  typingByChat: Record<string, string[]>
  // Простое состояние: печатает ли текущий пользователь
  isUserTyping: Record<string, boolean>
  
  // Действия
  startTyping: (chatId: string, userId: string) => void
  stopTyping: (chatId: string, userId: string) => void
  clearAll: () => void
}

const useTypingStore = create<TypingState>((set) => ({
  typingByChat: {},
  isUserTyping: {},

  startTyping: (chatId: string, userId: string) => {
    console.log(`🎯 [TypingStore] startTyping вызван:`, { chatId, userId })
    set((state) => {
      const currentUsers = state.typingByChat[chatId] || []
      console.log(`🎯 [TypingStore] Текущие typing пользователи в чате ${chatId}:`, currentUsers)
      
      // Если пользователь уже печатает, не изменяем состояние
      if (currentUsers.includes(userId)) {
        console.log(`🎯 [TypingStore] Пользователь ${userId} уже печатает, не изменяем состояние`)
        return state
      }
      
      // Создаем новый массив с добавленным пользователем
      const newUsers = [...currentUsers, userId]
      console.log(`🎯 [TypingStore] Новый список typing пользователей:`, newUsers)
      
      const newState = {
        ...state,
        typingByChat: {
          ...state.typingByChat,
          [chatId]: newUsers
        },
        isUserTyping: {
          ...state.isUserTyping,
          [chatId]: true
        }
      }
      
      console.log(`🎯 [TypingStore] Новое состояние typingByChat:`, newState.typingByChat)
      return newState
    })
  },

  stopTyping: (chatId: string, userId: string) => {
    console.log(`🎯 [TypingStore] stopTyping вызван:`, { chatId, userId })
    set((state) => {
      const currentUsers = state.typingByChat[chatId] || []
      console.log(`🎯 [TypingStore] Текущие typing пользователи в чате ${chatId}:`, currentUsers)
      
      // Если пользователь не печатает, не изменяем состояние
      if (!currentUsers.includes(userId)) {
        console.log(`🎯 [TypingStore] Пользователь ${userId} не печатает, не изменяем состояние`)
        return state
      }
      
      // Создаем новый массив без этого пользователя
      const newUsers = currentUsers.filter(id => id !== userId)
      const newTypingByChat = { ...state.typingByChat }
      
      if (newUsers.length === 0) {
        // Удаляем чат из объекта, если больше никто не печатает
        console.log(`🎯 [TypingStore] Никто больше не печатает, удаляем чат ${chatId}`)
        delete newTypingByChat[chatId]
      } else {
        console.log(`🎯 [TypingStore] Обновляем список для чата ${chatId}:`, newUsers)
        newTypingByChat[chatId] = newUsers
      }
      
      const newState = {
        ...state,
        typingByChat: newTypingByChat,
        isUserTyping: {
          ...state.isUserTyping,
          [chatId]: false
        }
      }
      
      console.log(`🎯 [TypingStore] Новое состояние после stopTyping:`, newState.typingByChat)
      return newState
    })
  },

  clearAll: () => {
    set({
      typingByChat: {},
      isUserTyping: {}
    })
  }
}))

export default useTypingStore