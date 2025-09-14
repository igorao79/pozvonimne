'use client'

import useCallStore from '@/store/useCallStore'
import { createClient } from '@/utils/supabase/client'

const IncomingCall = () => {
  const {
    callerId,
    callerName,
    acceptCall,
    rejectCall,
    userId
  } = useCallStore()
  
  const supabase = createClient()

  const handleAccept = async () => {
    try {
      console.log('🎯 IncomingCall: Accepting call from:', callerId)
      console.log('🎯 IncomingCall: Current state before accept:', {
        callerId,
        userId,
        isReceivingCall: useCallStore.getState().isReceivingCall,
        isInCall: useCallStore.getState().isInCall,
        isCalling: useCallStore.getState().isCalling,
        isCallActive: useCallStore.getState().isCallActive
      })
      
      // Send accept signal back to caller with proper subscription handling
      if (callerId) {
        console.log('🎯 IncomingCall: Setting up caller channel...')
        const callerChannel = supabase.channel(`calls:${callerId}`)
        
        // Wait for subscription to be ready
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Call accept subscription timeout'))
          }, 5000)

          callerChannel.subscribe((status) => {
            clearTimeout(timeout)
            console.log('🎯 IncomingCall: Caller channel subscription status:', status)
            
            if (status === 'SUBSCRIBED') {
              resolve(status)
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              reject(new Error(`Call accept subscription failed: ${status}`))
            }
          })
        })
        
        // Wait a bit for subscription to be fully ready
        await new Promise(resolve => setTimeout(resolve, 200))
        
        const result = await callerChannel.send({
          type: 'broadcast',
          event: 'call_accepted',
          payload: {
            accepter_id: userId,
            timestamp: Date.now()
          }
        })
        
        console.log('🎯 IncomingCall: Call accept signal sent to:', callerId, 'Result:', result)
        
        // Clean up channel
        setTimeout(() => {
          callerChannel.unsubscribe()
        }, 1000)
      }
      
      console.log('🎯 IncomingCall: Calling acceptCall() function...')
      acceptCall()
      
      console.log('🎯 IncomingCall: State after acceptCall():', {
        isReceivingCall: useCallStore.getState().isReceivingCall,
        isInCall: useCallStore.getState().isInCall,
        isCalling: useCallStore.getState().isCalling,
        isCallActive: useCallStore.getState().isCallActive,
        targetUserId: useCallStore.getState().targetUserId
      })
    } catch (err) {
      console.error('🎯 IncomingCall: Error accepting call:', err)
      // Still try to accept the call locally even if signaling fails
      acceptCall()
    }
  }

  const handleReject = async () => {
    try {
      console.log('🎯 IncomingCall: Rejecting call from:', callerId)
      
      // Send reject signal back to caller
      if (callerId) {
        const callerChannel = supabase.channel(`calls:${callerId}`)
        
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Call reject subscription timeout'))
          }, 3000)

          callerChannel.subscribe((status) => {
            clearTimeout(timeout)
            console.log('🎯 IncomingCall: Reject channel subscription status:', status)
            
            if (status === 'SUBSCRIBED') {
              resolve(status)
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              reject(new Error(`Call reject subscription failed: ${status}`))
            }
          })
        })
        
        const result = await callerChannel.send({
          type: 'broadcast',
          event: 'call_rejected',
          payload: {
            rejector_id: userId,
            timestamp: Date.now()
          }
        })
        
        console.log('🎯 IncomingCall: Call reject signal sent:', result)
        
        // Clean up channel
        setTimeout(() => {
          callerChannel.unsubscribe()
        }, 500)
      }
      
      rejectCall()
    } catch (err) {
      console.error('🎯 IncomingCall: Error rejecting call:', err)
      // Still reject locally even if signaling fails
      rejectCall()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full text-center">
        <div className="mb-6">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Входящий звонок
          </h2>
          <p className="text-lg text-gray-600">
            {callerName || `Пользователь ${callerId?.slice(0, 8)}...`}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            ID: {callerId}
          </p>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={handleReject}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-4 px-6 rounded-full transition-colors duration-200 flex items-center justify-center"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <button
            onClick={handleAccept}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-4 px-6 rounded-full transition-colors duration-200 flex items-center justify-center"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
        </div>

        <div className="mt-6">
          <div className="animate-pulse flex justify-center">
            <div className="w-4 h-4 bg-blue-500 rounded-full mx-1"></div>
            <div className="w-4 h-4 bg-blue-500 rounded-full mx-1 animation-delay-75"></div>
            <div className="w-4 h-4 bg-blue-500 rounded-full mx-1 animation-delay-150"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default IncomingCall
