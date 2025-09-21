'use client'

import { useRef, useCallback, useEffect } from 'react'
import useTypingStore from '@/store/useTypingStore'
import useCallStore from '@/store/useCallStore'
import useSupabaseStore from '@/store/useSupabaseStore'

interface UseTypingProps {
  chatId: string
  enabled?: boolean
}

interface UseTypingReturn {
  startTyping: () => void
  stopTyping: () => void
  handleInputChange: (value: string) => void
  handleSubmit: () => void
}

export const useTyping = ({ chatId, enabled = true }: UseTypingProps): UseTypingReturn => {
  const { userId } = useCallStore()
  const { supabase } = useSupabaseStore()
  const { startTyping: startTypingStore, stopTyping: stopTypingStore } = useTypingStore()
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastServerUpdateRef = useRef<number>(0)
  const isInitializedRef = useRef(false)

  // Логируем только при первой инициализации
  if (!isInitializedRef.current && enabled && chatId && userId) {
    console.log(`🚀 [useTyping] Hook инициализирован: chatId=${chatId}, userId=${userId}`)
    isInitializedRef.current = true
  }

  const stopTyping = useCallback(async () => {
    if (!enabled || !userId || !chatId) return
    
    console.log(`🛑 [useTyping] Остановка typing для пользователя ${userId} в чате ${chatId}`)

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }

    // Очищаем таймаут в GlobalTypingManager если он есть
    try {
      // Импортируем менеджер динамически чтобы избежать циклических зависимостей
      import('@/lib/GlobalTypingManager').then(({ globalTypingManager }) => {
        globalTypingManager.clearTypingTimeout(chatId, userId)
      }).catch(() => {
        // Менеджер может быть не инициализирован, игнорируем
      })
    } catch (e) {
      // Игнорируем ошибки доступа к глобальному менеджеру
    }

    try {
      // Сначала обновляем локальное состояние
      stopTypingStore(chatId, userId)

      // Затем очищаем в базе данных
      // Используем исправленную функцию с явной передачей user_id
      const { data, error } = await supabase.rpc('clear_typing_indicator_fixed', {
        chat_uuid: chatId,
        user_uuid: userId
      })
      
      if (error) {
        console.error('❌ [useTyping] Ошибка очистки typing indicator:', error)
      } else {
        console.log(`✅ [useTyping] Typing indicator успешно очищен`, data)
      }
    } catch (error) {
      console.error('💥 [useTyping] Исключение при очистке typing indicator:', error)
    }
  }, [enabled, userId, chatId, stopTypingStore, supabase])

  const startTyping = useCallback(async () => {
    if (!enabled || !userId || !chatId) return
    
    try {
      // 🚀 ОПТИМИЗАЦИЯ: Сначала быстро обновляем локальное состояние (UI)
      startTypingStore(chatId, userId)
      
      // Затем асинхронно отправляем в базу данных (не блокирует UI)
      const { data, error } = await supabase.rpc('set_typing_indicator_fixed', {
        chat_uuid: chatId,
        user_uuid: userId
      })
      
      if (error) {
        console.error('❌ [useTyping] Ошибка установки typing indicator:', error)
        // Откатываем локальное состояние при ошибке
        stopTypingStore(chatId, userId)
        return
      }
      
      // Автоматически останавливаем через 3 секунды
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping()
      }, 3000)
    } catch (error) {
      console.error('💥 [useTyping] Исключение при установке typing indicator:', error)
      stopTypingStore(chatId, userId)
    }
  }, [enabled, userId, chatId, startTypingStore, stopTypingStore, supabase, stopTyping])

  const handleInputChange = useCallback((value: string) => {
    if (!enabled || !chatId || !userId) return

    if (value.trim()) {
      // 🚀 МГНОВЕННОЕ UI: Обновляем локальное состояние сразу
      startTypingStore(chatId, userId)

      // AUTO-STOP: Таймер на авто-остановку при бездействии (2.5 сек)
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping()
      }, 2500)

      // 🚀 МАКСИМАЛЬНАЯ ОПТИМИЗАЦИЯ: Сервер обновляется максимум раз в 10 секунд
      // Это предотвращает перегрузку сервера при активном наборе текста
      const now = Date.now()
      if (now - lastServerUpdateRef.current > 10000) { // 10 сек интервал
        lastServerUpdateRef.current = now

        // Асинхронная отправка - не блокирует UI
        startTyping().catch(error => {
          console.warn('❌ Typing update failed:', error)
          // При ошибке откатываем локальное состояние
          stopTypingStore(chatId, userId)
        })
      }
    } else {
      // Нет текста - сразу останавливаем
      stopTyping()
    }
  }, [enabled, chatId, userId, startTypingStore, startTyping, stopTyping, stopTypingStore])

  const handleSubmit = useCallback(() => {
    // При отправке сразу останавливаем typing
    stopTyping()
  }, [stopTyping])

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      if (enabled && userId && chatId) {
        stopTypingStore(chatId, userId)
      }
    }
  }, [])

  return {
    startTyping,
    stopTyping,
    handleInputChange,
    handleSubmit
  }
}
