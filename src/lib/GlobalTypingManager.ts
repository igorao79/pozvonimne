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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators'
          // НЕ фильтруем по chat_id - слушаем ВСЕ события
        },
        (payload) => {
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
    const { eventType, new: newRecord, old: oldRecord } = payload
    const chatId = (newRecord as any)?.chat_id || (oldRecord as any)?.chat_id
    const userId = (newRecord as any)?.user_id || (oldRecord as any)?.user_id

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
      console.log(`✅ [Typing] ${userId} печатает в ${chatId}`)
      startTyping(chatId, userId)
      this.setTypingTimeout(chatId, userId, 5000)
    } else if (eventType === 'DELETE') {
      console.log(`🛑 [Typing] ${userId} прекратил печатать в ${chatId}`)
      stopTyping(chatId, userId)
      this.clearTypingTimeout(chatId, userId)
    } else if (eventType === 'UPDATE') {
      startTyping(chatId, userId)
      this.setTypingTimeout(chatId, userId, 5000)
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
