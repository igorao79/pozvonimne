import { useRef } from 'react'
import { useVoiceRecordingStore } from '@/store/useVoiceRecordingStore'

// Функция для поверхностного сравнения массивов
const shallowEqualArrays = (a: string[], b: string[]): boolean => {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

// Селектор для получения пользователей записывающих в конкретном чате
export const useVoiceRecordingUsers = (chatId: string) => {
  const prevUsersRef = useRef<string[]>([])

  const users = useVoiceRecordingStore(state => {
    const newUsers = state.recordingByChat[chatId] || []
    
    // Возвращаем предыдущий массив если он идентичен новому
    if (shallowEqualArrays(prevUsersRef.current, newUsers)) {
      return prevUsersRef.current
    }
    
    prevUsersRef.current = newUsers
    return newUsers
  })

  return users
}

// Селектор для проверки записывает ли конкретный пользователь в чате
export const useIsUserRecording = (chatId: string, userId: string) => {
  return useVoiceRecordingStore(state => {
    const recordingUsers = state.recordingByChat[chatId] || []
    return recordingUsers.includes(userId)
  })
}