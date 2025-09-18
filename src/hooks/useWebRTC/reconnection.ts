import SimplePeer from 'simple-peer'
import type { PeerRefs } from './types'
import useCallStore from '@/store/useCallStore'

// Функция для попытки переподключения
export const attemptReconnection = (
  peerRefs: PeerRefs,
  userId: string | null,
  isInCall: boolean,
  targetUserId: string | null,
  initializePeer: (isInitiator: boolean) => Promise<void>
) => {
  const { reconnectTimeoutRef, reconnectAttemptsRef } = peerRefs

  if (reconnectTimeoutRef.current || !isInCall || !targetUserId) {
    return
  }

  const maxRetries = 3
  const currentAttempt = reconnectAttemptsRef.current + 1

  if (currentAttempt > maxRetries) {
    console.error(`🔄 [User ${userId?.slice(0, 8)}] Max reconnection attempts reached, ending call`)
    const { setError, endCall } = useCallStore.getState()
    
    // Полная очистка всех ресурсов перед завершением звонка
    cleanupAllPeerResources(peerRefs, userId)
    
    setError('Соединение потеряно и не может быть восстановлено')
    endCall()
    return
  }

  console.log(`🔄 [User ${userId?.slice(0, 8)}] Attempting reconnection ${currentAttempt}/${maxRetries}`)
  reconnectAttemptsRef.current = currentAttempt

  // Увеличиваем задержки для уменьшения нагрузки на сеть
  const delay = Math.min(1000 * Math.pow(1.5, currentAttempt - 1), 5000) // Экспоненциальная задержка
  
  reconnectTimeoutRef.current = setTimeout(() => {
    reconnectTimeoutRef.current = null

    if (isInCall && targetUserId) {
      console.log(`🔄 [User ${userId?.slice(0, 8)}] Reinitializing peer connection`)

      // Полная очистка старого соединения
      cleanupAllPeerResources(peerRefs, userId)

      // Создаем новое соединение
      const wasInitiator = useCallStore.getState().isCalling
      initializePeer(wasInitiator)
    }
  }, delay)
}

// Функция для сброса счетчика переподключений
export const resetReconnectionCounter = (peerRefs: PeerRefs) => {
  const { reconnectAttemptsRef, reconnectTimeoutRef } = peerRefs

  reconnectAttemptsRef.current = 0
  if (reconnectTimeoutRef.current) {
    clearTimeout(reconnectTimeoutRef.current)
    reconnectTimeoutRef.current = null
  }
}

// Функция для обработки ошибок peer соединения
export const handlePeerError = (
  err: Error,
  peerRefs: PeerRefs,
  userId: string | null,
  targetUserId: string | null,
  isInCall: boolean,
  initializePeer: (isInitiator: boolean) => Promise<void>
) => {
  console.error('Peer error:', err)

  // Игнорируем определенные типы ошибок, которые не требуют завершения звонка
  if (err instanceof Error) {
    if (err.message.includes('InvalidStateError') ||
        err.message.includes('wrong state') ||
        err.message.includes('already have a remote') ||
        err.message.includes('User-Initiated Abort, reason=Close called') ||
        err.message.includes('OperationError: User-Initiated Abort')) {
      console.log('Ignoring normal peer closure error:', err.message)
      return
    }
  }

  const { setError, endCall } = useCallStore.getState()
  setError('Ошибка соединения: ' + err.message)
  endCall()
}

// Функция для полной очистки всех peer-ресурсов
export const cleanupAllPeerResources = (peerRefs: PeerRefs, userId: string | null) => {
  console.log(`🧹 [User ${userId?.slice(0, 8)}] Starting comprehensive cleanup`)
  
  // Очищаем все таймауты и интервалы
  if (peerRefs.reconnectTimeoutRef.current) {
    clearTimeout(peerRefs.reconnectTimeoutRef.current)
    peerRefs.reconnectTimeoutRef.current = null
  }
  
  if (peerRefs.keepAliveIntervalRef.current) {
    clearInterval(peerRefs.keepAliveIntervalRef.current)
    peerRefs.keepAliveIntervalRef.current = null
  }
  
  if (peerRefs.connectionCheckIntervalRef.current) {
    clearInterval(peerRefs.connectionCheckIntervalRef.current)
    peerRefs.connectionCheckIntervalRef.current = null
  }
  
  // Очищаем буферы
  peerRefs.signalBufferRef.current = []
  peerRefs.lastKeepAliveRef.current = 0
  peerRefs.reconnectAttemptsRef.current = 0
  
  // Уничтожаем peer connection с дополнительными проверками
  if (peerRefs.peerRef.current) {
    try {
      if (!peerRefs.peerRef.current.destroyed) {
        // Удаляем все event listeners перед уничтожением
        peerRefs.peerRef.current.removeAllListeners()
        peerRefs.peerRef.current.destroy()
      }
    } catch (err) {
      console.warn(`🧹 [User ${userId?.slice(0, 8)}] Error during peer cleanup:`, err)
    } finally {
      peerRefs.peerRef.current = null
    }
  }
  
  console.log(`🧹 [User ${userId?.slice(0, 8)}] Comprehensive cleanup completed`)
}

// Функция для обработки закрытия peer соединения
export const handlePeerClose = (
  peerRefs: PeerRefs,
  userId: string | null,
  stopKeepAlive: (peerRefs: PeerRefs, userId: string | null) => void,
  stopConnectionMonitoring: (peerRefs: PeerRefs, userId: string | null) => void
) => {
  console.log('Peer connection closed')

  // Останавливаем keep-alive и мониторинг
  stopKeepAlive(peerRefs, userId)
  stopConnectionMonitoring(peerRefs, userId)

  // Не вызываем endCall() здесь, чтобы избежать рекурсии
  // endCall() будет вызван через обработчик события в CallInterface
}
