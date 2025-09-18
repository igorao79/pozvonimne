/**
 * Устойчивый менеджер каналов Supabase с автоматическим переподключением
 * Решает проблему сбросов соединения через 40 минут
 */

import { createClient } from '@/utils/supabase/client'
import { createSubscriptionHandler, createReconnectionManager, logSubscriptionError } from './subscriptionHelpers'

interface ChannelConfig {
  channelName: string
  setup: (channel: any) => any
  onSubscribed?: () => void
  onError?: (error: string) => void
  maxReconnectAttempts?: number
  reconnectDelay?: number
  keepAliveInterval?: number
  healthCheckInterval?: number
}

interface ChannelState {
  channel: any
  config: ChannelConfig
  reconnectionManager: any
  keepAliveTimer?: NodeJS.Timeout
  healthCheckTimer?: NodeJS.Timeout
  lastActivity: number
  errorCount: number
  isHealthy: boolean
}

class ResilientChannelManager {
  private static instance: ResilientChannelManager
  private channels: Map<string, ChannelState> = new Map()
  private supabase = createClient()
  private globalHealthTimer?: NodeJS.Timeout

  private constructor() {
    this.startGlobalHealthMonitoring()
    this.setupGlobalErrorHandling()
  }

  static getInstance(): ResilientChannelManager {
    if (!ResilientChannelManager.instance) {
      ResilientChannelManager.instance = new ResilientChannelManager()
    }
    return ResilientChannelManager.instance
  }

  // Создание устойчивого канала с автоматическим переподключением
  createResilientChannel(config: ChannelConfig): Promise<any> {
    const {
      channelName,
      setup,
      maxReconnectAttempts = 5,
      reconnectDelay = 2000,
      keepAliveInterval = 30000, // 30 секунд keep-alive
      healthCheckInterval = 60000 // проверка здоровья каждую минуту
    } = config

    console.log(`🏗️ [ResilientChannel] Creating resilient channel: ${channelName}`)

    // Удаляем существующий канал если есть
    this.removeChannel(channelName)

    return new Promise((resolve, reject) => {
      const createChannel = () => {
        try {
          // Очищаем старые каналы с тем же именем
          this.cleanupExistingChannels(channelName)

          console.log(`📡 [ResilientChannel] Creating new channel: ${channelName}`)
          const channel = this.supabase.channel(channelName)

          // Настраиваем канал через переданную функцию
          const configuredChannel = setup(channel)

          // Создаем менеджер переподключения
          const reconnectionManager = createReconnectionManager(
            () => {
              console.log(`🔄 [ResilientChannel] Reconnecting channel: ${channelName}`)
              createChannel()
            },
            maxReconnectAttempts,
            reconnectDelay
          )

          // Состояние канала
          const channelState: ChannelState = {
            channel: configuredChannel,
            config,
            reconnectionManager,
            lastActivity: Date.now(),
            errorCount: 0,
            isHealthy: false
          }

          // Подписываемся с улучшенной обработкой ошибок
          configuredChannel.subscribe(
            createSubscriptionHandler(`ResilientChannel:${channelName}`, {
              onSubscribed: () => {
                console.log(`✅ [ResilientChannel] Successfully connected: ${channelName}`)
                channelState.isHealthy = true
                channelState.errorCount = 0
                channelState.lastActivity = Date.now()
                reconnectionManager.reset()

                // Запускаем keep-alive и health check
                this.startKeepAlive(channelState, keepAliveInterval)
                this.startHealthCheck(channelState, healthCheckInterval)

                config.onSubscribed?.()
                resolve(configuredChannel)
              },
              onError: (error) => {
                console.error(`❌ [ResilientChannel] Channel error in ${channelName}:`, error)
                channelState.isHealthy = false
                channelState.errorCount++
                
                // При критическом количестве ошибок - переподключение
                if (channelState.errorCount >= 3) {
                  console.log(`🔄 [ResilientChannel] Too many errors (${channelState.errorCount}), attempting reconnection for ${channelName}`)
                  this.attemptReconnection(channelState)
                }

                config.onError?.(error)
              },
              onTimeout: (error) => {
                console.warn(`⏱️ [ResilientChannel] Timeout in ${channelName}:`, error)
                channelState.isHealthy = false
                this.attemptReconnection(channelState)
              },
              onClosed: () => {
                console.log(`🚪 [ResilientChannel] Channel closed: ${channelName}`)
                channelState.isHealthy = false
                this.attemptReconnection(channelState)
              }
            })
          )

          // Сохраняем состояние канала
          this.channels.set(channelName, channelState)

        } catch (error) {
          console.error(`💥 [ResilientChannel] Failed to create channel ${channelName}:`, error)
          reject(error)
        }
      }

      createChannel()
    })
  }

