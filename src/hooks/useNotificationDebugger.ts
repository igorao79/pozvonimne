'use client'

/**
 * 🔥 КРИТИЧЕСКИЙ DEBUG HOOK для мониторинга производительности уведомлений
 * Решает проблему задержки в ~1 минуту при инициализации
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSoundNotifications } from './useSoundNotifications'
import useChatSyncStore from '@/store/useChatSyncStore'

interface DebugMetrics {
  initStartTime: number
  soundSystemReady: boolean
  realtimeConnected: boolean
  firstNotificationTime: number | null
  totalInitTime: number | null
  connectionEvents: Array<{
    event: string
    timestamp: number
    details: any
  }>
}

export const useNotificationDebugger = () => {
  const [metrics, setMetrics] = useState<DebugMetrics>({
    initStartTime: performance.now(),
    soundSystemReady: false,
    realtimeConnected: false,
    firstNotificationTime: null,
    totalInitTime: null,
    connectionEvents: []
  })

  const soundNotifications = useSoundNotifications()
  const { isGlobalSyncActive, registerSoundNotificationCallback } = useChatSyncStore()
  const hasLoggedFirstNotification = useRef(false)

  // Добавление события в debug лог
  const addEvent = useCallback((event: string, details: any = {}) => {
    const timestamp = performance.now()
    setMetrics(prev => ({
      ...prev,
      connectionEvents: [...prev.connectionEvents.slice(-19), { // Храним последние 20 событий
        event,
        timestamp,
        details
      }]
    }))
    
    console.log(`🔥 NOTIFICATION DEBUG [${Math.round(timestamp - metrics.initStartTime)}ms]:`, event, details)
  }, [metrics.initStartTime])

  // Мониторинг готовности звуковой системы
  useEffect(() => {
    if (soundNotifications.soundLoaded || soundNotifications.userHasInteracted) {
      setMetrics(prev => ({ ...prev, soundSystemReady: true }))
      addEvent('SOUND_SYSTEM_READY', {
        soundLoaded: soundNotifications.soundLoaded,
        userInteracted: soundNotifications.userHasInteracted,
        timeFromInit: Math.round(performance.now() - metrics.initStartTime)
      })
    }
  }, [soundNotifications.soundLoaded, soundNotifications.userHasInteracted, addEvent, metrics.initStartTime])

  // Мониторинг realtime соединения
  useEffect(() => {
    if (isGlobalSyncActive) {
      setMetrics(prev => ({ ...prev, realtimeConnected: true }))
      addEvent('REALTIME_CONNECTED', {
        timeFromInit: Math.round(performance.now() - metrics.initStartTime)
      })
    }
  }, [isGlobalSyncActive, addEvent, metrics.initStartTime])

  // Мониторинг первого уведомления
  useEffect(() => {
    const unsubscribe = registerSoundNotificationCallback((messageData) => {
      if (!hasLoggedFirstNotification.current) {
        hasLoggedFirstNotification.current = true
        const firstNotificationTime = performance.now()
        const totalTime = Math.round(firstNotificationTime - metrics.initStartTime)
        
        setMetrics(prev => ({
          ...prev,
          firstNotificationTime: firstNotificationTime,
          totalInitTime: totalTime
        }))
        
        addEvent('FIRST_NOTIFICATION_RECEIVED', {
          totalInitTime: totalTime,
          messageFrom: messageData.senderId?.slice(0, 8),
          chatId: messageData.chatId?.slice(0, 8),
          PERFORMANCE_ISSUE: totalTime > 10000 ? 'КРИТИЧНО - больше 10 секунд!' : 'OK'
        })

        // 🔥 КРИТИЧЕСКАЯ ДИАГНОСТИКА ПРОИЗВОДИТЕЛЬНОСТИ
        if (totalTime > 10000) {
          console.error('🔥🚨 КРИТИЧЕСКАЯ ПРОБЛЕМА ПРОИЗВОДИТЕЛЬНОСТИ УВЕДОМЛЕНИЙ!', {
            totalInitTime: totalTime,
            soundSystemReady: metrics.soundSystemReady,
            realtimeConnected: metrics.realtimeConnected,
            events: metrics.connectionEvents
          })
        } else {
          console.log('🔥✅ УВЕДОМЛЕНИЯ РАБОТАЮТ БЫСТРО!', {
            totalInitTime: totalTime,
            performance: 'ОТЛИЧНО'
          })
        }
      }
    })

    return unsubscribe
  }, [registerSoundNotificationCallback, addEvent, metrics])

  // Принудительный тест уведомлений через 3 секунды
  useEffect(() => {
    const testTimer = setTimeout(() => {
      if (!hasLoggedFirstNotification.current) {
        addEvent('FORCE_NOTIFICATION_TEST', {
          reason: 'Принудительный тест через 3 секунды',
          soundSystemReady: metrics.soundSystemReady,
          realtimeConnected: metrics.realtimeConnected
        })
        
        // Тестируем звук
        soundNotifications.testSound().then(success => {
          addEvent('SOUND_TEST_RESULT', {
            success,
            timeFromInit: Math.round(performance.now() - metrics.initStartTime)
          })
        })
      }
    }, 3000)

    return () => clearTimeout(testTimer)
  }, [soundNotifications, addEvent, metrics])

  // Debug панель (только в development)
  const renderDebugPanel = useCallback(() => {
    if (process.env.NODE_ENV !== 'development') return null

    const currentTime = Math.round(performance.now() - metrics.initStartTime)
    
    return (
      <div 
        style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '10px',
          borderRadius: '8px',
          fontSize: '12px',
          fontFamily: 'monospace',
          zIndex: 9999,
          maxWidth: '400px',
          maxHeight: '300px',
          overflow: 'auto'
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
          🔥 NOTIFICATION DEBUG PANEL
        </div>
        <div>⏱️ Время с инициализации: {currentTime}ms</div>
        <div>🔊 Звуки готовы: {metrics.soundSystemReady ? '✅' : '❌'}</div>
        <div>📡 Realtime подключен: {metrics.realtimeConnected ? '✅' : '❌'}</div>
        <div>🎯 Первое уведомление: {metrics.totalInitTime ? `${metrics.totalInitTime}ms` : 'Ожидание...'}</div>
        
        <div style={{ marginTop: '8px', fontSize: '10px' }}>
          <div style={{ fontWeight: 'bold' }}>События:</div>
          {metrics.connectionEvents.slice(-5).map((event, i) => (
            <div key={i} style={{ opacity: 0.8 }}>
              [{Math.round(event.timestamp - metrics.initStartTime)}ms] {event.event}
            </div>
          ))}
        </div>
      </div>
    )
  }, [metrics])

  return {
    metrics,
    addEvent,
    renderDebugPanel
  } as const
}
