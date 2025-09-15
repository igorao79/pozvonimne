'use client'

import { useEffect } from 'react'
import useCallStore from '@/store/useCallStore'
import { createClient } from '@/utils/supabase/client'
import useWebRTC from '@/hooks/useWebRTC'
import { CallControls, IncomingCall, CallScreen, DialPad } from '.'
import { ChatApp } from '../Chat'

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
    endCall
  } = useCallStore()
  
  // Initialize WebRTC
  useWebRTC()
  
  const supabase = createClient()

  useEffect(() => {
    if (!userId) return

    const setupCallListener = async () => {
      console.log('📞 Setting up call listener for user:', userId)

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
      .subscribe((status) => {
        console.log('📞 Call channel subscription status:', status)
        
        if (status === 'CHANNEL_ERROR') {
          console.error('📞 Call channel subscription error')
          setError('Проблема с соединением для входящих звонков')
        } else if (status === 'TIMED_OUT') {
          console.error('📞 Call channel subscription timeout')
          setError('Таймаут подключения для входящих звонков')
        } else if (status === 'SUBSCRIBED') {
          console.log('📞 Successfully subscribed to call channel')
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
      // Cleanup will be handled by the async function
    }
  }, [userId, supabase, setIsReceivingCall, endCall, setIsCallActive, setError])

  if (isReceivingCall) {
    return <IncomingCall />
  }

  if (isInCall && isCallActive) {
    return <CallScreen />
  }

  // Показываем лоадер, когда звонок отправлен, но еще не принят
  if (isInCall && isCalling && !isCallActive) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Звонок отправлен</h3>
            <p className="text-gray-600 mb-4">Ожидание принятия звонка...</p>
            <button
              onClick={endCall}
              className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
            >
              Отменить звонок
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <ChatApp />
}

export default CallInterface
