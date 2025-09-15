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
    setError('Соединение потеряно и не может быть восстановлено')
    endCall()
    return
  }

  console.log(`🔄 [User ${userId?.slice(0, 8)}] Attempting reconnection ${currentAttempt}/${maxRetries}`)
  reconnectAttemptsRef.current = currentAttempt

  // Быстрая задержка перед переподключением для ускорения повторных звонков
  reconnectTimeoutRef.current = setTimeout(() => {
    reconnectTimeoutRef.current = null

    if (isInCall && targetUserId) {
      console.log(`🔄 [User ${userId?.slice(0, 8)}] Reinitializing peer connection`)

      // Уничтожаем старое соединение
      if (peerRefs.peerRef.current && !peerRefs.peerRef.current.destroyed) {
        try {
          peerRefs.peerRef.current.destroy()
        } catch (err) {
          console.warn('Error destroying old peer during reconnection:', err)
        }
        peerRefs.peerRef.current = null
      }

      // Создаем новое соединение
      const wasInitiator = useCallStore.getState().isCalling
      initializePeer(wasInitiator)
    }
  }, 100 * currentAttempt) // Минимум для моментальной работы (0.1, 0.2, 0.3 сек)
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
