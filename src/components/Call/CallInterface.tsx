'use client'

import { useEffect, useState, useRef } from 'react'
import useCallStore from '@/store/useCallStore'
import { createClient } from '@/utils/supabase/client'
import useWebRTC from '@/hooks/useWebRTC'
import { CallControls, IncomingCall, CallScreen, DialPad } from '.'
import { ChatApp } from '../Chat'
import { sendCallEndedMessage, sendMissedCallMessage } from '@/utils/callSystemMessages'
import { createSubscriptionHandler, createReconnectionManager, safeRemoveChannel } from '@/utils/subscriptionHelpers'
import { resilientChannelManager } from '@/utils/resilientChannelManager'

interface CallInterfaceProps {
  resetChatTrigger?: number
}

const CallInterface = ({ resetChatTrigger }: CallInterfaceProps = {}) => {
  const {
    userId,
    isInCall,
    isCalling,
    isReceivingCall,
    isCallActive,
    remoteStream,
    setIsReceivingCall,
    setIsCallActive,
    setError,
    endCall,
    targetUserId,
    callDurationSeconds,
    callerId,
    callerName
  } = useCallStore()

  // Initialize WebRTC
  useWebRTC()

  const supabase = createClient()

  // Состояние для отслеживания переподключения
  const [isReconnecting, setIsReconnecting] = useState(false)
  const reconnectionManagerRef = useRef<ReturnType<typeof createReconnectionManager> | null>(null)

  // УБРАНО: Больше не открываем чат автоматически после звонка
  
  // Состояние для автоматического восстановления чата из localStorage
  const [savedChatId, setSavedChatId] = useState<string | null>(null)
  
  // Состояние для отслеживания предыдущих состояний звонка
  const prevCallStateRef = useRef({
    isInCall: false,
    isCallActive: false,
    isCalling: false,
    isReceivingCall: false,
    targetUserId: '',
    callerId: '',
    callerName: ''
  })

  // УБРАНО: Функция поиска чата больше не нужна

  // Восстановление сохраненного чата из localStorage при загрузке
  // УБРАНО: Автоматическое восстановление чата при входе в аккаунт
  // Теперь чат восстанавливается только после звонка или при явном выборе

  // Отслеживаем состояния звонка для системных сообщений
  useEffect(() => {
    const prev = prevCallStateRef.current
    const current = {
      isInCall,
      isCallActive,
      isCalling,
      isReceivingCall,
      targetUserId,
      callerId: callerId || '',
      callerName: callerName || ''
    }

    // Определяем какой пользователь участвует в звонке
    const otherUserId = targetUserId || current.callerId
    const otherUserName = callerName || 'Пользователь'

    console.log('📞 Call state analysis:', {
      prev,
      current,
      otherUserId,
      otherUserName,
      callDurationSeconds
    })

    // Обработка пропущенного звонка
    if (prev.isCalling && !current.isCalling && !current.isCallActive && !current.isInCall && prev.targetUserId) {
      console.log('📞 Missed call detected - caller hung up before answer')
      setTimeout(() => handleMissedCall(prev.targetUserId, 'Вы'), 1000)
    }

    // Обработка отклонения входящего звонка (звонящий сбросил)
    if (prev.isReceivingCall && !current.isReceivingCall && !current.isCallActive && !current.isInCall && prev.callerId) {
      console.log('📞 Incoming call cancelled - caller hung up before answer')
      setTimeout(() => handleMissedCall(prev.callerId, prev.callerName || 'Пользователь'), 1000)
    }

    // Обработка завершения активного звонка
    if (prev.isCallActive && !current.isCallActive && !current.isInCall && callDurationSeconds > 0) {
      console.log('📞 Active call ended with duration:', callDurationSeconds)
      if (otherUserId) {
        setTimeout(() => handleCallEnded(otherUserId, callDurationSeconds), 1000)
      }
    }

    // Обновляем предыдущее состояние
    prevCallStateRef.current = current
  }, [isInCall, isCallActive, isCalling, isReceivingCall, targetUserId, callerId, callerName, callDurationSeconds])

  // ВРЕМЕННО ОТКЛЮЧИЛИ системные сообщения - они вызывают 400 ошибки
  const handleMissedCall = async (userId: string, userName: string) => {
    console.log('🚨 СИСТЕМНЫЕ СООБЩЕНИЯ ОТКЛЮЧЕНЫ - Пропускаем пропущенный звонок')
    // Системные сообщения временно отключены из-за ошибок с несуществующими столбцами
  }

  const handleCallEnded = async (userId: string, duration: number) => {
    console.log('🚨 СИСТЕМНЫЕ СООБЩЕНИЯ ОТКЛЮЧЕНЫ - Пропускаем завершение звонка')
    // Системные сообщения временно отключены из-за ошибок с несуществующими столбцами
  }

  // УБРАНА НЕПРАВИЛЬНАЯ ЛОГИКА: Не переходим автоматически к чату после звонка!
  // Как в Telegram/Discord - пользователь остается там, где был до звонка

  useEffect(() => {
    if (!userId) return

    const setupCallListener = async () => {
      console.log('📞 Setting up call listener for user:', userId)

      // Инициализируем менеджер переподключения если его нет
      if (!reconnectionManagerRef.current) {
        reconnectionManagerRef.current = createReconnectionManager(
          () => {
            setIsReconnecting(false)
            setupCallListener()
          },
          3, // максимум попыток
          2000 // базовая задержка
        )
      }

      // Очищаем существующие каналы перед созданием нового
      const channelId = `calls:${userId}`
      try {
        const existingChannels = supabase.getChannels().filter(ch => ch.topic === channelId || ch.topic?.includes(channelId))
        console.log('🧹 Found existing call listener channels:', existingChannels.length)

        for (const existingChannel of existingChannels) {
          safeRemoveChannel(supabase, existingChannel, `Call Listener Cleanup`)
        }

        // Моментальная очистка без задержек
        // Убираем задержку для максимальной скорости
      } catch (err) {
        console.warn('Error in call listener channel cleanup process:', err)
      }

      // Subscribe to incoming calls with resilient channel manager
      resilientChannelManager.createResilientChannel({
        channelName: channelId,
        setup: (channel) => {
          return channel
            .on('broadcast', { event: 'incoming_call' }, (payload: any) => {
              console.log('📞 Received incoming call:', payload)
              const { caller_id, caller_name, timestamp } = payload.payload
              
              // Check if this is a recent call (not older than 30 seconds)
              if (timestamp && Date.now() - timestamp > 30000) {
                console.log('📞 Ignoring old call signal')
                return
              }
              
              // Проверяем, не обрабатываем ли мы уже звонок
              const currentState = useCallStore.getState()
              if (currentState.isReceivingCall || currentState.isInCall) {
                console.log('📞 Already handling a call, ignoring duplicate')
                return
              }
              
              console.log('📞 Processing incoming call from:', caller_id, 'name:', caller_name)
              setIsReceivingCall(true, caller_id, caller_name)
            })
            .on('broadcast', { event: 'call_accepted' }, (payload: any) => {
              console.log('📞 Call was accepted:', payload)
              const { accepter_id } = payload.payload
              // Caller gets notification that call was accepted
              setIsReceivingCall(false)
              setIsCallActive(true)
            })
            .on('broadcast', { event: 'call_rejected' }, (payload: any) => {
              console.log('📞 Call was rejected:', payload)
              const { rejector_id } = payload.payload

              // Получаем актуальное состояние из store
              const currentState = useCallStore.getState()

              // Проверяем, что это отклонение нашего звонка
              if (currentState.isCalling && currentState.targetUserId === rejector_id) {
                console.log('📞 Our call was rejected by:', rejector_id.slice(0, 8))
                // Устанавливаем специальную ошибку для визуального изменения цвета плашки
                setError('CALL_REJECTED_VISUAL')
                // Небольшая задержка чтобы ошибка успела установиться
                setTimeout(() => endCall(), 50)
              } else if (currentState.isReceivingCall && currentState.callerId === rejector_id) {
                console.log('📞 Incoming call was rejected by:', rejector_id.slice(0, 8))
                // Устанавливаем специальную ошибку для визуального изменения цвета плашки
                setError('CALL_REJECTED_VISUAL')
                // Небольшая задержка чтобы ошибка успела установиться
                setTimeout(() => endCall(), 50)
              } else {
                console.log('📞 Call rejected by unknown user:', rejector_id?.slice(0, 8))
                // Даже если это неизвестный пользователь, завершаем звонок если мы в состоянии звонка
                if (currentState.isInCall) {
                  setTimeout(() => endCall(), 50)
                }
              }
            })
            .on('broadcast', { event: 'call_ended' }, (payload: any) => {
              console.log('📞 Call ended by other user:', payload)
              endCall()
            })
            .on('broadcast', { event: 'call_cancelled' }, (payload: any) => {
              console.log('📞 Call cancelled by caller:', payload)
              const { caller_id } = payload.payload

              // Проверяем, что это отмена нашего звонка
              const currentState = useCallStore.getState()
              if (currentState.isReceivingCall && currentState.callerId === caller_id) {
                console.log('📞 Our incoming call was cancelled by:', caller_id.slice(0, 8))
                setError('Звонок отменен звонящим')
                endCall()
              } else {
                console.log('📞 Call cancelled by unknown caller:', caller_id?.slice(0, 8))
                // Если мы в состоянии входящего звонка, завершаем его
                if (currentState.isReceivingCall) {
                  setError('Звонок отменен')
                  endCall()
                }
              }
            })
        },
        onSubscribed: () => {
          // Очищаем ошибки и сбрасываем счетчик при успешном подключении
          setError(null)
          setIsReconnecting(false)
          if (reconnectionManagerRef.current) {
            reconnectionManagerRef.current.reset()
          }
        },
        onError: (errorMessage) => {
          if (!isReconnecting && reconnectionManagerRef.current) {
            setIsReconnecting(true)
            const attempts = reconnectionManagerRef.current.getAttempts()
            setError(`Переподключение к звонкам... (${attempts + 1}/3)`)
            
            const success = reconnectionManagerRef.current.reconnect()
            if (!success) {
              setError('Не удалось восстановить соединение для звонков')
              setIsReconnecting(false)
            }
          }
        },
        maxReconnectAttempts: 10, // Больше попыток для критически важных каналов
        reconnectDelay: 3000, // 3 секунды между попытками
        keepAliveInterval: 15000, // Keep-alive каждые 15 секунд для длительных соединений
        healthCheckInterval: 30000 // Проверка здоровья каждые 30 секунд
      }).catch(error => {
        console.error('📞 Failed to create resilient call channel:', error)
        setError('Не удалось установить соединение для звонков')
      })

      return () => {
        console.log('📞 Cleaning up resilient call listener for user:', userId)
        resilientChannelManager.removeChannel(channelId)
      }
    }

    setupCallListener()

    return () => {
      console.log('📞 Cleaning up call listener for user:', userId)
      
      // Удаляем устойчивый канал
      if (userId) {
        resilientChannelManager.removeChannel(`calls:${userId}`)
      }
      
      // Очищаем менеджер переподключения
      if (reconnectionManagerRef.current) {
        reconnectionManagerRef.current.cancel()
        reconnectionManagerRef.current = null
      }
      setIsReconnecting(false)
    }
  }, [userId, supabase, isReconnecting])

  // ПРАВИЛЬНО: ChatApp всегда остается смонтированным
  // Компоненты звонка показываются поверх как модальные окна
  
  console.log('📱 CALL INTERFACE - Рендер чата:', {
    savedChatId,
    hasAutoOpenChat: !!savedChatId,
    isInCall,
    isCallActive,
    isReceivingCall,
    timestamp: new Date().toISOString()
  })

  return (
    <div className="relative h-full w-full">
      {/* Основной чат - ВСЕГДА смонтирован */}
      <ChatApp 
        autoOpenChatId={savedChatId || undefined} 
        onResetChat={() => {}} 
        resetTrigger={resetChatTrigger} 
      />

      {/* Модальные окна звонков - показываются ПОВЕРХ чата */}
      {isReceivingCall && (
        <div className="absolute inset-0 z-50 bg-background">
          <IncomingCall />
        </div>
      )}

      {isInCall && isCallActive && (
        <div className="absolute inset-0 z-50 bg-background">
          <CallScreen />
        </div>
      )}
    </div>
  )
}

export default CallInterface
