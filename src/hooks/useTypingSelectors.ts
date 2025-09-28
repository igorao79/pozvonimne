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

      // Логируем изменения
      console.log(`🎯 [useTypingUsers] ${chatId} (exclude: ${excludeUserId}):`, {
        allUsers: users,
        filteredUsers: filtered,
        hasTyping: filtered.length > 0
      })

      return filtered
    }

    // Логируем только если есть typing пользователи
    if (users.length > 0) {
      console.log(`🎯 [useTypingUsers] ${chatId} (без фильтрации):`, users)
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
  }, [typingArray, isPrivate, excludeUserId, chatId])
}

// Хук для получения typing пользователей с их типами активности
export const useTypingUsersWithTypes = (chatId: string) => {
  const typingArray = useTypingStore((state) => state.typingByChat[chatId])
  const typingTypes = useTypingStore((state) => state.typingTypes[chatId])

  // 🔥 ДИАГНОСТИКА: Всегда логируем
  console.log(`🎯 [useTypingUsersWithTypes] called for ${chatId.slice(0, 8)}, typingArray:`, typingArray, 'typingTypes:', typingTypes)

  return useMemo(() => {
    if (!typingArray) return []

    const result = typingArray.map(userId => ({
      userId,
      type: typingTypes?.[userId] || 'text'
    }))

    // Логируем только если есть изменения
    if (result.length > 0) {
      console.log(`🎯 [useTypingUsersWithTypes] ${chatId.slice(0, 8)} result:`, result)
    }

    return result
  }, [typingArray, typingTypes, chatId])
}
