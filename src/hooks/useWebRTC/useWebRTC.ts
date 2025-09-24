'use client'

import { useEffect, useRef } from 'react'
import SimplePeer from 'simple-peer'
import useCallStore from '@/store/useCallStore'
import { createClient } from '@/utils/supabase/client'
import { channelManager } from './channelManager'
import { resilientChannelManager } from '@/utils/resilientChannelManager'
import type { WebRTCHooks, PeerRefs } from './types'
import { processBufferedSignals, handleIncomingSignal } from './signalHandlers'
import { startKeepAlive, stopKeepAlive } from './keepAlive'
import { startConnectionMonitoring, stopConnectionMonitoring } from './connectionMonitor'
import { attemptReconnection, resetReconnectionCounter, cleanupAllPeerResources } from './reconnection'
import { initializePeer } from './peerInitialization'

const useWebRTC = (): WebRTCHooks => {
  const peerRef = useRef<SimplePeer.Instance | null>(null)
  const signalBufferRef = useRef<Array<{signal: any, from: string}>>([])
  const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const connectionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastKeepAliveRef = useRef<number>(0)
  const reconnectAttemptsRef = useRef<number>(0)
  
  // Добавляем дебаунсинг для предотвращения множественных инициализаций
  const peerInitTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isInitializingRef = useRef<boolean>(false) // Флаг для предотвращения race conditions
  const supabase = createClient()

  const peerRefs: PeerRefs = {
    peerRef,
    signalBufferRef,
    keepAliveIntervalRef,
    connectionCheckIntervalRef,
    reconnectTimeoutRef,
    lastKeepAliveRef,
    reconnectAttemptsRef
  }

  const {
    userId,
    targetUserId,
    isInCall,
    isCalling,
    isCallActive,
    isReceivingCall,
    callerId,
    setLocalStream,
    setRemoteStream,
    setPeer,
    setIsCallActive,
    setError,
    endCall,
    setTargetUserId
  } = useCallStore()

  // Функция для обработки буферизованных сигналов с привязкой к текущему контексту
  const processSignals = () => processBufferedSignals(peerRefs, userId)

  // Дебаунсированная функция для инициализации peer
  const debouncedInitPeer = (isInitiator: boolean, delay = 100) => {
    // Очищаем предыдущий таймаут для предотвращения множественных инициализаций
    if (peerInitTimeoutRef.current) {
      clearTimeout(peerInitTimeoutRef.current)
    }
    
    peerInitTimeoutRef.current = setTimeout(async () => {
      // Проверяем, что peer все еще нужен и не инициализируется уже
      if (peerRef.current || !isInCall || isInitializingRef.current) return
      
      isInitializingRef.current = true
      console.log(`🎯 [User ${userId?.slice(0, 8)}] Debounced peer initialization (${isInitiator ? 'caller' : 'receiver'})`)
      
      try {
        await initializePeer(isInitiator, peerRefs, userId, targetUserId, isCallActive, processSignals)
      } finally {
        isInitializingRef.current = false
        peerInitTimeoutRef.current = null
      }
    }, delay)
  }

  // Функция для инициализации peer с привязкой к текущему контексту
  const initPeer = (isInitiator: boolean) => initializePeer(
    isInitiator,
    peerRefs,
    userId,
    targetUserId,
    isCallActive,
    processSignals
  )

  // Логируем состояние только при изменениях ключевых параметров
  useEffect(() => {
    console.log(`🎯 [User ${userId?.slice(0, 8)}] useWebRTC state changed:`, {
      isInCall,
      isCalling,
      isCallActive,
      isReceivingCall,
      hasPeer: !!peerRef.current,
      targetUserId: targetUserId?.slice(0, 8),
      callerId: callerId?.slice(0, 8)
    })
  }, [isInCall, isCalling, isCallActive, isReceivingCall, targetUserId, callerId, userId])

  // Listen for WebRTC signals
  useEffect(() => {
    if (!userId) return

    console.log('Setting up WebRTC signal listener for user:', userId)

    // Обработчик для очистки при закрытии/обновлении страницы
    const handleBeforeUnload = () => {
      if (peerRef.current && !peerRef.current.destroyed) {
        try {
          peerRef.current.destroy()
        } catch (err) {
          console.warn('Error destroying peer on page unload:', err)
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    // Обработка изменения видимости страницы
    const handleVisibilityChange = () => {
      const isHidden = document.hidden
      console.log('Page visibility changed:', { hidden: isHidden, visibilityState: document.visibilityState })

      if (isHidden) {
        console.log('Page hidden during call - maintaining connection')
        // Можно добавить дополнительную логику если нужно
      } else {
        console.log('Page visible again')
        // Можно добавить дополнительную логику если нужно
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    const channelName = `webrtc:${userId}`
    
    resilientChannelManager.createResilientChannel({
      channelName,
      setup: (channel) => {
        return channel.on('broadcast', { event: 'webrtc_signal' }, (payload: any) => {
          handleIncomingSignal(payload, peerRefs, userId, targetUserId)
        })
      },
      onSubscribed: () => {
        console.log(`📺 [WebRTC] Successfully connected to resilient channel: ${channelName}`)
      },
      onError: (error) => {
        console.error(`📺 [WebRTC] Resilient channel error: ${error}`)
      },
      maxReconnectAttempts: 15, // Много попыток для WebRTC
      reconnectDelay: 2000,
      keepAliveInterval: 10000, // Агрессивный keep-alive каждые 10 секунд
      healthCheckInterval: 20000 // Частая проверка здоровья каждые 20 секунд
    }).catch(error => {
      console.error(`📺 [WebRTC] Failed to create resilient channel: ${error}`)
    })

    return () => {
      console.log('Cleaning up WebRTC signal listener')
      // Очищаем буфер сигналов при смене targetUserId или размонтировании
      if (signalBufferRef.current.length > 0) {
        console.log(`🗑️ [User ${userId?.slice(0, 8)}] Clearing signal buffer (${signalBufferRef.current.length} signals)`)
        signalBufferRef.current = []
      }
      
      // Используем resilientChannelManager для очистки
      resilientChannelManager.removeChannel(channelName)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [userId, targetUserId, supabase])

  // Initialize peer when starting a call (только после принятия звонка)
  useEffect(() => {
    console.log(`🔍 [User ${userId?.slice(0, 8)}] Caller peer initialization check:`, {
      isInCall,
      isCalling,
      isCallActive,
      hasPeer: !!peerRef.current,
      originalCondition: isInCall && isCalling && !peerRef.current,
      newCondition: isInCall && isCalling && isCallActive && !peerRef.current,
      targetUserId: targetUserId?.slice(0, 8)
    })

    // Caller должен ждать принятия звонка (isCallActive = true)
    if (isInCall && isCalling && isCallActive && !peerRef.current) {
      console.log(`✅ [User ${userId?.slice(0, 8)}] Initializing peer as caller (call accepted)`)
      initPeer(true) // Caller is initiator
    } else if (isInCall && isCalling && !isCallActive) {
      console.log(`⏳ [User ${userId?.slice(0, 8)}] Caller waiting for call acceptance...`)
    }
  }, [isInCall, isCalling, isCallActive])

  // Initialize peer when receiving call
  useEffect(() => {
    console.log(`🔍 [User ${userId?.slice(0, 8)}] Receiver peer initialization check:`, {
      isInCall,
      isCallActive,
      isCalling,
      isReceivingCall,
      hasPeer: !!peerRef.current,
      callerId: callerId?.slice(0, 8),
      targetUserId: targetUserId?.slice(0, 8),
      conditions: {
        original: isInCall && isCallActive && !isCalling && !peerRef.current,
        simplified: isInCall && !isCalling && !peerRef.current,
        new: isReceivingCall && !peerRef.current
      }
    })

    // Новая стратегия: инициализируем peer сразу при получении входящего звонка
    if (isReceivingCall && !peerRef.current && callerId) {
      console.log(`✅ [User ${userId?.slice(0, 8)}] Initializing peer as receiver (on incoming call)`)
      console.log(`🎯 [User ${userId?.slice(0, 8)}] Setting targetUserId to ${callerId.slice(0, 8)} before peer init`)

      // Устанавливаем targetUserId как callerId СНАЧАЛА
      setTargetUserId(callerId)

      // Используем дебаунсированную инициализацию
      console.log(`🎯 [User ${userId?.slice(0, 8)}] Scheduling debounced peer initialization as receiver`)
      debouncedInitPeer(false) // Receiver is not initiator с дебаунсингом
    }
    // ОСНОВНОЙ Fallback: если в звонке, НЕ caller, и нет peer - это receiver!
    else if (isInCall && !isCalling && isCallActive && !peerRef.current && targetUserId) {
      console.log(`✅ [User ${userId?.slice(0, 8)}] Initializing peer as receiver (main fallback - call active)`)
      debouncedInitPeer(false) // Receiver is not initiator с дебаунсингом
    }
    // Дополнительный fallback: просто в звонке и не caller
    else if (isInCall && !isCalling && !peerRef.current) {
      console.log(`✅ [User ${userId?.slice(0, 8)}] Initializing peer as receiver (simple fallback)`)
      debouncedInitPeer(false) // Receiver is not initiator с дебаунсингом
    } else {
      console.log(`❌ [User ${userId?.slice(0, 8)}] Receiver peer initialization skipped`)
    }
  }, [isInCall, isCalling, isCallActive, isReceivingCall, callerId || '', targetUserId || ''])

  // Cleanup on unmount or call end
  useEffect(() => {
    return () => {
      console.log('🧹 useWebRTC: Starting cleanup on unmount')

      // Полная очистка всех ресурсов
      cleanupAllPeerResources(peerRefs, userId)
      
      // Очищаем дебаунс таймаут
      if (peerInitTimeoutRef.current) {
        clearTimeout(peerInitTimeoutRef.current)
        peerInitTimeoutRef.current = null
      }
    }
  }, [])

  // Принудительная очистка peer при изменении состояния звонка
  useEffect(() => {
    if (!isInCall && peerRef.current) {
      console.log(`🧹 [User ${userId?.slice(0, 8)}] Call ended, force cleanup peer`)

      // Полная очистка всех ресурсов
      cleanupAllPeerResources(peerRefs, userId)
      
      // Очищаем все каналы пользователя
      resilientChannelManager.removeChannel(`webrtc:${userId || ''}`)
      
      // Очищаем дебаунс таймаут
      if (peerInitTimeoutRef.current) {
        clearTimeout(peerInitTimeoutRef.current)
        peerInitTimeoutRef.current = null
      }
      
      // Сбрасываем флаг инициализации
      isInitializingRef.current = false
    }
  }, [isInCall])

  // Убираем принудительную инициализацию - дебаунсированная должна покрывать все случаи

  return {
    peer: peerRef.current
  }
}

export default useWebRTC
