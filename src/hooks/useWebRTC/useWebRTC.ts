'use client'

import { useEffect, useRef } from 'react'
import SimplePeer from 'simple-peer'
import useCallStore from '@/store/useCallStore'
import { createClient } from '@/utils/supabase/client'
import type { WebRTCHooks, PeerRefs } from './types'
import { processBufferedSignals, handleIncomingSignal } from './signalHandlers'
import { startKeepAlive, stopKeepAlive } from './keepAlive'
import { startConnectionMonitoring, stopConnectionMonitoring } from './connectionMonitor'
import { attemptReconnection, resetReconnectionCounter } from './reconnection'
import { initializePeer } from './peerInitialization'

const useWebRTC = (): WebRTCHooks => {
  const peerRef = useRef<SimplePeer.Instance | null>(null)
  const signalBufferRef = useRef<Array<{signal: any, from: string}>>([])
  const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const connectionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastKeepAliveRef = useRef<number>(0)
  const reconnectAttemptsRef = useRef<number>(0)
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

  // Функция для инициализации peer с привязкой к текущему контексту
  const initPeer = (isInitiator: boolean) => initializePeer(
    isInitiator,
    peerRefs,
    userId,
    targetUserId,
    isCallActive,
    processSignals
  )

  // Логируем состояние при каждом рендере
  console.log(`🎯 [User ${userId?.slice(0, 8)}] useWebRTC render with state:`, {
    isInCall,
    isCalling,
    isCallActive,
    isReceivingCall,
    hasPeer: !!peerRef.current,
    targetUserId: targetUserId?.slice(0, 8),
    callerId: callerId?.slice(0, 8)
  })

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

    const webrtcChannel = supabase
      .channel(`webrtc:${userId}`)
      .on('broadcast', { event: 'webrtc_signal' }, (payload) => {
        handleIncomingSignal(payload, peerRefs, userId, targetUserId)
      })
      .subscribe()

    return () => {
      console.log('Cleaning up WebRTC signal listener')
      // Очищаем буфер сигналов при смене targetUserId или размонтировании
      if (signalBufferRef.current.length > 0) {
        console.log(`🗑️ [User ${userId?.slice(0, 8)}] Clearing signal buffer (${signalBufferRef.current.length} signals)`)
        signalBufferRef.current = []
      }
      supabase.removeChannel(webrtcChannel)
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

      // Даем немного времени на обновление состояния
      setTimeout(() => {
        if (!peerRef.current) {
          console.log(`🎯 [User ${userId?.slice(0, 8)}] Delayed peer initialization as receiver`)
          initPeer(false) // Receiver is not initiator
        }
      }, 50)
    }
    // ОСНОВНОЙ Fallback: если в звонке, НЕ caller, и нет peer - это receiver!
    else if (isInCall && !isCalling && isCallActive && !peerRef.current && targetUserId) {
      console.log(`✅ [User ${userId?.slice(0, 8)}] Initializing peer as receiver (main fallback - call active)`)
      initPeer(false) // Receiver is not initiator
    }
    // Дополнительный fallback: просто в звонке и не caller
    else if (isInCall && !isCalling && !peerRef.current) {
      console.log(`✅ [User ${userId?.slice(0, 8)}] Initializing peer as receiver (simple fallback)`)
      initPeer(false) // Receiver is not initiator
    } else {
      console.log(`❌ [User ${userId?.slice(0, 8)}] Receiver peer initialization skipped`)
    }
  }, [isInCall, isCalling, isCallActive, isReceivingCall, callerId || '', targetUserId || ''])

  // Cleanup on unmount or call end
  useEffect(() => {
    return () => {
      console.log('🧹 useWebRTC: Starting cleanup on unmount')

      // Останавливаем все интервалы и таймауты
      stopKeepAlive(peerRefs, userId)
      stopConnectionMonitoring(peerRefs, userId)
      resetReconnectionCounter(peerRefs)

      if (peerRef.current && !peerRef.current.destroyed) {
        try {
          console.log('🧹 useWebRTC: Cleaning up peer connection')

          // Устанавливаем флаг, что соединение уничтожается
          const peerToDestroy = peerRef.current
          peerRef.current = null

          // Даем время на завершение текущих операций
          setTimeout(() => {
            if (peerToDestroy && !peerToDestroy.destroyed) {
              peerToDestroy.destroy()
            }
          }, 100)
        } catch (err) {
          console.log('🧹 useWebRTC: Peer cleanup error:', err)
        }
      }
    }
  }, [])

  // Принудительная очистка peer при изменении состояния звонка
  useEffect(() => {
    if (!isInCall && peerRef.current) {
      console.log(`🧹 [User ${userId?.slice(0, 8)}] Call ended, force cleanup peer`)

      // Очищаем буфер сигналов
      signalBufferRef.current = []

      // Останавливаем все процессы
      stopKeepAlive(peerRefs, userId)
      stopConnectionMonitoring(peerRefs, userId)
      resetReconnectionCounter(peerRefs)

      try {
        if (!peerRef.current.destroyed) {
          peerRef.current.destroy()
        }
      } catch (err) {
        console.log('🧹 Force cleanup error:', err)
      }
      peerRef.current = null
    }
  }, [isInCall])

  // Дополнительная проверка - принудительная инициализация peer для receiver
  useEffect(() => {
    const forceReceiverPeerInit = setTimeout(() => {
      if (isInCall && !isCalling && !peerRef.current && targetUserId) {
        console.log(`🔄 [User ${userId?.slice(0, 8)}] FORCE initializing peer as receiver after 2s delay`)
        initPeer(false)
      }
    }, 2000)

    return () => clearTimeout(forceReceiverPeerInit)
  }, [isInCall, isCalling, targetUserId || ''])

  return {
    peer: peerRef.current
  }
}

export default useWebRTC
