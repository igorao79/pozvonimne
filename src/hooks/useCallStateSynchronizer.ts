'use client'

/**
 * Хук для синхронизации состояний звонков между участниками
 * Обеспечивает консистентность интерфейса и предотвращает рассинхронизацию
 */

import { useEffect, useRef } from 'react'
import useCallStore from '@/store/useCallStore'
import { createClient } from '@/utils/supabase/client'
import { resilientChannelManager } from '@/utils/resilientChannelManager'

interface UseCallStateSynchronizerProps {
  isAuthenticated: boolean
  userId: string | null
}

interface CallStateSync {
  type: 'call_state_sync'
  caller_id: string
  target_id: string
  state: {
    isCallActive: boolean
    isCalling: boolean
    isReceivingCall: boolean
    timestamp: number
  }
  sync_id: string
}

export const useCallStateSynchronizer = ({ isAuthenticated, userId }: UseCallStateSynchronizerProps) => {
  const {
    isCallActive,
    isCalling,
    isReceivingCall,
    callerId,
    targetUserId
  } = useCallStore()
  
  const supabase = createClient()
  const lastSyncRef = useRef<number>(0)
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Отправка синхронизации состояния
  const syncCallState = async (targetUser: string, immediate: boolean = false) => {
    if (!userId || !targetUser) return

    const now = Date.now()
    
    // Дебаунсинг для предотвращения спама
    if (!immediate && now - lastSyncRef.current < 1000) {
      return
    }

    lastSyncRef.current = now
    
    const syncData: CallStateSync = {
      type: 'call_state_sync',
      caller_id: userId,
      target_id: targetUser,
      state: {
        isCallActive,
        isCalling,
        isReceivingCall,
        timestamp: now
      },
      sync_id: `sync_${now}_${Math.random().toString(36).substr(2, 9)}`
    }

    console.log('🔄 CallStateSynchronizer: Syncing call state to', targetUser.slice(0, 8), syncData)

    try {
      const targetChannelId = `calls:${targetUser}`
      const existingChannel = resilientChannelManager.getChannel(targetChannelId)
      
      if (existingChannel) {
        console.log('🔄 CallStateSynchronizer: Using existing channel for sync')
        await existingChannel.send({
          type: 'broadcast',
          event: 'call_state_sync',
          payload: syncData
        })
      } else {
        console.log('🔄 CallStateSynchronizer: Creating temporary channel for sync')
        const channel = supabase.channel(targetChannelId)
        
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => resolve(), 1000)
          channel.subscribe((status: any) => {
            clearTimeout(timeout)
            resolve()
          })
        })
        
        await channel.send({
          type: 'broadcast',
          event: 'call_state_sync',
          payload: syncData
        })
        
        // Очищаем временный канал
        setTimeout(() => {
          supabase.removeChannel(channel)
        }, 2000)
      }
      
      console.log('✅ CallStateSynchronizer: State synced successfully')
    } catch (error) {
      console.error('❌ CallStateSynchronizer: Failed to sync state:', error)
    }
  }

  // Обработка получения синхронизации
  const handleStateSync = (syncData: CallStateSync) => {
    const { caller_id, target_id, state, sync_id } = syncData
    const timestamp = state.timestamp
    
    console.log('🔄 CallStateSynchronizer: Received state sync', {
      from: caller_id.slice(0, 8),
      to: target_id.slice(0, 8),
      state,
      sync_id,
      age: Date.now() - timestamp
    })

    // Игнорируем устаревшие синхронизации (старше 10 секунд)
    if (Date.now() - timestamp > 10000) {
      console.log('🔄 CallStateSynchronizer: Ignoring old sync data')
      return
    }

    // Игнорируем собственные синхронизации
    if (caller_id === userId) {
      console.log('🔄 CallStateSynchronizer: Ignoring own sync')
      return
    }

    const currentState = useCallStore.getState()
    
    // Проверяем, нужна ли корректировка состояния
    const needsCorrection = (
      // Если у нас нет активного звонка, но другая сторона считает что есть
      (!currentState.isInCall && state.isCallActive) ||
      // Если у нас звонок активен, но другая сторона не в звонке
      (currentState.isCallActive && !state.isCallActive && !state.isCalling && !state.isReceivingCall) ||
      // Если состояния звонка не совпадают
      (currentState.isCalling !== state.isCalling && currentState.targetUserId === caller_id)
    )

    if (needsCorrection) {
      console.log('🔄 CallStateSynchronizer: State correction needed, synchronizing...')
      
      // Корректируем состояние на основе полученных данных
      if (state.isCallActive && !currentState.isInCall) {
        console.log('🔄 CallStateSynchronizer: Activating call based on sync')
        useCallStore.getState().setIsCallActive(true)
        useCallStore.getState().setIsInCall(true)
      } else if (!state.isCallActive && !state.isCalling && !state.isReceivingCall && currentState.isInCall) {
        console.log('🔄 CallStateSynchronizer: Ending call based on sync')
        useCallStore.getState().endCall()
      }
    }
  }

  // Настройка подписки на синхронизацию состояний
  useEffect(() => {
    if (!isAuthenticated || !userId) return

    console.log('🔄 CallStateSynchronizer: Setting up state synchronization for user:', userId.slice(0, 8))

    const channelId = `calls:${userId}`
    
    // Добавляем обработчик синхронизации к существующему каналу
    const existingChannel = resilientChannelManager.getChannel(channelId)
    
    if (existingChannel) {
      console.log('🔄 CallStateSynchronizer: Adding sync handler to existing channel')
      
      const handleSync = (payload: any) => {
        if (payload.payload?.type === 'call_state_sync') {
          handleStateSync(payload.payload)
        }
      }
      
      existingChannel.on('broadcast', { event: 'call_state_sync' }, handleSync)
      
      return () => {
        // Убираем обработчик при размонтировании
        try {
          existingChannel.off('broadcast', { event: 'call_state_sync' }, handleSync)
        } catch (error) {
          console.warn('🔄 CallStateSynchronizer: Error removing sync handler:', error)
        }
      }
    }
  }, [isAuthenticated, userId])

  // Автоматическая синхронизация при изменении состояния звонка
  useEffect(() => {
    if (!userId || (!isCallActive && !isCalling && !isReceivingCall)) return

    // Определяем с кем синхронизироваться
    const targetUser = callerId || targetUserId
    if (!targetUser || targetUser === userId) return

    console.log('🔄 CallStateSynchronizer: Call state changed, scheduling sync to', targetUser.slice(0, 8))

    // Дебаунсинг - отправляем синхронизацию через 500мс
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
    }

    syncTimeoutRef.current = setTimeout(() => {
      syncCallState(targetUser)
    }, 500)

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
    }
  }, [isCallActive, isCalling, isReceivingCall, callerId, targetUserId, userId])

  return {
    syncCallState,
    isStateSyncActive: isAuthenticated && !!userId
  }
}

export default useCallStateSynchronizer
