'use client'

import { useRef, useEffect, useState } from 'react'
import useCallStore from '@/store/useCallStore'
import useAudioAnalyzer from '@/hooks/useAudioAnalyzer'
import useConnectionHandler from '@/hooks/useConnectionHandler'
import { createClient } from '@/utils/supabase/client'
import CallControls from './CallControls'

const CallScreen = () => {
  const localAudioRef = useRef<HTMLAudioElement>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)
  const [remoteMicMuted, setRemoteMicMuted] = useState(false)
  
  const {
    localStream,
    remoteStream,
    targetUserId,
    isCallActive,
    isMicMuted,
    userId
  } = useCallStore()

  // Use audio analyzer for speaking detection
  const { isSpeaking: isLocalSpeaking } = useAudioAnalyzer({ 
    stream: localStream, 
    isActive: isCallActive && !isMicMuted 
  })
  const { isSpeaking: isRemoteSpeaking } = useAudioAnalyzer({ 
    stream: remoteStream, 
    isActive: isCallActive && !remoteMicMuted 
  })

  // Use connection handler
  useConnectionHandler()

  const supabase = createClient()

  useEffect(() => {
    if (localAudioRef.current && localStream) {
      localAudioRef.current.srcObject = localStream
    }
  }, [localStream])

  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  // Listen for mic status changes from remote user
  useEffect(() => {
    if (!userId || !targetUserId) return

    const micStatusChannel = supabase
      .channel(`mic_status:${userId}`)
      .on('broadcast', { event: 'mic_status_change' }, (payload) => {
        const { user_id, is_muted } = payload.payload
        if (user_id === targetUserId) {
          setRemoteMicMuted(is_muted)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(micStatusChannel)
    }
  }, [userId, targetUserId, supabase])

  // Send mic status changes to remote user
  useEffect(() => {
    if (!targetUserId || !userId) return

    const sendMicStatus = async () => {
      try {
        const channel = supabase.channel(`mic_status:${targetUserId}`)
        await channel.subscribe()
        await channel.send({
          type: 'broadcast',
          event: 'mic_status_change',
          payload: {
            user_id: userId,
            is_muted: isMicMuted
          }
        })
      } catch (err) {
        console.error('Error sending mic status:', err)
      }
    }

    sendMicStatus()
  }, [isMicMuted, targetUserId, userId, supabase])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900 flex flex-col">
      {/* Скрытые аудио элементы */}
      <audio
        ref={localAudioRef}
        autoPlay
        muted
        style={{ display: 'none' }}
      />
      <audio
        ref={remoteAudioRef}
        autoPlay
        style={{ display: 'none' }}
      />

      {/* Audio Call Interface */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center">
          {/* Avatar with speaking animation */}
          <div className="relative mb-8">
            <div className={`w-40 h-40 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mx-auto flex items-center justify-center shadow-2xl transition-all duration-200 ${
              isRemoteSpeaking ? 'ring-4 ring-green-400 ring-opacity-75 animate-pulse' : ''
            }`}>
              <svg className="w-20 h-20 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7-7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            
            {/* Remote mic status indicator */}
            {remoteMicMuted && (
              <div className="absolute bottom-2 right-2 bg-red-500 rounded-full p-2 shadow-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-3a1 1 0 011-1h1.586l4.707-4.707C10.923 4.663 12 5.109 12 6v12c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              </div>
            )}

            {/* Speaking waves animation */}
            {isRemoteSpeaking && !remoteMicMuted && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-green-400 rounded-full animate-ping opacity-30"></div>
                <div className="absolute w-52 h-52 border-2 border-green-300 rounded-full animate-ping opacity-20" style={{ animationDelay: '0.2s' }}></div>
                <div className="absolute w-56 h-56 border-2 border-green-200 rounded-full animate-ping opacity-10" style={{ animationDelay: '0.4s' }}></div>
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="text-white mb-8">
            <h2 className="text-2xl font-bold mb-2">
              Пользователь {targetUserId?.slice(0, 8)}...
            </h2>
            <p className="text-lg text-blue-200 mb-4">
              ID: {targetUserId}
            </p>
            
            {/* Call Status */}
            <div className="flex items-center justify-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isCallActive ? 'bg-green-400' : 'bg-yellow-400'} animate-pulse`}></div>
              <span className="text-blue-100">
                {isCallActive ? 'Активный звонок' : 'Соединение...'}
              </span>
            </div>
          </div>

          {/* Audio Status Indicators */}
          <div className="flex justify-center space-x-8 mb-12">
            <div className="text-center">
              <div className={`relative w-16 h-16 bg-blue-600 bg-opacity-50 rounded-full flex items-center justify-center mb-2 transition-all duration-200 ${
                isLocalSpeaking && !isMicMuted ? 'ring-2 ring-green-400 ring-opacity-75' : ''
              }`}>
                {isMicMuted ? (
                  <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-3a1 1 0 011-1h1.586l4.707-4.707C10.923 4.663 12 5.109 12 6v12c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                )}
                
                {/* Local speaking animation */}
                {isLocalSpeaking && !isMicMuted && (
                  <div className="absolute inset-0 bg-green-400 rounded-full opacity-20 animate-pulse"></div>
                )}
              </div>
              <p className="text-blue-200 text-sm">
                {isMicMuted ? 'Микрофон выкл.' : 'Ваш микрофон'}
              </p>
            </div>
            
            <div className="text-center">
              <div className={`relative w-16 h-16 bg-blue-600 bg-opacity-50 rounded-full flex items-center justify-center mb-2 transition-all duration-200 ${
                isRemoteSpeaking && !remoteMicMuted ? 'ring-2 ring-green-400 ring-opacity-75' : ''
              }`}>
                {!remoteStream ? (
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-3a1 1 0 011-1h1.586l4.707-4.707C10.923 4.663 12 5.109 12 6v12c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                ) : remoteMicMuted ? (
                  <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-3a1 1 0 011-1h1.586l4.707-4.707C10.923 4.663 12 5.109 12 6v12c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                ) : (
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                )}
                
                {/* Remote speaking animation */}
                {isRemoteSpeaking && !remoteMicMuted && (
                  <div className="absolute inset-0 bg-green-400 rounded-full opacity-20 animate-pulse"></div>
                )}
              </div>
              <p className="text-blue-200 text-sm">
                {!remoteStream ? 'Ожидание...' : remoteMicMuted ? 'Микрофон выкл.' : 'Собеседник'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-6 bg-black bg-opacity-25">
        <CallControls />
      </div>
    </div>
  )
}

export default CallScreen
