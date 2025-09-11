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
      console.log('Accepting call from:', callerId)
      // Send accept signal back to caller
      if (callerId) {
        const callerChannel = supabase.channel(`calls:${callerId}`)
        await callerChannel.subscribe()
        
        await callerChannel.send({
          type: 'broadcast',
          event: 'call_accepted',
          payload: {
            accepter_id: userId
          }
        })
        console.log('Call accept signal sent to:', callerId)
      }
      
      acceptCall()
    } catch (err) {
      console.error('Error accepting call:', err)
    }
  }

  const handleReject = async () => {
    try {
      // Send reject signal back to caller
      if (callerId) {
        const callerChannel = supabase.channel(`calls:${callerId}`)
        await callerChannel.send({
          type: 'broadcast',
          event: 'call_rejected',
          payload: {
            rejector_id: userId
          }
        })
      }
      
      rejectCall()
    } catch (err) {
      console.error('Error rejecting call:', err)
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