  // Попытка переподключения канала
  private attemptReconnection(channelState: ChannelState) {
    const { channelName } = channelState.config
    
    console.log(`🔄 [ResilientChannel] Attempting reconnection for: ${channelName}`)
    
    // Очищаем таймеры
    this.clearChannelTimers(channelState)
    
    // Удаляем старый канал
    try {
      if (channelState.channel && typeof channelState.channel.unsubscribe === 'function') {
        channelState.channel.unsubscribe()
      }
      this.supabase.removeChannel(channelState.channel)
    } catch (error) {
      console.warn(`⚠️ [ResilientChannel] Error cleaning up old channel:`, error)
    }

    // Запускаем переподключение через менеджер
    const success = channelState.reconnectionManager.reconnect()
    if (!success) {
      console.error(`💀 [ResilientChannel] Max reconnection attempts reached for: ${channelName}`)
      this.channels.delete(channelName)
    }
  }

  // Keep-alive для поддержания соединения
  private startKeepAlive(channelState: ChannelState, interval: number) {
    if (channelState.keepAliveTimer) {
      clearInterval(channelState.keepAliveTimer)
    }

    channelState.keepAliveTimer = setInterval(() => {
      if (channelState.isHealthy && channelState.channel) {
        try {
          // Отправляем ping через канал
          channelState.channel.send({
            type: 'ping',
            timestamp: Date.now()
          })
          channelState.lastActivity = Date.now()
          
          console.log(`💓 [ResilientChannel] Keep-alive sent for: ${channelState.config.channelName}`)
        } catch (error) {
          console.warn(`💓 [ResilientChannel] Keep-alive failed for ${channelState.config.channelName}:`, error)
          channelState.isHealthy = false
        }
      }
    }, interval)
  }

  // Проверка здоровья канала
  private startHealthCheck(channelState: ChannelState, interval: number) {
    if (channelState.healthCheckTimer) {
      clearInterval(channelState.healthCheckTimer)
    }

    channelState.healthCheckTimer = setInterval(() => {
      const now = Date.now()
      const timeSinceLastActivity = now - channelState.lastActivity
      const { channelName } = channelState.config

      console.log(`🏥 [ResilientChannel] Health check for ${channelName}:`, {
        isHealthy: channelState.isHealthy,
        errorCount: channelState.errorCount,
        timeSinceLastActivity: `${Math.round(timeSinceLastActivity / 1000)}s`,
        channelState: channelState.channel?.state
      })

      // Проверяем критические условия
      if (timeSinceLastActivity > 300000) { // 5 минут без активности
        console.warn(`⚠️ [ResilientChannel] No activity for 5+ minutes in ${channelName}, reconnecting`)
        channelState.isHealthy = false
        this.attemptReconnection(channelState)
        return
      }

      if (channelState.errorCount >= 5) {
        console.warn(`⚠️ [ResilientChannel] Too many errors (${channelState.errorCount}) in ${channelName}, reconnecting`)
        this.attemptReconnection(channelState)
        return
      }

      // Проверяем состояние канала
      if (channelState.channel && channelState.channel.state === 'closed') {
        console.warn(`⚠️ [ResilientChannel] Channel is closed for ${channelName}, reconnecting`)
        channelState.isHealthy = false
        this.attemptReconnection(channelState)
      }
    }, interval)
  }

  // Глобальный мониторинг здоровья всех каналов
  private startGlobalHealthMonitoring() {
    this.globalHealthTimer = setInterval(() => {
      const stats = this.getChannelStats()
      
      console.log(`🌍 [ResilientChannel] Global health check:`, stats)

      // Если много нездоровых каналов - массовое переподключение
      if (stats.unhealthyChannels > stats.totalChannels / 2 && stats.totalChannels > 0) {
        console.warn(`🚨 [ResilientChannel] Too many unhealthy channels (${stats.unhealthyChannels}/${stats.totalChannels}), triggering mass reconnection`)
        this.massReconnection()
      }
    }, 120000) // Каждые 2 минуты
  }

  // Настройка глобальной обработки ошибок
  private setupGlobalErrorHandling() {
    // Обработка ошибок WebSocket соединения
    const originalWebSocket = window.WebSocket
    const self = this
    
    window.WebSocket = class extends originalWebSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols)
        
