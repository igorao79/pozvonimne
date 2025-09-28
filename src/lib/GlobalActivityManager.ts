import { createClient } from '@/utils/supabase/client'
import { useActivityStore, ActivityType } from '@/store/useActivityStore'

class GlobalActivityManager {
  private supabase = createClient()
  private subscriptions = new Map<string, any>()
  private timeouts = new Map<string, NodeJS.Timeout>()
  private isInitialized = false
  private currentUserId: string | null = null

  async initialize(userId: string) {
    if (this.isInitialized && this.currentUserId === userId) {
      console.log('🎯 [GlobalActivity] Уже инициализирован для пользователя:', userId)
      return
    }

    console.log('🚀 [GlobalActivity] Инициализация для пользователя:', userId)
    
    // Очищаем предыдущие подписки
    this.cleanup()
    
    this.currentUserId = userId
    this.createTypingSubscription(userId)
    this.createVoiceRecordingSubscription(userId)
    this.isInitialized = true
    
    console.log('✅ [GlobalActivity] Успешно инициализирован')
  }

  private createTypingSubscription(userId: string) {
    console.log('📡 [Activity] Создание подписки на typing для пользователя:', userId)
    
    const channel = this.supabase
      .channel('global_typing')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'typing_indicators'
      }, (payload: any) => {
        this.handleActivityEvent(payload, userId, 'typing')
      })
      .subscribe((status: string) => {
        console.log('📡 [Activity] Статус подписки typing:', status)
      })

    this.subscriptions.set('typing', channel)
  }

  private createVoiceRecordingSubscription(userId: string) {
    console.log('📡 [Activity] Создание подписки на voice_recording для пользователя:', userId)
    
    const channel = this.supabase
      .channel('global_voice_recording')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'voice_recording_indicators'
      }, (payload: any) => {
        this.handleActivityEvent(payload, userId, 'voice_recording')
      })
      .subscribe((status: string) => {
        console.log('📡 [Activity] Статус подписки voice_recording:', status)
      })

    this.subscriptions.set('voice_recording', channel)
  }

  private handleActivityEvent(payload: any, currentUserId: string, activityType: ActivityType) {
    const { eventType, new: newRecord, old: oldRecord } = payload
    const chatId = (newRecord as any)?.chat_id || (oldRecord as any)?.chat_id
    const userId = (newRecord as any)?.user_id || (oldRecord as any)?.user_id

    if (!chatId || !userId) {
      console.log(`⚠️ [GlobalActivity] ${activityType} событие без chat_id или user_id:`, payload)
      return
    }

    // Игнорируем свои события
    if (userId === currentUserId) {
      console.log(`⚠️ [GlobalActivity] Игнорируем свое ${activityType} событие:`, userId)
      return
    }

    const { startActivity, stopActivity } = useActivityStore.getState()

    if (eventType === 'INSERT') {
      console.log(`✅ [Activity] ${userId} начал ${activityType} в ${chatId}`)
      startActivity(chatId, userId, activityType)
      this.setActivityTimeout(chatId, userId, activityType, this.getTimeoutForActivity(activityType))
    } else if (eventType === 'DELETE') {
      console.log(`🛑 [Activity] ${userId} прекратил ${activityType} в ${chatId}`)
      stopActivity(chatId, userId, activityType)
      this.clearActivityTimeout(chatId, userId, activityType)
    } else if (eventType === 'UPDATE') {
      startActivity(chatId, userId, activityType)
      this.setActivityTimeout(chatId, userId, activityType, this.getTimeoutForActivity(activityType))
    }
  }

  private getTimeoutForActivity(activityType: ActivityType): number {
    switch (activityType) {
      case 'typing':
        return 5000 // 5 секунд
      case 'voice_recording':
        return 35000 // 35 секунд
      default:
        return 5000
    }
  }

  public setActivityTimeout(chatId: string, userId: string, activityType: ActivityType, timeoutMs: number) {
    const key = `${chatId}:${userId}:${activityType}`
    
    // Очищаем предыдущий таймаут
    this.clearActivityTimeout(chatId, userId, activityType)
    
    // Устанавливаем новый таймаут
    const timeout = setTimeout(() => {
      console.log(`⏰ [Activity] Таймаут ${activityType} для ${userId} в ${chatId}`)
      const { stopActivity } = useActivityStore.getState()
      stopActivity(chatId, userId, activityType)
      this.timeouts.delete(key)
    }, timeoutMs)
    
    this.timeouts.set(key, timeout)
  }

  public clearActivityTimeout(chatId: string, userId: string, activityType: ActivityType) {
    const key = `${chatId}:${userId}:${activityType}`
    const timeout = this.timeouts.get(key)
    
    if (timeout) {
      clearTimeout(timeout)
      this.timeouts.delete(key)
    }
  }

  cleanup() {
    console.log('🛑 [GlobalActivity] Очистка подписок и таймаутов')
    
    // Очищаем подписки
    this.subscriptions.forEach((channel) => {
      this.supabase.removeChannel(channel)
    })
    this.subscriptions.clear()
    
    // Очищаем таймауты
    this.timeouts.forEach((timeout) => {
      clearTimeout(timeout)
    })
    this.timeouts.clear()
    
    this.isInitialized = false
    this.currentUserId = null
  }

  getStats() {
    return {
      isInitialized: this.isInitialized,
      subscriptionsCount: this.subscriptions.size,
      timeoutsCount: this.timeouts.size
    }
  }
}

export const globalActivityManager = new GlobalActivityManager()
