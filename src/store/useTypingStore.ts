'use client'

import { create } from 'zustand'

// Пустой массив как константа для стабильной ссылки
const EMPTY_ARRAY: string[] = []

interface TypingState {
  // Храним массивы напрямую для стабильных ссылок
  typingByChat: Record<string, string[]>
  // Простое состояние: печатает ли текущий пользователь
  isUserTyping: Record<string, boolean>
  // Тип активности для каждого пользователя в каждом чате
  typingTypes: Record<string, Record<string, 'text' | 'voice'>>
  
  // Действия
  startTyping: (chatId: string, userId: string, type?: 'text' | 'voice') => void
  stopTyping: (chatId: string, userId: string) => void
  getTypingType: (chatId: string, userId: string) => 'text' | 'voice'
  clearAll: () => void
}

const useTypingStore = create<TypingState>((set, get) => ({
  typingByChat: {},
  isUserTyping: {},
  typingTypes: {},

  startTyping: (chatId: string, userId: string, type: 'text' | 'voice' = 'text') => {
    console.log(`🎯 [TypingStore] startTyping вызван:`, { chatId, userId, type })
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
        },
        typingTypes: {
          ...state.typingTypes,
          [chatId]: {
            ...state.typingTypes[chatId],
            [userId]: type
          }
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

      // Очищаем тип активности
      const newTypingTypes = { ...state.typingTypes }
      if (newTypingTypes[chatId]) {
        delete newTypingTypes[chatId][userId]
        if (Object.keys(newTypingTypes[chatId]).length === 0) {
          delete newTypingTypes[chatId]
        }
      }

      const newState = {
        ...state,
        typingByChat: newTypingByChat,
        isUserTyping: {
          ...state.isUserTyping,
          [chatId]: false
        },
        typingTypes: newTypingTypes
      }

      console.log(`🎯 [TypingStore] Новое состояние после stopTyping:`, newState.typingByChat)
      return newState
    })
  },

  getTypingType: (chatId: string, userId: string) => {
    return get().typingTypes[chatId]?.[userId] || 'text'
  },

  clearAll: () => {
    set({
      typingByChat: {},
      isUserTyping: {}
    })
  }
}))

export default useTypingStore