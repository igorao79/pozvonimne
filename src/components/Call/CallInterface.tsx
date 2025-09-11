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
      .on('broadcast', { event: 'call_ended' }, (payload) => {
        console.log('Call ended by other user:', payload)
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
