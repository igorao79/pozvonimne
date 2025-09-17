'use client'

import { useEffect, useState, useRef } from 'react'
import useCallStore from '@/store/useCallStore'
import { createClient } from '@/utils/supabase/client'
import useWebRTC from '@/hooks/useWebRTC'
import { CallControls, IncomingCall, CallScreen, DialPad } from '.'
import { ChatApp } from '../Chat'
import { sendCallEndedMessage, sendMissedCallMessage, findOrCreateChatWithUser } from '@/utils/callSystemMessages'

const CallInterface = () => {
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
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Состояние для чата, который нужно открыть после звонка
  const [chatToOpenAfterCall, setChatToOpenAfterCall] = useState<string | null>(null)
  
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

  // Функция для поиска чата с конкретным пользователем (для перехода к чату)
  const findChatWithUser = async (targetUserId: string) => {
    return await findOrCreateChatWithUser(targetUserId)
  }

  // Восстановление сохраненного чата из localStorage при загрузке
  useEffect(() => {
    if (!userId) return

    console.log('💾 ВОССТАНОВЛЕНИЕ ЧАТА - Проверка localStorage при загрузке компонента')
    
    try {
      const savedChatFromStorage = localStorage.getItem('selectedChatId')
      
      if (savedChatFromStorage) {
        console.log('💾 ВОССТАНОВЛЕНИЕ ЧАТА - Найден сохраненный чат:', savedChatFromStorage)
        setSavedChatId(savedChatFromStorage)
      } else {
        console.log('💾 ВОССТАНОВЛЕНИЕ ЧАТА - Сохраненный чат не найден')
      }
    } catch (error) {
      console.error('💾 ВОССТАНОВЛЕНИЕ ЧАТА - Ошибка чтения localStorage:', error)
    }
  }, [userId])

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

  // Отслеживаем завершение звонка и находим соответствующий чат для перехода
  useEffect(() => {
    const wasInCall = isInCall || isCallActive || isCalling || isReceivingCall
    const isCurrentlyInCall = isInCall || isCallActive || isCalling || isReceivingCall
    
    // Определяем ID пользователя для перехода к чату
    const userToRedirect = targetUserId || callerId

    console.log('📱 ПЕРЕХОД К ЧАТУ - Проверка состояния звонка:', {
      wasInCall,
      isCurrentlyInCall,
      targetUserId: targetUserId?.substring(0, 8),
      callerId: callerId?.substring(0, 8),
      userToRedirect: userToRedirect?.substring(0, 8),
      chatToOpenAfterCall,
      timestamp: new Date().toISOString()
    })

    // Если звонок только что завершился (был в звонке, но сейчас нет)
    if (wasInCall && !isCurrentlyInCall && userToRedirect && !chatToOpenAfterCall) {
      console.log('📱 ПЕРЕХОД К ЧАТУ - Звонок завершился, ищем чат для перехода:', {
        userToRedirect: userToRedirect.substring(0, 8),
        wasInCall,
        isCurrentlyInCall
      })
      
      // Добавляем задержку для корректной обработки
      setTimeout(async () => {
        try {
          console.log('📱 ПЕРЕХОД К ЧАТУ - Поиск/создание чата для пользователя:', userToRedirect.substring(0, 8))
          
          const chatId = await findOrCreateChatWithUser(userToRedirect)
          
          console.log('📱 ПЕРЕХОД К ЧАТУ - Результат поиска чата:', {
            chatId,
            userToRedirect: userToRedirect.substring(0, 8),
            found: !!chatId
          })

          if (chatId) {
            console.log('📱 ПЕРЕХОД К ЧАТУ - Установка чата для открытия:', {
              chatId,
              userToRedirect: userToRedirect.substring(0, 8)
            })
            setChatToOpenAfterCall(chatId)
          } else {
            console.error('❌ ПЕРЕХОД К ЧАТУ - Не удалось найти/создать чат для пользователя:', {
              userToRedirect: userToRedirect.substring(0, 8)
            })
          }
        } catch (error) {
          console.error('❌ ПЕРЕХОД К ЧАТУ - Ошибка поиска чата после звонка:', {
            error,
            userToRedirect: userToRedirect.substring(0, 8),
            message: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }, 1500)
    }

    // Если звонок начался заново, очищаем состояние предыдущего чата
    if (isCurrentlyInCall && chatToOpenAfterCall) {
      console.log('📱 ПЕРЕХОД К ЧАТУ - Новый звонок начался, очищаем состояние чата:', {
        chatToOpenAfterCall,
        isCurrentlyInCall
      })
      setChatToOpenAfterCall(null)
    }

    // Очищаем состояние чата через некоторое время после завершения звонка
    if (wasInCall && !isCurrentlyInCall && chatToOpenAfterCall) {
      console.log('📱 ПЕРЕХОД К ЧАТУ - Планируем очистку состояния чата через 5 секунд:', {
        chatToOpenAfterCall
      })
      setTimeout(() => {
        console.log('🧹 ПЕРЕХОД К ЧАТУ - Очистка состояния чата после задержки')
        setChatToOpenAfterCall(null)
      }, 5000) // Увеличиваем время до 5 секунд
    }
  }, [isInCall, isCallActive, isCalling, isReceivingCall, targetUserId, callerId, chatToOpenAfterCall])

  useEffect(() => {
    if (!userId) return

    const setupCallListener = async () => {
      // Предотвращаем множественные попытки переподключения
      if (isReconnecting && reconnectAttempts >= 3) {
        console.log('📞 Max reconnection attempts reached, stopping')
        setError('Не удалось восстановить соединение для звонков')
        setIsReconnecting(false)
        return
      }

      console.log('📞 Setting up call listener for user:', userId, 'Attempt:', reconnectAttempts + 1)

      // Очищаем существующие каналы перед созданием нового
      const channelId = `calls:${userId}`
      try {
        const existingChannels = supabase.getChannels().filter(ch => ch.topic === channelId || ch.topic?.includes(channelId))
        console.log('🧹 Found existing call listener channels:', existingChannels.length)

        for (const existingChannel of existingChannels) {
          try {
            console.log('🧹 Cleaning up existing call listener channel:', existingChannel.topic)
            existingChannel.unsubscribe()
            supabase.removeChannel(existingChannel)
          } catch (err) {
            console.warn('Error cleaning up call listener channel:', err)
          }
        }

        // Моментальная очистка без задержек
        // Убираем задержку для максимальной скорости
      } catch (err) {
        console.warn('Error in call listener channel cleanup process:', err)
      }

      // Subscribe to incoming calls with improved error handling
      const callChannel = supabase
        .channel(channelId)
      .on('broadcast', { event: 'incoming_call' }, (payload) => {
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
      .on('broadcast', { event: 'call_accepted' }, (payload) => {
        console.log('📞 Call was accepted:', payload)
        const { accepter_id } = payload.payload
        // Caller gets notification that call was accepted
        setIsReceivingCall(false)
        setIsCallActive(true)
      })
      .on('broadcast', { event: 'call_rejected' }, (payload) => {
        console.log('📞 Call was rejected:', payload)
        const { rejector_id } = payload.payload

        // Получаем актуальное состояние из store
        const currentState = useCallStore.getState()

        // Проверяем, что это отклонение нашего звонка
        if (currentState.isCalling && currentState.targetUserId === rejector_id) {
          console.log('📞 Our call was rejected by:', rejector_id.slice(0, 8))
          setError('Звонок отклонен')
          endCall()
        } else if (currentState.isReceivingCall && currentState.callerId === rejector_id) {
          console.log('📞 Incoming call was rejected by:', rejector_id.slice(0, 8))
          setError('Звонок отклонен')
          endCall()
        } else {
          console.log('📞 Call rejected by unknown user:', rejector_id?.slice(0, 8))
          // Даже если это неизвестный пользователь, завершаем звонок если мы в состоянии звонка
          if (currentState.isInCall) {
            setError('Звонок завершен')
            endCall()
          }
        }
      })
      .on('broadcast', { event: 'call_ended' }, (payload) => {
        console.log('📞 Call ended by other user:', payload)
        endCall()
      })
      .subscribe((status, err) => {
        console.log('📞 Call channel subscription status:', status, err)

        if (status === 'CHANNEL_ERROR') {
          console.error('📞 Call channel subscription error:', err)
          if (!isReconnecting) {
            setIsReconnecting(true)
            setReconnectAttempts(prev => prev + 1)
            console.log('📞 Starting reconnection process...')

            // Показываем статус переподключения
            setError(`Переподключение к звонкам... (${reconnectAttempts + 1}/3)`)

            // Попытка переподключения через 2 секунды
            reconnectTimeoutRef.current = setTimeout(() => {
              setIsReconnecting(false)
              setupCallListener()
            }, 2000)
          }
        } else if (status === 'TIMED_OUT') {
          console.error('📞 Call channel subscription timeout:', err)
          if (!isReconnecting) {
            setIsReconnecting(true)
            setReconnectAttempts(prev => prev + 1)
            console.log('📞 Channel timed out, starting reconnection...')

            setError(`Таймаут соединения. Переподключение... (${reconnectAttempts + 1}/3)`)

            // Попытка переподключения через 3 секунды
            reconnectTimeoutRef.current = setTimeout(() => {
              setIsReconnecting(false)
              setupCallListener()
            }, 3000)
          }
        } else if (status === 'SUBSCRIBED') {
          console.log('📞 Successfully subscribed to call channel')
          // Очищаем ошибки и сбрасываем счетчик при успешном подключении
          setError(null)
          setIsReconnecting(false)
          setReconnectAttempts(0)
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current)
            reconnectTimeoutRef.current = null
          }
        } else if (status === 'CLOSED') {
          console.log('📞 Call channel closed')
          setIsReconnecting(false)
        }
      })

      return () => {
        console.log('📞 Cleaning up call listener for user:', userId)
        supabase.removeChannel(callChannel)
      }
    }

    setupCallListener()

    return () => {
      console.log('📞 Cleaning up call listener for user:', userId)
      // Очищаем таймер переподключения
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      setIsReconnecting(false)
      setReconnectAttempts(0)
    }
  }, [userId, supabase, isReconnecting, reconnectAttempts])

  if (isReceivingCall) {
    return <IncomingCall />
  }

  if (isInCall && isCallActive) {
    return <CallScreen />
  }

  // Показываем лоадер, когда звонок отправлен, но еще не принят
  if (isInCall && isCalling && !isCallActive) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-hidden">
        <div className="bg-card rounded-lg p-6 max-w-sm w-full mx-4 border border-border">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Звонок отправлен</h3>
            <p className="text-muted-foreground mb-4">Ожидание принятия звонка...</p>
            <button
              onClick={endCall}
              className="w-full bg-destructive text-destructive-foreground py-2 px-4 rounded-lg hover:bg-destructive/90 transition-colors"
            >
              Отменить звонок
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Определяем какой чат нужно открыть: после звонка имеет приоритет над сохраненным
  const chatIdToOpen = chatToOpenAfterCall || savedChatId

  console.log('📱 CALL INTERFACE - Рендер чата:', {
    chatToOpenAfterCall,
    savedChatId,
    chatIdToOpen,
    hasAutoOpenChat: !!chatIdToOpen,
    timestamp: new Date().toISOString()
  })

  return <ChatApp autoOpenChatId={chatIdToOpen || undefined} />
}

export default CallInterface
