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
  const [remoteUserName, setRemoteUserName] = useState('')
  const [remoteUserAvatar, setRemoteUserAvatar] = useState('')

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
      console.log('Setting remote stream to audio element:', {
        streamId: remoteStream.id,
        audioTracks: remoteStream.getAudioTracks().length,
        audioElement: remoteAudioRef.current
      })

      remoteAudioRef.current.srcObject = remoteStream

      // Убеждаемся что аудио не отключено
      remoteAudioRef.current.muted = false
      if (remoteAudioRef.current.volume !== undefined) {
        remoteAudioRef.current.volume = 1.0
      }

      console.log('Remote audio element configured:', {
        muted: remoteAudioRef.current.muted,
        volume: remoteAudioRef.current.volume,
        paused: remoteAudioRef.current.paused,
        readyState: remoteAudioRef.current.readyState
      })

      // Принудительно запускаем воспроизведение с дополнительными проверками
      const playPromise = remoteAudioRef.current.play()
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('Remote audio playback started successfully')
            
            // Дополнительная проверка что звук действительно играет
            setTimeout(() => {
              if (remoteAudioRef.current) {
                console.log('Remote audio status after 1s:', {
                  paused: remoteAudioRef.current.paused,
                  currentTime: remoteAudioRef.current.currentTime,
                  volume: remoteAudioRef.current.volume,
                  muted: remoteAudioRef.current.muted,
                  readyState: remoteAudioRef.current.readyState
                })
                
                // Если все еще на паузе, пробуем снова
                if (remoteAudioRef.current.paused) {
                  console.log('Audio still paused, trying to play again...')
                  remoteAudioRef.current.play().catch(console.error)
                }
              }
            }, 1000)
          })
          .catch((error) => {
            console.error('Remote audio playback failed:', error)
            
            // Пробуем альтернативные способы запуска
            if (error.name === 'NotAllowedError') {
              console.log('Autoplay blocked, waiting for user interaction...')
              // Добавляем обработчик клика для запуска аудио
              const startAudio = () => {
                if (remoteAudioRef.current) {
                  remoteAudioRef.current.play().catch(console.error)
                  document.removeEventListener('click', startAudio)
                }
              }
              document.addEventListener('click', startAudio)
            }
          })
      }
    } else {
      console.log('Remote audio setup skipped:', {
        hasAudioElement: !!remoteAudioRef.current,
        hasRemoteStream: !!remoteStream
      })
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

  // Load remote user info
  useEffect(() => {
    const loadRemoteUserInfo = async () => {
      if (!targetUserId) return

      try {
        console.log('Loading remote user info for:', targetUserId)

        // Сначала получаем данные из auth.users
        const { data: authData, error: authError } = await supabase.auth.admin.getUserById(targetUserId)
        if (authError) {
          console.error('Error getting auth user:', authError)
        }

        // Получаем данные из user_profiles
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('username, display_name, avatar_url')
          .eq('id', targetUserId)
          .single()

        if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = not found
          console.error('Error getting user profile:', profileError)
        }

        // Используем display_name из профиля, или из auth, или username
        const displayName = profileData?.display_name ||
                           authData?.user?.user_metadata?.display_name ||
                           profileData?.username ||
                           `Пользователь ${targetUserId?.slice(0, 8)}...`

        const avatarUrl = profileData?.avatar_url || ''

        console.log('Remote user info loaded:', { displayName, avatarUrl })
        setRemoteUserName(displayName)
        setRemoteUserAvatar(avatarUrl)

      } catch (err) {
        console.error('Error loading remote user info:', err)
        setRemoteUserName(`Пользователь ${targetUserId?.slice(0, 8)}...`)
        setRemoteUserAvatar('')
      }
    }

    loadRemoteUserInfo()
  }, [targetUserId, supabase])

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
        playsInline
        controls={false}
        muted={false}
        style={{ display: 'none' }}
        onLoadedData={() => console.log('Remote audio loaded data')}
        onCanPlay={() => {
          console.log('Remote audio can play')
          // Принудительно запускаем воспроизведение когда готово
          if (remoteAudioRef.current) {
            remoteAudioRef.current.play().catch(console.error)
          }
        }}
        onPlay={() => console.log('Remote audio started playing')}
        onPause={() => console.log('Remote audio paused')}
        onError={(e) => console.error('Remote audio error:', e)}
        onVolumeChange={() => console.log('Remote audio volume changed:', remoteAudioRef.current?.volume)}
        onLoadedMetadata={() => {
          console.log('Remote audio metadata loaded')
          if (remoteAudioRef.current) {
            console.log('Audio duration:', remoteAudioRef.current.duration)
          }
        }}
        onStalled={() => console.log('Remote audio stalled')}
        onSuspend={() => console.log('Remote audio suspended')}
        onWaiting={() => console.log('Remote audio waiting')}
        onEnded={() => console.log('Remote audio ended')}
      />

      {/* Audio Call Interface */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center">
          {/* Avatar with speaking animation */}
          <div className="relative mb-8">
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