        this.addEventListener('error', (event) => {
          console.error('🌐 [ResilientChannel] Global WebSocket error:', event)
          // Проверяем, если это Supabase WebSocket
          if (typeof url === 'string' && url.includes('supabase.co/realtime')) {
            console.log('🔄 [ResilientChannel] Supabase WebSocket error detected, triggering reconnection check')
            setTimeout(() => self.checkAllChannelsHealth(), 1000)
          }
        })

        this.addEventListener('close', (event) => {
          console.warn('🌐 [ResilientChannel] Global WebSocket closed:', event.code, event.reason)
          if (typeof url === 'string' && url.includes('supabase.co/realtime')) {
            console.log('🔄 [ResilientChannel] Supabase WebSocket closed, triggering reconnection check')
            setTimeout(() => self.checkAllChannelsHealth(), 2000)
          }
        })
      }
    }
  }

  // Очистка существующих каналов с тем же именем
  private cleanupExistingChannels(channelName: string) {
    const existingChannels = this.supabase.getChannels().filter(ch => 
      ch.topic === channelName || ch.topic.includes(channelName)
    )

    existingChannels.forEach(ch => {
      try {
        this.supabase.removeChannel(ch)
        console.log(`🧹 [ResilientChannel] Cleaned up existing channel: ${ch.topic}`)
      } catch (error) {
        console.warn('🧹 [ResilientChannel] Error cleaning up channel:', error)
      }
    })
  }

  // Очистка таймеров канала
  private clearChannelTimers(channelState: ChannelState) {
    if (channelState.keepAliveTimer) {
      clearInterval(channelState.keepAliveTimer)
      channelState.keepAliveTimer = undefined
    }
    if (channelState.healthCheckTimer) {
      clearInterval(channelState.healthCheckTimer)
      channelState.healthCheckTimer = undefined
    }
  }

  // Проверка здоровья всех каналов
  private checkAllChannelsHealth() {
    console.log('🏥 [ResilientChannel] Checking health of all channels...')
    
    for (const [channelName, channelState] of this.channels) {
      if (!channelState.isHealthy || channelState.errorCount > 2) {
        console.log(`🔄 [ResilientChannel] Triggering reconnection for unhealthy channel: ${channelName}`)
        this.attemptReconnection(channelState)
      }
    }
  }

  // Массовое переподключение всех каналов
  private massReconnection() {
    console.log('🚨 [ResilientChannel] Starting mass reconnection...')
    
    for (const [channelName, channelState] of this.channels) {
      setTimeout(() => {
        console.log(`🔄 [ResilientChannel] Mass reconnecting: ${channelName}`)
        this.attemptReconnection(channelState)
      }, Math.random() * 5000) // Случайная задержка до 5 секунд
    }
  }

  // Удаление канала
  removeChannel(channelName: string): void {
    const channelState = this.channels.get(channelName)
    if (!channelState) return

    console.log(`🗑️ [ResilientChannel] Removing channel: ${channelName}`)

    // Очищаем таймеры
    this.clearChannelTimers(channelState)

    // Отменяем переподключения
    channelState.reconnectionManager.cancel()

    // Удаляем канал
    try {
      if (channelState.channel) {
        channelState.channel.unsubscribe()
        this.supabase.removeChannel(channelState.channel)
      }
    } catch (error) {
      console.warn(`⚠️ [ResilientChannel] Error removing channel:`, error)
    }

    this.channels.delete(channelName)
  }

  // Получение статистики каналов
  getChannelStats() {
    const totalChannels = this.channels.size
    const healthyChannels = Array.from(this.channels.values()).filter(state => state.isHealthy).length
    const unhealthyChannels = totalChannels - healthyChannels
    const totalErrors = Array.from(this.channels.values()).reduce((sum, state) => sum + state.errorCount, 0)

    return {
      totalChannels,
      healthyChannels,
      unhealthyChannels,
      totalErrors,
      channels: Array.from(this.channels.keys())
    }
  }

  // Получение канала
  getChannel(channelName: string) {
    return this.channels.get(channelName)?.channel
  }

  // Остановка всех мониторингов
  shutdown() {
    console.log('🛑 [ResilientChannel] Shutting down...')

    if (this.globalHealthTimer) {
      clearInterval(this.globalHealthTimer)
    }

    for (const channelName of this.channels.keys()) {
      this.removeChannel(channelName)
    }
  }
}

export const resilientChannelManager = ResilientChannelManager.getInstance()

// Автоматическая очистка при закрытии страницы
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    resilientChannelManager.shutdown()
  })
}
