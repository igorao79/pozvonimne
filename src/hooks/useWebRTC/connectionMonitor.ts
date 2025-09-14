import type { PeerRefs } from './types'
import { checkKeepAliveActivity } from './keepAlive'

// Функция для мониторинга состояния соединения
export const startConnectionMonitoring = (
  peerRefs: PeerRefs,
  userId: string | null,
  attemptReconnection: () => void
) => {
  const { connectionCheckIntervalRef, peerRef, lastKeepAliveRef } = peerRefs

  if (connectionCheckIntervalRef.current) {
    clearInterval(connectionCheckIntervalRef.current)
  }

  console.log(`📊 [User ${userId?.slice(0, 8)}] Starting connection monitoring`)

  connectionCheckIntervalRef.current = setInterval(() => {
    if (peerRef.current && !peerRef.current.destroyed) {
      const pc = (peerRef.current as any)._pc

      if (pc) {
        const connectionState = pc.connectionState
        const iceConnectionState = pc.iceConnectionState
        const iceGatheringState = pc.iceGatheringState

        console.log(`📊 [User ${userId?.slice(0, 8)}] Connection status:`, {
          connectionState,
          iceConnectionState,
          iceGatheringState,
          connected: peerRef.current.connected,
          lastKeepAlive: lastKeepAliveRef.current ? new Date(lastKeepAliveRef.current).toLocaleTimeString() : 'never'
        })

        // Проверяем критические состояния
        if (connectionState === 'failed' || iceConnectionState === 'failed') {
          console.error(`📊 [User ${userId?.slice(0, 8)}] Connection failed, attempting reconnection`)
          attemptReconnection()
        } else if (connectionState === 'disconnected' || iceConnectionState === 'disconnected') {
          console.warn(`📊 [User ${userId?.slice(0, 8)}] Connection disconnected, monitoring...`)
          // Ждем 10 секунд на восстановление, если не восстановилось - переподключаемся
          setTimeout(() => {
            if (peerRef.current && !peerRef.current.destroyed) {
              const currentState = (peerRef.current as any)._pc?.connectionState
              if (currentState === 'disconnected' || currentState === 'failed') {
                console.error(`📊 [User ${userId?.slice(0, 8)}] Connection still disconnected after 10s, attempting reconnection`)
                attemptReconnection()
              }
            }
          }, 10000)
        }

        // Проверяем keep-alive активность
        if (!checkKeepAliveActivity(peerRefs, userId)) {
          const currentState = pc.connectionState
          if (currentState !== 'connected') {
            attemptReconnection()
          }
        }
      }
    }
  }, 15000) // Проверяем каждые 15 секунд
}

// Функция для остановки мониторинга
export const stopConnectionMonitoring = (
  peerRefs: PeerRefs,
  userId: string | null
) => {
  const { connectionCheckIntervalRef } = peerRefs

  if (connectionCheckIntervalRef.current) {
    clearInterval(connectionCheckIntervalRef.current)
    connectionCheckIntervalRef.current = null
    console.log(`📊 [User ${userId?.slice(0, 8)}] Connection monitoring stopped`)
  }
}
