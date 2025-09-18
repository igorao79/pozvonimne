import type { KeepAliveMessage, PeerRefs } from './types'
import useCallStore from '@/store/useCallStore'

// Функция для отправки keep-alive сигналов
export const startKeepAlive = (
  peerRefs: PeerRefs,
  userId: string | null,
  targetUserId: string | null,
  isCallActive: boolean
) => {
  const { keepAliveIntervalRef, peerRef, lastKeepAliveRef } = peerRefs

  if (keepAliveIntervalRef.current) {
    clearInterval(keepAliveIntervalRef.current)
  }

  console.log(`💓 [User ${userId?.slice(0, 8)}] Starting keep-alive mechanism`)

  keepAliveIntervalRef.current = setInterval(() => {
    if (peerRef.current && !peerRef.current.destroyed && targetUserId) {
      try {
        const currentTime = Date.now()

        // Отправляем keep-alive пакет через data channel
        if (peerRef.current.connected) {
          const message: KeepAliveMessage = {
            type: 'keep_alive',
            timestamp: currentTime,
            from: userId!
          }

          peerRef.current.send(JSON.stringify(message))

          lastKeepAliveRef.current = currentTime
          console.log(`💓 [User ${userId?.slice(0, 8)}] Keep-alive sent at ${new Date(currentTime).toLocaleTimeString()}`)
        } else {
          console.warn(`💓 [User ${userId?.slice(0, 8)}] Peer not connected, skipping keep-alive`)
        }
      } catch (err) {
        console.warn(`💓 [User ${userId?.slice(0, 8)}] Keep-alive error:`, err)
      }
    }
  }, 20000) // Уменьшаем интервал для раннего обнаружения проблем
}

// Функция для остановки keep-alive
export const stopKeepAlive = (peerRefs: PeerRefs, userId: string | null) => {
  const { keepAliveIntervalRef } = peerRefs

  if (keepAliveIntervalRef.current) {
    clearInterval(keepAliveIntervalRef.current)
    keepAliveIntervalRef.current = null
    console.log(`💓 [User ${userId?.slice(0, 8)}] Keep-alive stopped`)
  }
}

// Функция для обработки keep-alive сообщений
export const handleKeepAliveMessage = (
  data: string,
  peerRefs: PeerRefs,
  userId: string | null
) => {
  try {
    const message: KeepAliveMessage = JSON.parse(data)

    if (message.type === 'keep_alive') {
      console.log(`💓 [User ${userId?.slice(0, 8)}] Keep-alive received from ${message.from?.slice(0, 8)} at ${new Date(message.timestamp).toLocaleTimeString()}`)

      // Отправляем ответ на keep-alive
      if (peerRefs.peerRef.current && !peerRefs.peerRef.current.destroyed && peerRefs.peerRef.current.connected) {
        const responseMessage: KeepAliveMessage = {
          type: 'keep_alive_response',
          timestamp: Date.now(),
          originalTimestamp: message.timestamp,
          from: userId!
        }

        peerRefs.peerRef.current.send(JSON.stringify(responseMessage))
      }
    } else if (message.type === 'keep_alive_response') {
      console.log(`💓 [User ${userId?.slice(0, 8)}] Keep-alive response received from ${message.from?.slice(0, 8)}`)
      peerRefs.lastKeepAliveRef.current = Date.now()
    }
  } catch (err) {
    console.warn('Error parsing data channel message:', err)
  }
}

// Функция для проверки keep-alive активности
export const checkKeepAliveActivity = (
  peerRefs: PeerRefs,
  userId: string | null
): boolean => {
  const { lastKeepAliveRef } = peerRefs

  // Проверяем последний keep-alive (не должен быть старше 2 минут)
  if (lastKeepAliveRef.current && Date.now() - lastKeepAliveRef.current > 120000) {
    console.warn(`📊 [User ${userId?.slice(0, 8)}] No keep-alive response for 2+ minutes`)
    return false
  }

  return true
}
