'use client'

import useCallStore from '@/store/useCallStore'
import { createClient } from '@/utils/supabase/client'

const CallControls = () => {
  const {
    isMicMuted,
    isInCall,
    targetUserId,
    userId,
    toggleMic,
    endCall
  } = useCallStore()
  
  const supabase = createClient()

  const handleEndCall = async () => {
    try {
      // Send end call signal to other user
      if (targetUserId) {
        const otherUserChannel = supabase.channel(`calls:${targetUserId}`)
        await otherUserChannel.subscribe()
        
        await otherUserChannel.send({
          type: 'broadcast',
          event: 'call_ended',
          payload: {
            ended_by: userId
          }
        })
      }
      
      endCall()
    } catch (err) {
      console.error('Error ending call:', err)
      endCall() // Still end the call locally
    }
  }

  if (!isInCall) return null

  return (
    <div className="flex justify-center items-center space-x-6">
      {/* Mute/Unmute Button */}
      <button
        onClick={toggleMic}
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors duration-200 ${
          isMicMuted 
            ? 'bg-red-500 hover:bg-red-600' 
            : 'bg-gray-600 hover:bg-gray-700'
        }`}
      >
        {isMicMuted ? (
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-3a1 1 0 011-1h1.586l4.707-4.707C10.923 4.663 12 5.109 12 6v12c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
        ) : (
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </button>

      {/* End Call Button */}
      <button
        onClick={handleEndCall}
        className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors duration-200 shadow-lg"
      >
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 3l18 18" />
        </svg>
      </button>

      {/* Placeholder for future features */}
      <div className="w-14 h-14 rounded-full bg-gray-600 bg-opacity-50 flex items-center justify-center">
        <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </div>
    </div>
  )
}

export default CallControls
