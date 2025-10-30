'use client'

/**
 * 🔥 РАДИКАЛЬНОЕ ИСПРАВЛЕНИЕ: ГЛОБАЛЬНЫЙ STORE
 * Используем существующую глобальную синхронизацию вместо сложных прямых подписок
 */

import { useEffect, useCallback, useRef, useMemo } from 'react'
import useChatSyncStore from '@/store/useChatSyncStore'
import { useSoundNotifications } from './useSoundNotifications'
import { Chat as ChatType } from '@/types/chat'

interface UseChatListRealtimeProps {
  userId?: string | null
  onChatUpdate: () => void
  chats?: ChatType[] // Список чатов пользователя для фильтрации звуковых уведомлений
}

export const useChatListRealtime = ({
  userId,
  onChatUpdate,
  chats = []
}: UseChatListRealtimeProps) => {
  // 🔥 РАДИКАЛЬНОЕ ИСПРАВЛЕНИЕ: Используем ГЛОБАЛЬНЫЙ STORE вместо прямых подписок!
  const { registerRefreshCallback, registerMessageCallback } = useChatSyncStore()
  const { maybePlayNotification } = useSoundNotifications()
  
  // Храним список ID чатов пользователя
  const userChatIdsRef = useRef<Set<string>>(new Set())

  // Стабилизируем callback через useRef чтобы избежать бесконечных перерегистраций
  const onChatUpdateRef = useRef(onChatUpdate)
  onChatUpdateRef.current = onChatUpdate

  const stableCallback = useMemo(() => () => {
    console.log('🔥 ГЛОБАЛЬНЫЙ STORE: Получен сигнал обновления ChatList')
    onChatUpdateRef.current()
  }, [])

  // 🔥 ПОДКЛЮЧАЕМСЯ к глобальному store (ИСПРАВЛЕНО: не ждем isGlobalSyncActive!)
  useEffect(() => {
    if (!userId) {
      console.log('🔥 ГЛОБАЛЬНЫЙ STORE: userId отсутствует')
      return
    }

    console.log('🔥 ГЛОБАЛЬНЫЙ STORE: Регистрируем callback для ChatList (не ждем активации)')
    console.log('🔍 ГЛОБАЛЬНЫЙ STORE: userId:', userId.slice(0, 8))
    
    // Регистрируем наш callback в глобальном store СРАЗУ
    const unregister = registerRefreshCallback(stableCallback)
    
    console.log('🎉 ГЛОБАЛЬНЫЙ STORE: ChatList подключен к глобальной синхронизации!')

    return () => {
      console.log('🔥 ГЛОБАЛЬНЫЙ STORE: Отключаем ChatList от глобальной синхронизации')
      unregister()
    }
  }, [userId, registerRefreshCallback, stableCallback])

  // Убираем принудительное обновление - оно создает дублирование
  // useEffect с lastMessageUpdate УДАЛЕН - он вызывал бесконечный цикл

  // УДАЛЕНО: Принудительное обновление вызывало бесконечный цикл
  // Обновления теперь приходят только через registerRefreshCallback
  
  // 🔊 Подписываемся на сообщения для звуковых уведомлений
  const handleNewMessage = useCallback((messageData: { chatId?: string; senderId?: string; content?: string }) => {
    console.log('🔊 ChatList: Получено новое сообщение:', {
      chatId: messageData.chatId?.slice(0, 8),
      senderId: messageData.senderId?.slice(0, 8),
      userChatIds: Array.from(userChatIdsRef.current).map(id => id.slice(0, 8))
    })
    
    // Проверяем наличие обязательных полей
    if (!messageData.chatId || !messageData.senderId) {
      console.log('🔇 ChatList: Неполные данные сообщения - пропускаем')
      return
    }
    
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
    maybePlayNotification({
      chatId: messageData.chatId,
      senderId: messageData.senderId,
      content: messageData.content || ''
    })
  }, [userId, maybePlayNotification])

  useEffect(() => {
    if (!userId) return
    
    const unregisterMessage = registerMessageCallback(handleNewMessage)
    
    return () => {
      unregisterMessage()
    }
  }, [userId, registerMessageCallback, handleNewMessage])
  
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