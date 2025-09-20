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
          15, // больше попыток для критично важного канала звонков
          1000 // 1 секунда между попытками (быстрее)
        )
      }

      try {
        // Создаем устойчивый канал для глобального прослушивания звонков
        await resilientChannelManager.createResilientChannel({
          channelName: channelId,
          setup: (channel) => {
            console.log('🌐 GlobalCallManager: Setting up channel listeners')
            
            return channel
              .on('broadcast', { event: 'incoming_call' }, async (payload: any) => {
                console.log('🌐 GlobalCallManager: 📞 ========== INCOMING CALL EVENT ==========')
                console.log('🌐 GlobalCallManager: 📞 Timestamp:', new Date().toISOString())
                console.log('🌐 GlobalCallManager: 📞 Raw payload:', payload)
                console.log('🌐 GlobalCallManager: 📞 Received for user:', userId.slice(0, 8))
                console.log('🌐 GlobalCallManager: 📞 Channel ID:', channelId)
                console.log('🌐 GlobalCallManager: 📞 Event data:', payload.event)
                console.log('🌐 GlobalCallManager: 📞 Event type:', typeof payload.event)
                
                const { caller_id, caller_name, timestamp, signal_id, expect_ack } = payload.payload || {}
                
                console.log('🌐 GlobalCallManager: 📞 Extracted data:', {
                  caller_id: caller_id?.slice(0, 8),
                  caller_name,
                  timestamp,
                  signal_id,
                  expect_ack,
                  age: timestamp ? Date.now() - timestamp : 'no timestamp'
                })
                
                // Отправляем acknowledgment если требуется
                if (expect_ack && signal_id && caller_id) {
                  console.log('🌐 GlobalCallManager: 📞 Sending acknowledgment for signal:', signal_id)
                  try {
                    const ackChannelId = `ack:${caller_id}`
                    const ackChannel = supabase.channel(ackChannelId)
                    
                    // Быстрая подписка
                    await new Promise<void>((resolve) => {
                      const timeout = setTimeout(() => resolve(), 500)
                      ackChannel.subscribe((status: any) => {
                        clearTimeout(timeout)
                        console.log('🌐 GlobalCallManager: 📞 ACK channel status:', status)
                        resolve()
                      })
                    })
                    
                    // Отправляем acknowledgment
                    await ackChannel.send({
                      type: 'broadcast',
                      event: 'call_signal_ack',
                      payload: {
                        signal_id,
                        acknowledged_by: userId,
                        timestamp: Date.now()
                      }
                    })
                    
                    console.log('🌐 GlobalCallManager: 📞 ✅ Acknowledgment sent for signal:', signal_id)
                    
                    // Очищаем канал
                    setTimeout(() => {
                      supabase.removeChannel(ackChannel)
                    }, 1000)
                  } catch (error) {
                    console.error('🌐 GlobalCallManager: 📞 ❌ Failed to send acknowledgment:', error)
                  }
                }
                
                // Проверяем актуальность звонка (не старше 60 секунд, увеличили лимит)
                if (timestamp && Date.now() - timestamp > 60000) {
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
                
                try {
                  // Устанавливаем состояние входящего звонка
                  setIsReceivingCall(true, caller_id, caller_name)
                  
                  console.log('🌐 GlobalCallManager: 📞 ✅ Incoming call state set successfully!')
                  
                  // Проверим, что состояние действительно установилось
                  setTimeout(() => {
                    const newState = useCallStore.getState()
                    console.log('🌐 GlobalCallManager: 📞 State check after setIsReceivingCall:', {
                      isReceivingCall: newState.isReceivingCall,
                      callerId: newState.callerId?.slice(0, 8),
                      callerName: newState.callerName
                    })
                  }, 100)
                  
                } catch (error) {
                  console.error('🌐 GlobalCallManager: 📞 ❌ Error setting incoming call state:', error)
                }
                
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
                console.log('🌐 GlobalCallManager: 📞 ========== CALL CANCELLED EVENT ==========')
                console.log('🌐 GlobalCallManager: 📞 Timestamp:', new Date().toISOString())
                console.log('🌐 GlobalCallManager: 📞 Call cancelled by caller:', payload)
                console.log('🌐 GlobalCallManager: 📞 Raw payload:', payload)

                const { caller_id } = payload.payload || {}

                console.log('🌐 GlobalCallManager: 📞 Caller ID from payload:', caller_id?.slice(0, 8))

                const currentState = useCallStore.getState()
                console.log('🌐 GlobalCallManager: 📞 Current state:', {
                  isReceivingCall: currentState.isReceivingCall,
                  callerId: currentState.callerId?.slice(0, 8),
                  isInCall: currentState.isInCall
                })

                if (currentState.isReceivingCall && currentState.callerId === caller_id) {
                  console.log('🌐 GlobalCallManager: 📞 ✅ Our incoming call was cancelled by:', caller_id.slice(0, 8))
                  setError('Звонок отменен звонящим')
                  endCall()
                } else {
                  console.log('🌐 GlobalCallManager: 📞 ❌ Call cancelled event ignored - not our call or not receiving')
                }
                console.log('🌐 GlobalCallManager: 📞 =============================================')
              })
          },
          onSubscribed: () => {
            const currentTime = new Date().toISOString()
            console.log('✅ GlobalCallManager: Global call listener successfully connected for user:', userId.slice(0, 8))
            console.log('🎯 GlobalCallManager: Channel ID:', channelId)
            console.log('🎯 GlobalCallManager: Connection time:', currentTime)
            console.log('🎯 GlobalCallManager: Ready to receive incoming calls!')
            console.log('🎯 GlobalCallManager: Keep-alive interval: 10s, Health check: 20s')
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
          maxReconnectAttempts: 15, // Больше попыток для критично важного канала звонков
          reconnectDelay: 1000, // 1 секунда между попытками (быстрее)
          keepAliveInterval: 10000, // Keep-alive каждые 10 секунд (агрессивно)
          healthCheckInterval: 20000 // Проверка здоровья каждые 20 секунд (агрессивно)
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
