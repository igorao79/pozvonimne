'use client'

import { useEffect } from 'react'
import useCallStore from '@/store/useCallStore'
import { createClient } from '@/utils/supabase/client'
import useWebRTC from '@/hooks/useWebRTC'
import { CallControls, IncomingCall, CallScreen, DialPad } from '.'
import UsersList from '../UsersList/UsersList'
import MicrophoneTest from '../MicrophoneTest/MicrophoneTest'

const CallInterface = () => {
  const {
    userId,
    isInCall,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
            Позвони.мне
          </h1>
          <p className="text-sm text-gray-500">
            Звоните друг другу по никнеймам
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            <MicrophoneTest />
            <DialPad />
          </div>

          {/* Right Column */}
          <div>
            <UsersList />
          </div>
        </div>
      </div>
    </div>
  )
}

export default CallInterface
