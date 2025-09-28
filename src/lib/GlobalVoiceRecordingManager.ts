import { createClient } from '@/utils/supabase/client'
import { useVoiceRecordingStore } from '@/store/useVoiceRecordingStore'

class GlobalVoiceRecordingManager {
  private supabase = createClient()
  private subscriptions = new Map<string, any>()
  private timeouts = new Map<string, NodeJS.Timeout>()
  private isInitialized = false
  private currentUserId: string | null = null

  async initialize(userId: string) {
    if (this.isInitialized && this.currentUserId === userId) {
      console.log('🎤 [GlobalVoiceRecording] Уже инициализирован для пользователя:', userId)
      return
    }

    console.log('🚀 [GlobalVoiceRecording] Инициализация для пользователя:', userId)
    
    // Очищаем предыдущие подписки
    this.cleanup()
    
    this.currentUserId = userId
    this.createGlobalSubscription(userId)
    this.isInitialized = true
    
    console.log('✅ [GlobalVoiceRecording] Успешно инициализирован')
  }

  private createGlobalSubscription(userId: string) {
    console.log('📡 [VoiceRecording] Создание глобальной подписки для пользователя:', userId)
    
    const channel = this.supabase
      .channel('global_voice_recording')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'voice_recording_indicators'
      }, (payload: any) => {
        this.handleRecordingEvent(payload, userId)
      })
      .subscribe((status: string) => {
        console.log('📡 [VoiceRecording] Статус подписки:', status)
      })

    this.subscriptions.set('global', channel)
  }

  private handleRecordingEvent(payload: any, currentUserId: string) {
    const { eventType, new: newRecord, old: oldRecord } = payload
    const chatId = (newRecord as any)?.chat_id || (oldRecord as any)?.chat_id
    const userId = (newRecord as any)?.user_id || (oldRecord as any)?.user_id

    if (!chatId || !userId) {
      console.log('⚠️ [GlobalVoiceRecording] Событие без chat_id или user_id:', payload)
      return
    }

    // Игнорируем свои события
    if (userId === currentUserId) {
      console.log('⚠️ [GlobalVoiceRecording] Игнорируем свое событие:', userId)
      return
    }

    const { startRecording, stopRecording } = useVoiceRecordingStore.getState()

    if (eventType === 'INSERT') {
      console.log(`✅ [VoiceRecording] ${userId} записывает голосовое в ${chatId}`)
      startRecording(chatId, userId)
      this.setRecordingTimeout(chatId, userId, 35000) // 35 секунд таймаут
    } else if (eventType === 'DELETE') {
      console.log(`🛑 [VoiceRecording] ${userId} прекратил запись голосового в ${chatId}`)
      stopRecording(chatId, userId)
      this.clearRecordingTimeout(chatId, userId)
    } else if (eventType === 'UPDATE') {
      startRecording(chatId, userId)
      this.setRecordingTimeout(chatId, userId, 35000)
    }
  }

  public setRecordingTimeout(chatId: string, userId: string, timeoutMs: number) {
    const key = `${chatId}:${userId}`
    
    // Очищаем предыдущий таймаут
    this.clearRecordingTimeout(chatId, userId)
    
    // Устанавливаем новый таймаут
    const timeout = setTimeout(() => {
      console.log(`⏰ [VoiceRecording] Таймаут записи для ${userId} в ${chatId}`)
      const { stopRecording } = useVoiceRecordingStore.getState()
      stopRecording(chatId, userId)
      this.timeouts.delete(key)
    }, timeoutMs)
    
    this.timeouts.set(key, timeout)
  }

  public clearRecordingTimeout(chatId: string, userId: string) {
    const key = `${chatId}:${userId}`
    const timeout = this.timeouts.get(key)
    
    if (timeout) {
      clearTimeout(timeout)
      this.timeouts.delete(key)
    }
  }

  cleanup() {
    console.log('🛑 [GlobalVoiceRecording] Очистка подписок и таймаутов')
    
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

export const globalVoiceRecordingManager = new GlobalVoiceRecordingManager()