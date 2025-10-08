'use client'

/**
 * 🔥 РАДИКАЛЬНОЕ ИСПРАВЛЕНИЕ: ГЛОБАЛЬНЫЙ STORE
 * Используем существующую глобальную синхронизацию вместо сложных прямых подписок
 */

import { useEffect, useCallback, useRef } from 'react'
import useChatSyncStore from '@/store/useChatSyncStore'
import { useSoundNotifications } from './useSoundNotifications'

interface Chat {
  id: string
  [key: string]: any
}

interface UseChatListRealtimeProps {
  userId?: string | null
  onChatUpdate: () => void
  chats?: Chat[] // Список чатов пользователя для фильтрации звуковых уведомлений
}

export const useChatListRealtime = ({
  userId,
  onChatUpdate,
  chats = []
}: UseChatListRealtimeProps) => {
  // 🔥 РАДИКАЛЬНОЕ ИСПРАВЛЕНИЕ: Используем ГЛОБАЛЬНЫЙ STORE вместо прямых подписок!
  const { lastMessageUpdate, registerRefreshCallback, registerMessageCallback, isGlobalSyncActive } = useChatSyncStore()
  const { maybePlayNotification } = useSoundNotifications()
  
  // Храним список ID чатов пользователя
  const userChatIdsRef = useRef<Set<string>>(new Set())

  const stableCallback = useCallback(() => {
    console.log('🔥 ГЛОБАЛЬНЫЙ STORE: Получен сигнал обновления ChatList')
    onChatUpdate()
    
    // Обновляем список чатов пользователя после обновления
    // (Это будет вызвано после того как ChatList загрузит чаты)
    // Список будет обновлен в следующем эффекте
  }, [onChatUpdate])

  // 🔥 ПОДКЛЮЧАЕМСЯ к глобальному store (ИСПРАВЛЕНО: не ждем isGlobalSyncActive!)
  useEffect(() => {
    if (!userId) {
      console.log('🔥 ГЛОБАЛЬНЫЙ STORE: userId отсутствует')
      return
    }

    console.log('🔥 ГЛОБАЛЬНЫЙ STORE: Регистрируем callback для ChatList (не ждем активации)')
    console.log('🔍 ГЛОБАЛЬНЫЙ STORE: userId:', userId.slice(0, 8))
    console.log('🔍 ГЛОБАЛЬНЫЙ STORE: isGlobalSyncActive:', isGlobalSyncActive)
    
    // Регистрируем наш callback в глобальном store СРАЗУ
    const unregister = registerRefreshCallback(stableCallback)
    
    console.log('🎉 ГЛОБАЛЬНЫЙ STORE: ChatList подключен к глобальной синхронизации!')

    return () => {
      console.log('🔥 ГЛОБАЛЬНЫЙ STORE: Отключаем ChatList от глобальной синхронизации')
      unregister()
    }
  }, [userId, registerRefreshCallback, stableCallback])

  // 🔥 ПРИНУДИТЕЛЬНОЕ ОБНОВЛЕНИЕ при изменении lastMessageUpdate
  useEffect(() => {
    if (lastMessageUpdate && userId) {
      console.log('🔥 ГЛОБАЛЬНЫЙ STORE: Принудительное обновление ChatList')
      console.log('🔍 ГЛОБАЛЬНЫЙ STORE: lastMessageUpdate:', lastMessageUpdate)
      stableCallback()
    }
  }, [lastMessageUpdate, userId, stableCallback])
  
  // 🔊 Подписываемся на сообщения для звуковых уведомлений
  useEffect(() => {
    if (!userId) return
    
    const handleNewMessage = (messageData: any) => {
      console.log('🔊 ChatList: Получено новое сообщение:', {
        chatId: messageData.chatId?.slice(0, 8),
        senderId: messageData.senderId?.slice(0, 8),
        userChatIds: Array.from(userChatIdsRef.current).map(id => id.slice(0, 8))
      })
      
      // Проверяем, является ли пользователь участником этого чата
      if (!userChatIdsRef.current.has(messageData.chatId)) {
        console.log('🔇 ChatList: Это не наш чат - НЕ воспроизводим звук')
        return
      }
      
      // Проверяем, что сообщение не от нас
      if (messageData.senderId === userId) {
        console.log('🔇 ChatList: Сообщение от нас - НЕ воспроизводим звук')
        return
      }
      
      console.log('🔊 ChatList: Это наш чат - воспроизводим звук!')
      maybePlayNotification(messageData)
    }
    
    const unregisterMessage = registerMessageCallback(handleNewMessage)
    
    return () => {
      unregisterMessage()
    }
  }, [userId, registerMessageCallback, maybePlayNotification])
  
  // Обновляем список ID чатов пользователя при изменении chats
  useEffect(() => {
    if (chats && chats.length > 0) {
      const chatIds = new Set(chats.map(chat => chat.id))
      userChatIdsRef.current = chatIds
      console.log('🔊 Обновлен список чатов пользователя:', {
        count: chatIds.size,
        ids: Array.from(chatIds).map(id => id.slice(0, 8))
      })
    }
  }, [chats])
}

// Экспортируем функцию для обновления списка чатов пользователя
export const updateUserChatIds = (chatIds: string[]) => {
  // Эта функция может быть вызвана из ChatList после загрузки чатов
  console.log('🔊 Обновляем список чатов пользователя:', chatIds.length)
}