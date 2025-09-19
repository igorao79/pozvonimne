'use client'

/**
 * Глобальный менеджер звонков - обеспечивает 100% доставку входящих вызовов
 * Работает постоянно после авторизации, независимо от текущего интерфейса
 */

import { useEffect, useRef } from 'react'
import useCallStore from '@/store/useCallStore'
import { createClient } from '@/utils/supabase/client'
import { resilientChannelManager } from '@/utils/resilientChannelManager'
import { createReconnectionManager } from '@/utils/subscriptionHelpers'

interface UseGlobalCallManagerProps {
  isAuthenticated: boolean
  userId: string | null
}

export const useGlobalCallManager = ({ isAuthenticated, userId }: UseGlobalCallManagerProps) => {
  const {
    setIsReceivingCall,
    setIsCallActive,
    setError,
    endCall
  } = useCallStore()

  const supabase = createClient()
  const isInitializedRef = useRef(false)
  const reconnectionManagerRef = useRef<ReturnType<typeof createReconnectionManager> | null>(null)

  useEffect(() => {
    // Только если авторизован и есть userId
    if (!isAuthenticated || !userId) {
      console.log('🌐 GlobalCallManager: Not authenticated or no userId, skipping setup')
      return
    }

    // Предотвращаем повторную инициализацию
    if (isInitializedRef.current) {
      console.log('🌐 GlobalCallManager: Already initialized, skipping')
      return
    }

    console.log('🌐 GlobalCallManager: Setting up global call listener for user:', userId.slice(0, 8))
    isInitializedRef.current = true

    const setupGlobalCallListener = async () => {
      const channelId = `calls:${userId}`
      
      console.log('🌐 GlobalCallManager: Creating global resilient channel:', channelId)

      // Создаем менеджер переподключения если его нет
      if (!reconnectionManagerRef.current) {
        reconnectionManagerRef.current = createReconnectionManager(
          () => {
            console.log('🌐 GlobalCallManager: Reconnection callback triggered')
            // При переподключении перезапускаем настройку
            setupGlobalCallListener()
          },
          5, // больше попыток для критично важного канала
          3000 // 3 секунды между попытками
        )
      }

      try {
        // Создаем устойчивый канал для глобального прослушивания звонков
        await resilientChannelManager.createResilientChannel({
          channelName: channelId,
          setup: (channel) => {
            console.log('🌐 GlobalCallManager: Setting up channel listeners')
            
            return channel
              .on('broadcast', { event: 'incoming_call' }, (payload: any) => {
                console.log('🌐 GlobalCallManager: 📞 ========== INCOMING CALL EVENT ==========')
                console.log('🌐 GlobalCallManager: 📞 Raw payload:', payload)
                console.log('🌐 GlobalCallManager: 📞 Received for user:', userId.slice(0, 8))
                console.log('🌐 GlobalCallManager: 📞 Channel ID:', channelId)
                
                const { caller_id, caller_name, timestamp } = payload.payload || {}
                
                console.log('🌐 GlobalCallManager: 📞 Extracted data:', {
                  caller_id: caller_id?.slice(0, 8),
                  caller_name,
                  timestamp,
                  age: timestamp ? Date.now() - timestamp : 'no timestamp'
                })
                
                // Проверяем актуальность звонка (не старше 30 секунд)
                if (timestamp && Date.now() - timestamp > 30000) {
                  console.log('🌐 GlobalCallManager: 📞 Ignoring old call signal (age:', Date.now() - timestamp, 'ms)')
                  return
                }
                
                // Проверяем, не обрабатываем ли мы уже звонок
                const currentState = useCallStore.getState()
                console.log('🌐 GlobalCallManager: 📞 Current call state:', {
                  isReceivingCall: currentState.isReceivingCall,
                  isInCall: currentState.isInCall,
                  isCalling: currentState.isCalling,
                  callerId: currentState.callerId?.slice(0, 8),
                  targetUserId: currentState.targetUserId?.slice(0, 8)
                })
                
                if (currentState.isReceivingCall || currentState.isInCall) {
                  console.log('🌐 GlobalCallManager: 📞 Already handling a call, ignoring duplicate')
                  return
                }
                
                console.log('🌐 GlobalCallManager: 📞 ✅ Processing incoming call from:', caller_id?.slice(0, 8), 'name:', caller_name)
                console.log('🌐 GlobalCallManager: 📞 Setting incoming call state...')
                
                // Устанавливаем состояние входящего звонка
                setIsReceivingCall(true, caller_id, caller_name)
                
                console.log('🌐 GlobalCallManager: 📞 ✅ Incoming call state set successfully!')
                console.log('🌐 GlobalCallManager: 📞 =============================================')
              })
              .on('broadcast', { event: 'call_accepted' }, (payload: any) => {
                console.log('🌐 GlobalCallManager: 📞 Call was accepted:', payload)
                const { accepter_id } = payload.payload
                
                // Звонящий получает уведомление о принятии звонка
                const currentState = useCallStore.getState()
                if (currentState.isCalling && currentState.targetUserId === accepter_id) {
                  console.log('🌐 GlobalCallManager: 📞 Our call was accepted, activating...')
                  setIsReceivingCall(false)
                  setIsCallActive(true)
                }
              })
              .on('broadcast', { event: 'call_rejected' }, (payload: any) => {
                console.log('🌐 GlobalCallManager: 📞 Call was rejected:', payload)
                const { rejector_id } = payload.payload

                // Получаем актуальное состояние из store
                const currentState = useCallStore.getState()

                // Проверяем, что это отклонение нашего звонка
                if (currentState.isCalling && currentState.targetUserId === rejector_id) {
                  console.log('🌐 GlobalCallManager: 📞 Our call was rejected by:', rejector_id.slice(0, 8))
                  setError('CALL_REJECTED_VISUAL')
                  setTimeout(() => endCall(), 50)
                } else if (currentState.isReceivingCall && currentState.callerId === rejector_id) {
                  console.log('🌐 GlobalCallManager: 📞 Incoming call was rejected by:', rejector_id.slice(0, 8))
                  setError('CALL_REJECTED_VISUAL')
                  setTimeout(() => endCall(), 50)
                }
              })
              .on('broadcast', { event: 'call_ended' }, (payload: any) => {
                console.log('🌐 GlobalCallManager: 📞 Call ended by other user:', payload)
                endCall()
              })
              .on('broadcast', { event: 'call_cancelled' }, (payload: any) => {
                console.log('🌐 GlobalCallManager: 📞 Call cancelled by caller:', payload)
                const { caller_id } = payload.payload

                const currentState = useCallStore.getState()
                if (currentState.isReceivingCall && currentState.callerId === caller_id) {
                  console.log('🌐 GlobalCallManager: 📞 Our incoming call was cancelled by:', caller_id.slice(0, 8))
                  setError('Звонок отменен звонящим')
                  endCall()
                }
              })
          },
          onSubscribed: () => {
            console.log('✅ GlobalCallManager: Global call listener successfully connected for user:', userId.slice(0, 8))
            console.log('🎯 GlobalCallManager: Channel ID:', channelId)
            console.log('🎯 GlobalCallManager: Ready to receive incoming calls!')
            setError(null) // Очищаем ошибки при успешном подключении
            
            // Сбрасываем менеджер переподключения при успехе
            if (reconnectionManagerRef.current) {
              reconnectionManagerRef.current.reset()
            }
          },
          onError: (errorMessage) => {
            console.error('❌ GlobalCallManager: Global call listener error:', errorMessage)
            
            // Используем менеджер переподключения
            if (reconnectionManagerRef.current) {
              const attempts = reconnectionManagerRef.current.getAttempts()
              setError(`Переподключение к звонкам... (${attempts + 1}/5)`)
              
              const success = reconnectionManagerRef.current.reconnect()
              if (!success) {
                setError('Не удалось восстановить соединение для звонков')
              }
            }
          },
          maxReconnectAttempts: 5, // Уменьшили количество попыток
          reconnectDelay: 3000, // 3 секунды между попытками
          keepAliveInterval: 45000, // Keep-alive каждые 45 секунд
          healthCheckInterval: 90000 // Проверка здоровья каждые 1.5 минуты
        })
        
        console.log('✅ GlobalCallManager: Global call listener setup completed')
        
      } catch (error) {
        console.error('💥 GlobalCallManager: Failed to create global call channel:', error)
        setError('Не удалось установить соединение для звонков')
        
        // Пытаемся переподключиться через некоторое время
        setTimeout(() => {
          console.log('🔄 GlobalCallManager: Retrying global call setup...')
          setupGlobalCallListener()
        }, 5000)
      }
    }

    // Запускаем настройку
    setupGlobalCallListener()

    // Cleanup функция
    return () => {
      console.log('🌐 GlobalCallManager: Cleaning up global call listener for user:', userId.slice(0, 8))
      
      // Удаляем устойчивый канал
      const channelId = `calls:${userId}`
      resilientChannelManager.removeChannel(channelId)
      
      // Очищаем менеджер переподключения
      if (reconnectionManagerRef.current) {
        reconnectionManagerRef.current.cancel()
        reconnectionManagerRef.current = null
      }
      
      // Сбрасываем флаг инициализации для возможности повторной настройки
      isInitializedRef.current = false
    }
  }, [isAuthenticated, userId, setIsReceivingCall, setIsCallActive, setError, endCall, supabase])

  // Возвращаем статус для отладки
  return {
    isGlobalCallManagerActive: isAuthenticated && !!userId && isInitializedRef.current
  }
}

export default useGlobalCallManager
