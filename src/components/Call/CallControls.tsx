'use client'

import useCallStore from '@/store/useCallStore'
import { createClient } from '@/utils/supabase/client'
import useScreenShare from '@/hooks/useScreenShare'

const CallControls = () => {
  const {
    isMicMuted,
    isInCall,
    targetUserId,
    userId,
    toggleMic,
    endCall
  } = useCallStore()

  const { isScreenSharing, toggleScreenShare } = useScreenShare()

  const supabase = createClient()

  const handleEndCall = async () => {
    try {
      // Send end call signal to other user
      if (targetUserId) {
        const otherUserChannel = supabase.channel(`calls:${targetUserId}`)
        await otherUserChannel.subscribe()

        // Моментальная отправка сигнала завершения
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
        className="w-16 h-16 bg-red-500 hover:bg-red-600 active:bg-red-700 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
      >
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
        </svg>
      </button>

      {/* Screen Share Button */}
      <button
        onClick={toggleScreenShare}
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors duration-200 ${
          isScreenSharing
            ? 'bg-green-500 hover:bg-green-600'
            : 'bg-gray-600 hover:bg-gray-700'
        }`}
        title={isScreenSharing ? 'Остановить демонстрацию экрана' : 'Поделиться экраном'}
      >
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </button>
    </div>
  )
}

export default CallControls
