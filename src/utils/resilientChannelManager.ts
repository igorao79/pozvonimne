'use client'

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
  isReconnecting: boolean  // Флаг активного переподключения
  recreationCount: number  // Счетчик пересозданий канала
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
      maxReconnectAttempts = 5,  // Больше попыток для важных каналов
      reconnectDelay = 3000,     // Умеренная задержка между попытками
      keepAliveInterval = 45000, // Keep-alive каждые 45 секунд (оптимально для чатов)
      healthCheckInterval = 90000 // Проверка здоровья каждые 1.5 минуты
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
              // Используем метод класса вместо рекурсивного вызова локальной функции
              this.recreateChannel(channelName)
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
            isHealthy: false,
            isReconnecting: false,
            recreationCount: 0
          }

          // Определяем, является ли это каналом WebRTC или звонков
          const isWebRTCOrCallChannel = channelName.includes('webrtc:') || channelName.includes('calls:')
          
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
                
                // При критическом количестве ошибок - переподключение (с защитой)
                if (channelState.errorCount >= 3 && !channelState.isReconnecting) {
                  console.log(`🔄 [ResilientChannel] Too many errors (${channelState.errorCount}), attempting reconnection for ${channelName}`)
                  this.attemptReconnection(channelState)
                }

                config.onError?.(error)
              },
              onTimeout: (error) => {
                console.warn(`⏱️ [ResilientChannel] Timeout in ${channelName}:`, error)
                channelState.isHealthy = false
                if (!channelState.isReconnecting) {
                  this.attemptReconnection(channelState)
                }
              },
              onClosed: () => {
                console.log(`🚪 [ResilientChannel] Channel closed: ${channelName}`)
                channelState.isHealthy = false
                if (!channelState.isReconnecting) {
                  this.attemptReconnection(channelState)
                }
              },
              suppressExpectedErrors: isWebRTCOrCallChannel // Подавляем ожидаемые ошибки для WebRTC и звонков
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

  // Безопасное пересоздание канала без рекурсии
  private recreateChannel(channelName: string) {
    const channelState = this.channels.get(channelName)
    if (!channelState) {
      console.warn(`⚠️ [ResilientChannel] Cannot recreate - channel not found: ${channelName}`)
      return
    }

    // Защита от повторного переподключения
    if (channelState.isReconnecting) {
      console.warn(`⚠️ [ResilientChannel] Already reconnecting: ${channelName}`)
      return
    }

    // Защита от слишком частых пересозданий
    channelState.recreationCount++
    if (channelState.recreationCount > 10) {
      console.error(`💀 [ResilientChannel] Too many recreations (${channelState.recreationCount}) for: ${channelName}`)
      this.channels.delete(channelName)
      return
    }

    console.log(`🔄 [ResilientChannel] Recreating channel: ${channelName} (attempt ${channelState.recreationCount})`)
    channelState.isReconnecting = true
    
    // Очищаем таймеры текущего канала
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

    // Пересоздаем канал с той же конфигурацией
    try {
      this.cleanupExistingChannels(channelName)
      
      const channel = this.supabase.channel(channelName)
      const configuredChannel = channelState.config.setup(channel)
      
      // Обновляем состояние канала
      channelState.channel = configuredChannel
      channelState.lastActivity = Date.now()
      channelState.isHealthy = false
      
      // Определяем, является ли это каналом WebRTC или звонков (для переподключения)
      const isWebRTCOrCallChannel = channelName.includes('webrtc:') || channelName.includes('calls:')
      
      // Подписываемся заново
      configuredChannel.subscribe(
        createSubscriptionHandler(`ResilientChannel:${channelName}`, {
          onSubscribed: () => {
            console.log(`✅ [ResilientChannel] Successfully reconnected: ${channelName}`)
            channelState.isHealthy = true
            channelState.errorCount = 0
            channelState.lastActivity = Date.now()
            channelState.isReconnecting = false  // Сбрасываем флаг переподключения
            channelState.recreationCount = 0     // Сбрасываем счетчик при успехе
            channelState.reconnectionManager.reset()

            // Запускаем keep-alive и health check
            this.startKeepAlive(channelState, channelState.config.keepAliveInterval || 30000)
            this.startHealthCheck(channelState, channelState.config.healthCheckInterval || 60000)

            channelState.config.onSubscribed?.()
          },
          onError: (error) => {
            console.error(`❌ [ResilientChannel] Reconnection error in ${channelName}:`, error)
            channelState.isHealthy = false
            channelState.errorCount++
            channelState.config.onError?.(error)
          },
          onTimeout: (error) => {
            console.warn(`⏱️ [ResilientChannel] Reconnection timeout in ${channelName}:`, error)
            channelState.isHealthy = false
          },
          onClosed: () => {
            console.log(`🚪 [ResilientChannel] Reconnected channel closed: ${channelName}`)
            channelState.isHealthy = false
          },
          suppressExpectedErrors: isWebRTCOrCallChannel // Подавляем ожидаемые ошибки для WebRTC и звонков
        })
      )
    } catch (error) {
      console.error(`💥 [ResilientChannel] Failed to recreate channel ${channelName}:`, error)
      channelState.errorCount++
      channelState.isReconnecting = false  // Сбрасываем флаг при ошибке
    }
  }

  // Попытка переподключения канала
  private attemptReconnection(channelState: ChannelState) {
    const { channelName } = channelState.config
    
    console.log(`🔄 [ResilientChannel] Attempting reconnection for: ${channelName}`)
    
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
          
          // Логируем keep-alive только в debug режиме
          if (process.env.NODE_ENV === 'development') {
            console.log(`💓 [ResilientChannel] Keep-alive sent for: ${channelState.config.channelName}`)
          }
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

      // Логируем health check только в debug режиме или при проблемах
      if (process.env.NODE_ENV === 'development' || !channelState.isHealthy) {
        console.log(`🏥 [ResilientChannel] Health check for ${channelName}:`, {
          isHealthy: channelState.isHealthy,
          errorCount: channelState.errorCount,
          timeSinceLastActivity: `${Math.round(timeSinceLastActivity / 1000)}s`,
          channelState: channelState.channel?.state
        })
      }

      // Проверяем критические условия для чатов - увеличиваем таймаут
      const isMessageChannel = channelName.includes('chat_messages_')
      const maxInactivityTime = isMessageChannel ? 900000 : 600000 // 15 минут для чатов, 10 для остальных
      
      if (timeSinceLastActivity > maxInactivityTime) {
        console.warn(`⚠️ [ResilientChannel] No activity for ${Math.round(maxInactivityTime/60000)}+ minutes in ${channelName}, reconnecting`)
        channelState.isHealthy = false
        if (!channelState.isReconnecting) {
          this.attemptReconnection(channelState)
        }
        return
      }

      if (channelState.errorCount >= 5 && !channelState.isReconnecting) {
        console.warn(`⚠️ [ResilientChannel] Too many errors (${channelState.errorCount}) in ${channelName}, reconnecting`)
        this.attemptReconnection(channelState)
        return
      }

      // Проверяем состояние канала
      if (channelState.channel && channelState.channel.state === 'closed' && !channelState.isReconnecting) {
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

      // Очень консервативная проверка для массового переподключения (только в критических случаях)
      if (stats.unhealthyChannels > 3 && stats.unhealthyChannels > stats.totalChannels * 0.8 && stats.totalChannels > 2) {
        console.warn(`🚨 [ResilientChannel] Too many unhealthy channels (${stats.unhealthyChannels}/${stats.totalChannels}), triggering mass reconnection`)
        this.massReconnection()
      }
    }, 600000) // Увеличили до 10 минут для меньшей нагрузки
  }

  // Настройка глобальной обработки ошибок
  private setupGlobalErrorHandling() {
    // Проверяем что мы на клиенте
    if (typeof window === 'undefined') {
      return
    }

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

// Автоматическая очистка при закрытии страницы (только на клиенте)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    resilientChannelManager.shutdown()
  })

  // Также инициализируем менеджер при загрузке страницы
  window.addEventListener('load', () => {
    // Это гарантирует что singleton инициализируется только на клиенте
    const manager = ResilientChannelManager.getInstance()
    console.log('🌐 [ResilientChannel] Client-side initialization complete')
  })
}
