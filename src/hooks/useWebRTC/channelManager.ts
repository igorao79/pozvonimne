import { createClient } from '@/utils/supabase/client'

// Менеджер для управления Supabase каналами с автоматической очисткой
class ChannelManager {
  private static instance: ChannelManager
  private activeChannels: Map<string, any> = new Map()
  private channelCleanupTimeouts: Map<string, NodeJS.Timeout> = new Map()
  private supabase = createClient()

  private constructor() {}

  static getInstance(): ChannelManager {
    if (!ChannelManager.instance) {
      ChannelManager.instance = new ChannelManager()
    }
    return ChannelManager.instance
  }

  // Создание канала с автоматической очисткой
  createManagedChannel(channelName: string, options: { 
    autoCleanup?: boolean
    cleanupDelayMs?: number
    userId?: string
  } = {}) {
    const { autoCleanup = true, cleanupDelayMs = 300000, userId } = options // 5 минут по умолчанию
    
    // Удаляем существующий канал если есть
    this.removeChannel(channelName)

    console.log(`📺 [User ${userId?.slice(0, 8)}] Creating managed channel: ${channelName}`)

    const channel = this.supabase.channel(channelName)
    this.activeChannels.set(channelName, channel)

    // Автоматическая очистка
    if (autoCleanup) {
      const timeoutId = setTimeout(() => {
        console.log(`📺 [User ${userId?.slice(0, 8)}] Auto-cleaning channel: ${channelName}`)
        this.removeChannel(channelName)
      }, cleanupDelayMs)
      
      this.channelCleanupTimeouts.set(channelName, timeoutId)
    }

    return channel
  }

  // Удаление канала с очисткой таймаута
  removeChannel(channelName: string): void {
    const channel = this.activeChannels.get(channelName)
    if (channel) {
      try {
        this.supabase.removeChannel(channel)
        this.activeChannels.delete(channelName)
        console.log(`📺 Channel removed: ${channelName}`)
      } catch (err) {
        console.warn('Error removing channel:', err)
      }
    }

    // Очищаем таймаут
    const timeoutId = this.channelCleanupTimeouts.get(channelName)
    if (timeoutId) {
      clearTimeout(timeoutId)
      this.channelCleanupTimeouts.delete(channelName)
    }
  }

  // Получение активного канала
  getChannel(channelName: string) {
    return this.activeChannels.get(channelName)
  }

  // Продление времени жизни канала
  extendChannelLifetime(channelName: string, additionalMs: number = 300000) {
    const timeoutId = this.channelCleanupTimeouts.get(channelName)
    if (timeoutId) {
      clearTimeout(timeoutId)
      
      const newTimeoutId = setTimeout(() => {
        this.removeChannel(channelName)
      }, additionalMs)
      
      this.channelCleanupTimeouts.set(channelName, newTimeoutId)
    }
  }

  // Очистка всех каналов пользователя
  cleanupUserChannels(userId: string): void {
    console.log(`📺 [User ${userId?.slice(0, 8)}] Cleaning up all user channels`)
    
    for (const [channelName] of this.activeChannels) {
      if (channelName.includes(userId)) {
        this.removeChannel(channelName)
      }
    }
  }

  // Полная очистка всех каналов (для экстренных случаев)
  cleanupAllChannels(): void {
    console.log('📺 Emergency cleanup: removing all channels')
    
    // Очищаем все таймауты
    for (const timeoutId of this.channelCleanupTimeouts.values()) {
      clearTimeout(timeoutId)
    }
    this.channelCleanupTimeouts.clear()

    // Удаляем все каналы
    for (const channel of this.activeChannels.values()) {
      try {
        this.supabase.removeChannel(channel)
      } catch (err) {
        console.warn('Error during emergency channel cleanup:', err)
      }
    }
    this.activeChannels.clear()
  }

  // Получение статистики каналов
  getChannelStats() {
    return {
      activeChannels: this.activeChannels.size,
      scheduledCleanups: this.channelCleanupTimeouts.size,
      channels: Array.from(this.activeChannels.keys())
    }
  }
}

export const channelManager = ChannelManager.getInstance()

// Хук очистки каналов при размонтировании страницы
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    channelManager.cleanupAllChannels()
  })
}
