'use client'

import { useEffect } from 'react'
import useCallStore from '@/store/useCallStore'
import { createClient } from '@/utils/supabase/client'
import useWebRTC from '@/hooks/useWebRTC'
import { CallControls, IncomingCall, CallScreen, DialPad } from '.'

const CallInterface = () => {
  const {
    userId,
    isInCall,
    isReceivingCall,
    isCallActive,
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

    // Subscribe to incoming calls
    const callChannel = supabase
      .channel(`calls:${userId}`)
      .on('broadcast', { event: 'incoming_call' }, (payload) => {
        console.log('Received incoming call:', payload)
        const { caller_id, caller_name } = payload.payload
        setIsReceivingCall(true, caller_id, caller_name)
      })
      .on('broadcast', { event: 'call_accepted' }, (payload) => {
        console.log('Call was accepted:', payload)
        const { accepter_id } = payload.payload
        // Caller gets notification that call was accepted
        setIsReceivingCall(false)
        setIsCallActive(true)
      })
      .on('broadcast', { event: 'call_rejected' }, () => {
        setError('Звонок отклонен')
        endCall()
      })
      .on('broadcast', { event: 'call_ended' }, () => {
        endCall()
      })
      .subscribe()

    return () => {
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
              Аудио звонки
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              Ваш ID: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{userId}</span>
            </p>
            <p className="text-sm text-gray-500">
              Поделитесь своим ID для получения аудио звонков
            </p>
          </div>
          
          <DialPad />
        </div>
      </div>
    </div>
  )
}

export default CallInterface
