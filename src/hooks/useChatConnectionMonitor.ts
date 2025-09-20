'use client'

/**
 * Мониторинг соединений чатов и автоматическое восстановление
 * Решает проблему "засыпания" сообщений через несколько минут
 */

import { useEffect, useRef, useCallback } from 'react'
import useSupabaseStore from '@/store/useSupabaseStore'
import { resilientChannelManager } from '@/utils/resilientChannelManager'

interface UseChatConnectionMonitorProps {
  chatId: string
  userId: string | null
  isActive: boolean // Активен ли чат в данный момент
  onConnectionIssue?: () => void // Callback при проблемах с соединением
}

interface ConnectionHealth {
  lastMessageReceived: number
  lastPingSent: number
  lastPongReceived: number
  consecutiveFailures: number
  isHealthy: boolean
  connectionScore: number // 0-100, где 100 = отличное соединение
}

export const useChatConnectionMonitor = ({
  chatId,
  userId,
  isActive,
  onConnectionIssue
}: UseChatConnectionMonitorProps) => {
  const { supabase } = useSupabaseStore()
  const healthRef = useRef<ConnectionHealth>({
    lastMessageReceived: Date.now(),
    lastPingSent: 0,
    lastPongReceived: 0,
    consecutiveFailures: 0,
    isHealthy: true,
    connectionScore: 100
  })
  
  const monitorIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastTestMessageRef = useRef<string | null>(null)

  // Обновление здоровья соединения при получении сообщений
  const updateMessageReceived = useCallback(() => {
    const now = Date.now()
    healthRef.current.lastMessageReceived = now
    healthRef.current.consecutiveFailures = 0
    healthRef.current.isHealthy = true
    
    // Улучшаем оценку соединения
    healthRef.current.connectionScore = Math.min(100, healthRef.current.connectionScore + 5)
    
    console.log('💓 ChatConnectionMonitor: Message received, health updated', {
      chatId: chatId.slice(0, 8),
      score: healthRef.current.connectionScore
    })
  }, [chatId])

  // Отправка ping сообщения для проверки соединения
  const sendPing = useCallback(async () => {
    if (!userId || !isActive) return

    const now = Date.now()
    const pingId = `ping_${now}_${Math.random().toString(36).substr(2, 9)}`
    
    try {
      console.log('🏓 ChatConnectionMonitor: Sending ping', {
        chatId: chatId.slice(0, 8),
        pingId
      })
      
      healthRef.current.lastPingSent = now
      
      // Отправляем специальное ping сообщение через существующий канал
      const channelName = `global_messages_${userId.substring(0, 8)}`
      const channel = resilientChannelManager.getChannel(channelName)
      
      if (channel) {
        await channel.send({
          type: 'broadcast',
          event: 'connection_ping',
          payload: {
            ping_id: pingId,
            sender_id: userId,
            chat_id: chatId,
            timestamp: now
          }
        })
        
        // Ожидаем pong в течение 5 секунд
        setTimeout(() => {
          const timeSinceLastPong = Date.now() - healthRef.current.lastPongReceived
          if (timeSinceLastPong > 5000 && healthRef.current.lastPingSent === now) {
            console.warn('⚠️ ChatConnectionMonitor: Ping timeout, connection may be dead')
            healthRef.current.consecutiveFailures++
            healthRef.current.connectionScore = Math.max(0, healthRef.current.connectionScore - 15)
            
            if (healthRef.current.consecutiveFailures >= 3) {
              healthRef.current.isHealthy = false
              onConnectionIssue?.()
            }
          }
        }, 5000)
      } else {
        console.warn('⚠️ ChatConnectionMonitor: No channel available for ping')
        healthRef.current.consecutiveFailures++
      }
    } catch (error) {
      console.error('❌ ChatConnectionMonitor: Failed to send ping:', error)
      healthRef.current.consecutiveFailures++
      healthRef.current.connectionScore = Math.max(0, healthRef.current.connectionScore - 10)
    }
  }, [userId, chatId, isActive, onConnectionIssue])

  // Проверка здоровья соединения
  const checkConnectionHealth = useCallback(() => {
    if (!isActive) return

    const now = Date.now()
    const health = healthRef.current
    
    // Время с последнего сообщения
    const timeSinceLastMessage = now - health.lastMessageReceived
    
    // Критическое время без активности - 3 минуты
    const CRITICAL_INACTIVE_TIME = 3 * 60 * 1000
    // Предупреждающее время - 2 минуты
    const WARNING_INACTIVE_TIME = 2 * 60 * 1000
    
    console.log('🔍 ChatConnectionMonitor: Health check', {
      chatId: chatId.slice(0, 8),
      timeSinceLastMessage: Math.round(timeSinceLastMessage / 1000) + 's',
      consecutiveFailures: health.consecutiveFailures,
      connectionScore: health.connectionScore,
      isHealthy: health.isHealthy
    })
    
    // Если долго нет сообщений - отправляем ping
    if (timeSinceLastMessage > WARNING_INACTIVE_TIME && health.lastPingSent < now - 30000) {
      console.log('⚠️ ChatConnectionMonitor: Long time without messages, sending ping')
      sendPing()
    }
    
    // Критическое состояние - соединение мертво
    if (timeSinceLastMessage > CRITICAL_INACTIVE_TIME && health.consecutiveFailures >= 2) {
      console.error('💀 ChatConnectionMonitor: Connection appears dead, triggering recovery')
      health.isHealthy = false
      health.connectionScore = 0
      onConnectionIssue?.()
    }
    
    // Снижаем оценку соединения со временем
    if (timeSinceLastMessage > 60000) { // Больше минуты без сообщений
      health.connectionScore = Math.max(0, health.connectionScore - 1)
    }
  }, [chatId, isActive, sendPing, onConnectionIssue])

  // Обработка pong ответов
  const handlePong = useCallback((pongData: any) => {
    const { ping_id, sender_id } = pongData
    console.log('🏓 ChatConnectionMonitor: Received pong', {
      chatId: chatId.slice(0, 8),
      ping_id,
      from: sender_id?.slice(0, 8)
    })
    
    healthRef.current.lastPongReceived = Date.now()
    healthRef.current.consecutiveFailures = 0
    healthRef.current.isHealthy = true
    healthRef.current.connectionScore = Math.min(100, healthRef.current.connectionScore + 10)
  }, [chatId])

  // Настройка мониторинга
  useEffect(() => {
    if (!userId || !isActive) {
      console.log('💤 ChatConnectionMonitor: Pausing monitoring (not active)')
      return
    }

    console.log('🚀 ChatConnectionMonitor: Starting monitoring for chat', chatId.slice(0, 8))
    
    // Сброс здоровья при запуске
    healthRef.current = {
      lastMessageReceived: Date.now(),
      lastPingSent: 0,
      lastPongReceived: Date.now(),
      consecutiveFailures: 0,
      isHealthy: true,
      connectionScore: 100
    }

    // Регулярная проверка здоровья каждые 30 секунд
    monitorIntervalRef.current = setInterval(checkConnectionHealth, 30000)
    
    // Ping каждые 2 минуты если нет активности
    pingIntervalRef.current = setInterval(() => {
      const timeSinceLastMessage = Date.now() - healthRef.current.lastMessageReceived
      if (timeSinceLastMessage > 2 * 60 * 1000) { // 2 минуты
        sendPing()
      }
    }, 2 * 60 * 1000)

    // Подписываемся на pong ответы
    const channelName = `global_messages_${userId.substring(0, 8)}`
    const existingChannel = resilientChannelManager.getChannel(channelName)
    
    if (existingChannel) {
      existingChannel.on('broadcast', { event: 'connection_pong' }, (payload: any) => {
        handlePong(payload.payload)
      })
    }

    return () => {
      console.log('🛑 ChatConnectionMonitor: Stopping monitoring for chat', chatId.slice(0, 8))
      
      if (monitorIntervalRef.current) {
        clearInterval(monitorIntervalRef.current)
        monitorIntervalRef.current = null
      }
      
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
        pingIntervalRef.current = null
      }
      
      // Убираем обработчик pong
      if (existingChannel) {
        try {
          existingChannel.off('broadcast', { event: 'connection_pong' }, handlePong)
        } catch (error) {
          console.warn('⚠️ ChatConnectionMonitor: Error removing pong handler:', error)
        }
      }
    }
  }, [userId, chatId, isActive, checkConnectionHealth, sendPing, handlePong])

  // Возвращаем функции для внешнего использования
  return {
    updateMessageReceived,
    getConnectionHealth: () => healthRef.current,
    isConnectionHealthy: () => healthRef.current.isHealthy,
    getConnectionScore: () => healthRef.current.connectionScore,
    sendPing: () => sendPing()
  }
}

export default useChatConnectionMonitor
