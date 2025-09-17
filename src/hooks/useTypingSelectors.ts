'use client'

import { useMemo } from 'react'
import useTypingStore from '@/store/useTypingStore'

// Хук для получения списка печатающих пользователей (исключая текущего пользователя)
export const useTypingUsers = (chatId: string, excludeUserId?: string) => {
  const typingArray = useTypingStore((state) => state.typingByChat[chatId])
  
  // Возвращаем стабильную ссылку на пустой массив если нет данных
  // Исключаем текущего пользователя из списка
  const result = useMemo(() => {
    const users = typingArray || []
    
    if (excludeUserId) {
      const filtered = users.filter(userId => userId !== excludeUserId)
      
      // Логируем только если есть typing пользователи
      if (filtered.length > 0) {
        console.log(`🎯 [useTypingUsers] НАЙДЕНЫ TYPING ПОЛЬЗОВАТЕЛИ в чате ${chatId}:`, {
          allUsers: users,
          filteredUsers: filtered,
          excludedUserId: excludeUserId
        })
      }
      
      return filtered
    }
    
    // Логируем только если есть typing пользователи
    if (users.length > 0) {
      console.log(`🎯 [useTypingUsers] НАЙДЕНЫ TYPING ПОЛЬЗОВАТЕЛИ (без фильтрации):`, users)
    }
    
    return users
  }, [typingArray, excludeUserId, chatId])
  
  return result
}

// Хук для проверки, печатает ли кто-то в чате
export const useIsAnyoneTyping = (chatId: string) => {
  const typingArray = useTypingStore((state) => state.typingByChat[chatId])
  
  return useMemo(() => Boolean(typingArray && typingArray.length > 0), [typingArray])
}

// Хук для получения typing пользователей в приватном чате (исключая текущего пользователя)
export const usePrivateChatTyping = (chatId: string, isPrivate: boolean, excludeUserId?: string) => {
  const typingArray = useTypingStore((state) => state.typingByChat[chatId])
  
  return useMemo(() => {
    if (!isPrivate) return []
    const users = typingArray || []
    if (excludeUserId) {
      return users.filter(userId => userId !== excludeUserId)
    }
    return users
  }, [typingArray, isPrivate, excludeUserId])
}
