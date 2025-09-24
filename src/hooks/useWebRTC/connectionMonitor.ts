import type { PeerRefs } from './types'
import { checkKeepAliveActivity } from './keepAlive'
import useCallStore from '@/store/useCallStore'

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
          console.error(`📊 [User ${userId?.slice(0, 8)}] Connection failed - ending call`)
          // Вместо переподключения завершаем звонок
          const { endCall, setError } = useCallStore.getState()
          setError('Соединение потеряно')
          endCall()
        } else if (connectionState === 'disconnected' || iceConnectionState === 'disconnected') {
          console.warn(`📊 [User ${userId?.slice(0, 8)}] Connection disconnected, monitoring...`)
          // Уменьшаем время ожидания для более быстрого реагирования
          setTimeout(() => {
            if (peerRef.current && !peerRef.current.destroyed) {
              const currentState = (peerRef.current as any)._pc?.connectionState
              const currentIceState = (peerRef.current as any)._pc?.iceConnectionState

              if (currentState === 'disconnected' || currentState === 'failed' ||
                  currentIceState === 'disconnected' || currentIceState === 'failed') {
                console.error(`📊 [User ${userId?.slice(0, 8)}] Connection still problematic after 5s (${currentState}/${currentIceState}) - ending call`)
                // Вместо переподключения завершаем звонок
                const { endCall, setError } = useCallStore.getState()
                setError('Соединение потеряно')
                endCall()
              }
            }
          }, 5000) // Уменьшили с 10 до 5 секунд
        } else if (connectionState === 'new' || iceConnectionState === 'new') {
          // Таймаут для ICE gathering - если слишком долго в состоянии "new"
          setTimeout(() => {
            if (peerRef.current && !peerRef.current.destroyed) {
              const currentState = (peerRef.current as any)._pc?.connectionState
              const currentIceState = (peerRef.current as any)._pc?.iceConnectionState
              
              if (currentState === 'new' || currentIceState === 'new') {
                console.error(`📊 [User ${userId?.slice(0, 8)}] ICE gathering timeout (${currentState}/${currentIceState}) - ending call`)
                // Вместо переподключения завершаем звонок
                const { endCall, setError } = useCallStore.getState()
                setError('Не удалось установить соединение')
                endCall()
              }
            }
          }, 15000) // 15 секунд таймаут для ICE gathering
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
  }, 10000) // Проверяем каждые 10 секунд для более быстрого реагирования
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
