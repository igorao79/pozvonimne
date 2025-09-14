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

    console.log('📞 Setting up call listener for user:', userId)

    // Subscribe to incoming calls with improved error handling
    const callChannel = supabase
      .channel(`calls:${userId}`)
      .on('broadcast', { event: 'incoming_call' }, (payload) => {
        console.log('📞 Received incoming call:', payload)
        const { caller_id, caller_name, timestamp } = payload.payload
        
        // Check if this is a recent call (not older than 30 seconds)
        if (timestamp && Date.now() - timestamp > 30000) {
          console.log('📞 Ignoring old call signal')
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
        setError('Звонок отклонен')
        endCall()
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
