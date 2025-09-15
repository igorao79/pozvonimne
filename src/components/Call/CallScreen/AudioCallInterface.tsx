'use client'

import { useEffect, useState } from 'react'
import useCallStore from '@/store/useCallStore'
import useAudioAnalyzer from '@/hooks/useAudioAnalyzer'
import { createClient } from '@/utils/supabase/client'

interface AudioCallInterfaceProps {
  remoteMicMuted: boolean
  setRemoteMicMuted: (muted: boolean) => void
  remoteUserName: string
  remoteUserAvatar: string
  showDiagnostics: boolean
  setShowDiagnostics: (show: boolean) => void
  remoteAudioRef: React.RefObject<HTMLAudioElement | null>
}

const AudioCallInterface = ({
  remoteMicMuted,
  setRemoteMicMuted,
  remoteUserName,
  remoteUserAvatar,
  showDiagnostics,
  setShowDiagnostics,
  remoteAudioRef
}: AudioCallInterfaceProps) => {
  const {
    localStream,
    remoteStream,
    targetUserId,
    isCallActive,
    isMicMuted,
    userId,
    isScreenSharing
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

  const supabase = createClient()

  // Handle mic status changes
  useEffect(() => {
    const handleMicStatusChange = async () => {
      try {
        await supabase
          .channel(`mic_status:${targetUserId}`)
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              supabase
                .channel(`mic_status:${targetUserId}`)
                .on('broadcast', { event: 'mic_status_change' }, (payload) => {
                  if (payload.payload.user_id === targetUserId) {
                    console.log('📡 Received mic status from', payload.payload.user_id, ':', payload.payload.is_muted)
                    setRemoteMicMuted(payload.payload.is_muted)
                  }
                })
                .subscribe()
            }
          })

        // Send initial mic status immediately
        const channel = await supabase.channel(`mic_status:${userId}`).subscribe()
        await supabase
          .channel(`mic_status:${userId}`)
          .send({
            type: 'broadcast',
            event: 'mic_status_change',
            payload: {
              user_id: userId,
              is_muted: isMicMuted
            }
          })
        console.log('📡 AudioCallInterface sent initial mic status:', isMicMuted)
      } catch (err) {
        console.error('Error sending mic status:', err)
      }
    }

    if (targetUserId && userId) {
      handleMicStatusChange()
    }
  }, [targetUserId, userId, isMicMuted, supabase, setRemoteMicMuted])

  // Send mic status when isCallActive changes
  useEffect(() => {
    if (!targetUserId || !userId || !isCallActive) return

    const sendMicStatusUpdate = async () => {
      try {
        setTimeout(async () => {
          const channel = supabase.channel(`mic_status:${userId}`)
          await channel.subscribe()
          await channel.send({
            type: 'broadcast',
            event: 'mic_status_change',
            payload: {
              user_id: userId,
              is_muted: isMicMuted
            }
          })
          console.log('📡 AudioCallInterface sent mic status update on call start:', isMicMuted)
        }, 200) // Small delay after call becomes active
      } catch (err) {
        console.error('Error sending mic status update:', err)
      }
    }

    sendMicStatusUpdate()
  }, [targetUserId, userId, isCallActive, isMicMuted, supabase])

  return (
    <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        {/* Avatar with speaking animation */}
        <div className={`relative mb-8 transition-all duration-500 ${
          isScreenSharing ? 'transform scale-75 translate-y-8 opacity-60' : ''
        }`}>
          <div className={`w-40 h-40 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mx-auto flex items-center justify-center shadow-2xl transition-all duration-200 overflow-hidden ${
            isRemoteSpeaking ? 'ring-4 ring-green-400 ring-opacity-75 animate-pulse' : ''
          }`}>
            {remoteUserAvatar ? (
              <img
                src={remoteUserAvatar}
                alt="Avatar"
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error('Failed to load remote user avatar:', remoteUserAvatar)
                  e.currentTarget.style.display = 'none'
                }}
              />
            ) : null}
            {!remoteUserAvatar && (
              <svg className="w-20 h-20 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7-7h14a7 7 0 00-7-7z" />
              </svg>
            )}
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
            {remoteUserName || `Пользователь ${targetUserId?.slice(0, 8)}...`}
          </h2>
          <p className="text-lg text-blue-200 mb-4">
            {targetUserId && `ID: ${targetUserId}`}
          </p>

          {/* Call Status */}
          <div className="flex flex-col items-center space-y-2">
            <div className="flex items-center justify-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isCallActive ? 'bg-green-400' : 'bg-yellow-400'} animate-pulse`}></div>
              <span className="text-blue-100">
                {isCallActive ? 'Активный звонок' : 'Соединение...'}
              </span>
            </div>

            {/* Screen Sharing Status */}
            {isScreenSharing && (
              <div className="flex items-center justify-center space-x-2 bg-green-500 bg-opacity-20 rounded-full px-3 py-1">
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-green-200 text-sm">
                  Демонстрация экрана
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Audio Autoplay Fix Button */}
        {remoteStream && (
          <div className="mb-8">
            <button
              onClick={() => {
                if (remoteAudioRef.current) {
                  remoteAudioRef.current.play().catch(console.error)
                }
                console.log('Audio autoplay fix button clicked')
              }}
              className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
            >
              🔊 Включить звук (если не слышно)
            </button>
          </div>
        )}

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
              {!remoteStream ? 'Аудио не подключено' : remoteMicMuted ? 'Микрофон выкл.' : 'Подключен'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AudioCallInterface
