'use client'

import { createClient } from '@/utils/supabase/client'
import useTypingStore from '@/store/useTypingStore'

class GlobalTypingManager {
  private supabase = createClient()
  private subscriptions = new Map<string, any>()
  private typingTimeouts = new Map<string, NodeJS.Timeout>()
  private isInitialized = false
  
  public initialize(userId: string) {
    if (this.isInitialized) {
      console.log('🌐 [GlobalTyping] Менеджер уже инициализирован')
      return
    }

    console.log('🌐 [GlobalTyping] Инициализируем глобальный менеджер typing для пользователя:', userId)
    this.isInitialized = true
    
    // Создаем ГЛОБАЛЬНУЮ подписку на ALL typing indicators
    this.createGlobalSubscription(userId)
  }

  private createGlobalSubscription(userId: string) {
    const channelName = `global_typing_${userId}`

    console.log('🌐 [GlobalTyping] Создаем ГЛОБАЛЬНУЮ подписку на все typing indicators')

    const channel = this.supabase
      .channel(channelName)
      // Подписываемся на изменения таблицы typing_indicators
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators'
        },
        (payload) => {
          console.log('📡 [GlobalTyping] Получено изменение таблицы:', payload)
          this.handleTypingEvent(payload, userId)
        }
      )
      .subscribe((status) => {
        console.log('🌐 [GlobalTyping] Статус глобальной подписки:', status)

        if (status === 'SUBSCRIBED') {
          console.log('🎉 [GlobalTyping] ГЛОБАЛЬНАЯ ПОДПИСКА АКТИВНА!')
        } else if (status === 'CLOSED') {
          console.log('💥 [GlobalTyping] ГЛОБАЛЬНАЯ ПОДПИСКА ЗАКРЫТА!')
          // Переподключаемся
          setTimeout(() => {
            console.log('🔄 [GlobalTyping] Переподключаем глобальную подписку...')
            this.createGlobalSubscription(userId)
          }, 1000)
        }
      })

    this.subscriptions.set('global', channel)
  }

  private handleTypingEvent(payload: any, currentUserId: string) {
    console.log('📡 [GlobalTyping] Обработка события:', payload)

    // Извлекаем данные из postgres_changes события
    const eventType = payload.eventType
    const newRecord = payload.new
    const oldRecord = payload.old

    console.log('🔍 [GlobalTyping] Детали события:', { eventType, newRecord, oldRecord })

    // 🔥 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Правильное извлечение данных в зависимости от типа события
    let chatId: string | undefined
    let userId: string | undefined
    let recordId: string | undefined

    if (eventType === 'DELETE') {
      // Для DELETE событий данные находятся в oldRecord
      chatId = oldRecord?.chat_id || payload.old?.chat_id
      userId = oldRecord?.user_id || payload.old?.user_id
      recordId = oldRecord?.id || payload.old?.id

      // 🚨 ЭКСТРЕННАЯ ЗАПЛАТКА: Если нет chat_id/user_id, очищаем ВСЕ активные индикаторы
      if (!chatId || !userId) {
        console.log('🚨 [GlobalTyping] DELETE без chat_id/user_id, выполняем экстренную очистку всех typing индикаторов')

        // Очищаем все активные typing индикаторы
        const { typingByChat } = useTypingStore.getState()

        let clearedCount = 0
        for (const [chatIdKey, users] of Object.entries(typingByChat)) {
          for (const userIdKey of users) {
            console.log(`🚨 [GlobalTyping] ЭКСТРЕННАЯ ОЧИСТКА: очищаем ${userIdKey} из ${chatIdKey}`)
            useTypingStore.getState().stopTyping(chatIdKey, userIdKey)
            this.clearTypingTimeout(chatIdKey, userIdKey)
            clearedCount++
          }
        }

        console.log(`🚨 [GlobalTyping] ЭКСТРЕННАЯ ОЧИСТКА завершена: очищено ${clearedCount} индикаторов`)
        return
      }
    } else {
      // Для INSERT и UPDATE данные находятся в newRecord
      chatId = newRecord?.chat_id || payload.new?.chat_id || payload.record?.chat_id
      userId = newRecord?.user_id || payload.new?.user_id || payload.record?.user_id
    }

    console.log('🔍 [GlobalTyping] Извлеченные данные:', { eventType, chatId, userId, recordId, payloadKeys: Object.keys(payload) })
    console.log('🔍 [GlobalTyping] Полный payload:', JSON.stringify(payload, null, 2))

    // Определяем тип активности на основе данных в записи
    let activityType: 'text' | 'voice' = 'text'
    
    if (eventType === 'DELETE') {
      // Для DELETE событий берем activity_type из oldRecord
      activityType = (oldRecord?.activity_type || payload.old?.activity_type) as 'text' | 'voice' || 'text'
    } else {
      // Для INSERT/UPDATE из newRecord
      activityType = (newRecord?.activity_type || payload.new?.activity_type) as 'text' | 'voice' || 'text'
    }
    
    console.log('🔍 [GlobalTyping] Определенный activity_type:', activityType)

    if (!chatId || !userId) {
      console.log('⚠️ [GlobalTyping] Событие без chat_id или user_id:', payload)
      return
    }

    // Игнорируем свои события
    if (userId === currentUserId) {
      console.log('⚠️ [GlobalTyping] Игнорируем свое событие:', userId)
      return
    }

    const { startTyping, stopTyping } = useTypingStore.getState()

    if (eventType === 'INSERT') {
      console.log(`✅ [Typing] ${userId} ${activityType === 'voice' ? 'записывает голосовое' : 'печатает'} в ${chatId}`, { eventType, chatId, userId, activityType })
      startTyping(chatId, userId, activityType)
      // Для записи голосового не устанавливаем таймаут (пользователь сам остановит)
      // Для текста устанавливаем таймаут 5 секунд
      if (activityType !== 'voice') {
        this.setTypingTimeout(chatId, userId, 5000)
      }
    } else if (eventType === 'DELETE') {
      console.log(`🛑 [Typing] ${userId} прекратил активность в ${chatId}`, { eventType, chatId, userId })
      stopTyping(chatId, userId)
      this.clearTypingTimeout(chatId, userId)

      // Принудительная очистка состояния для надежности
      setTimeout(() => {
        console.log(`🔄 [Typing] Принудительная очистка через 200мс для ${userId}`)
        stopTyping(chatId, userId)
        this.clearTypingTimeout(chatId, userId)
      }, 200)

      // Дополнительная принудительная очистка через 500мс
      setTimeout(() => {
        console.log(`🔄 [Typing] Принудительная очистка через 500мс для ${userId}`)
        stopTyping(chatId, userId)
        this.clearTypingTimeout(chatId, userId)
      }, 500)
    } else if (eventType === 'UPDATE') {
      console.log(`🔄 [Typing] ${userId} обновил активность в ${chatId}`, { activityType, payload })
      startTyping(chatId, userId, activityType)
      // Для записи голосового не устанавливаем таймаут (пользователь сам остановит)
      // Для текста устанавливаем таймаут 5 секунд
      if (activityType !== 'voice') {
        this.setTypingTimeout(chatId, userId, 5000)
      }
    }
  }

  public setTypingTimeout(chatId: string, userId: string, timeoutMs: number) {
    const typingKey = `${chatId}_${userId}`

    // Очищаем существующий таймаут
    this.clearTypingTimeout(chatId, userId)

    const timeout = setTimeout(() => {
      console.log(`⏰ [Typing] Таймаут для ${userId}`)
      const { stopTyping } = useTypingStore.getState()
      stopTyping(chatId, userId)
      this.typingTimeouts.delete(typingKey)
    }, timeoutMs)

    this.typingTimeouts.set(typingKey, timeout)
  }

  public clearTypingTimeout(chatId: string, userId: string) {
    const typingKey = `${chatId}_${userId}`
    const existingTimeout = this.typingTimeouts.get(typingKey)

    if (existingTimeout) {
      clearTimeout(existingTimeout)
      this.typingTimeouts.delete(typingKey)
    }
  }

  // Принудительная очистка индикатора для конкретного пользователя
  public forceStopTyping(chatId: string, userId: string, reason = 'fallback') {
    console.log(`🔄 [Typing] Принудительная очистка ${userId} из ${chatId} (${reason})`)
    
    const { stopTyping } = useTypingStore.getState()
    stopTyping(chatId, userId)
    this.clearTypingTimeout(chatId, userId)
    
    // Множественная очистка для гарантии
    setTimeout(() => {
      console.log(`🔄 [Typing] Повторная очистка ${userId} через 100мс`)
      stopTyping(chatId, userId)
    }, 100)

    setTimeout(() => {
      console.log(`🔄 [Typing] Финальная очистка ${userId} через 300мс`)
      stopTyping(chatId, userId)
    }, 300)
  }

  // Очистка всех typing индикаторов для чата (когда приходит новое сообщение)
  public clearAllTypingInChat(chatId: string, reason = 'new_message') {
    console.log(`🔄 [Typing] Очистка всех typing индикаторов в чате ${chatId} (${reason})`)
    
    const { typingByChat } = useTypingStore.getState()
    const typingUsers = typingByChat[chatId] || []
    
    if (typingUsers.length > 0) {
      console.log(`🔄 [Typing] Очищаем ${typingUsers.length} typing индикаторов:`, typingUsers)
      
      // Очищаем каждого пользователя
      typingUsers.forEach(userId => {
        this.forceStopTyping(chatId, userId, reason)
      })
    }
  }

  public cleanup() {
    console.log('🧹 [GlobalTyping] Очистка всех глобальных подписок и таймаутов')

    // Очищаем все таймауты
    this.typingTimeouts.forEach((timeout) => {
      clearTimeout(timeout)
    })
    this.typingTimeouts.clear()

    // Очищаем подписки
    this.subscriptions.forEach((channel) => {
      this.supabase.removeChannel(channel)
    })
    this.subscriptions.clear()

    this.isInitialized = false
  }
}

// Создаем синглтон
export const globalTypingManager = new GlobalTypingManager()
