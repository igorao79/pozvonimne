'use client'

import { useRef, useEffect, useState } from 'react'
import useCallStore from '@/store/useCallStore'
import useAudioAnalyzer from '@/hooks/useAudioAnalyzer'
import useConnectionHandler from '@/hooks/useConnectionHandler'
import { createClient } from '@/utils/supabase/client'
import CallControls from './CallControls'
import AudioDiagnostics from './AudioDiagnostics'
import ConnectionStatus from './ConnectionStatus'

const CallScreen = () => {
  const localAudioRef = useRef<HTMLAudioElement>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)
  const screenVideoRef = useRef<HTMLVideoElement>(null)
  const [remoteMicMuted, setRemoteMicMuted] = useState(false)
  const [remoteUserName, setRemoteUserName] = useState('')
  const [remoteUserAvatar, setRemoteUserAvatar] = useState('')
  const [showDiagnostics, setShowDiagnostics] = useState(false)

  const {
    localStream,
    remoteStream,
    targetUserId,
    isCallActive,
    isMicMuted,
    userId,
    isScreenSharing,
    screenStream,
    remoteScreenStream
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
    console.log('📺 Screen stream useEffect triggered:', {
      hasVideoRef: !!screenVideoRef.current,
      hasScreenStream: !!screenStream,
      hasRemoteScreenStream: !!remoteScreenStream,
      isScreenSharing,
      screenStreamId: screenStream?.id,
      remoteScreenStreamId: remoteScreenStream?.id
    })

    // Приоритет: сначала показываем remote screen sharing (от собеседника), затем локальный
    const streamToShow = remoteScreenStream || screenStream

    if (screenVideoRef.current) {
      if (streamToShow) {
        // Проверяем что в stream есть активные video треки
        const videoTracks = streamToShow.getVideoTracks()
        const activeTracks = videoTracks.filter(track => 
          track.readyState === 'live' && track.enabled
        )

        console.log('📺 Setting screen stream to video element:', {
          streamId: streamToShow.id,
          totalVideoTracks: videoTracks.length,
          activeTracks: activeTracks.length,
          isRemote: !!remoteScreenStream
        })

        if (activeTracks.length > 0) {
          // Создаем новый stream только с активными треками
          const activeStream = new MediaStream(activeTracks)
          screenVideoRef.current.srcObject = activeStream

          // Запускаем воспроизведение
          const playPromise = screenVideoRef.current.play()
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log('📺 Screen video playback started successfully')
              })
              .catch((error) => {
                console.error('📺 Screen video playback failed:', error)
              })
          }
        } else {
          console.log('📺 No active video tracks, clearing screen video')
          screenVideoRef.current.srcObject = null
        }
      } else {
        console.log('📺 Clearing screen video srcObject - no stream available')
        screenVideoRef.current.srcObject = null
        
        // Принудительно приостанавливаем видео элемент
        if (!screenVideoRef.current.paused) {
          screenVideoRef.current.pause()
        }
      }
    }
  }, [screenStream, remoteScreenStream, isScreenSharing])

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
            
            // Проверяем что аудио элемент получает данные
            setTimeout(() => {
              if (remoteAudioRef.current) {
                const audioElement = remoteAudioRef.current
                console.log('Remote audio status after 1s:', {
                  paused: audioElement.paused,
                  currentTime: audioElement.currentTime,
                  volume: audioElement.volume,
                  muted: audioElement.muted,
                  readyState: audioElement.readyState,
                  networkState: audioElement.networkState,
                  buffered: audioElement.buffered.length > 0 ? audioElement.buffered.end(0) : 0
                })
                
                // Проверяем MediaStream
                if (audioElement.srcObject) {
                  const stream = audioElement.srcObject as MediaStream
                  const tracks = stream.getAudioTracks()
                  console.log('Remote stream tracks:', tracks.map(track => ({
                    id: track.id,
                    kind: track.kind,
                    enabled: track.enabled,
                    muted: track.muted,
                    readyState: track.readyState,
                    label: track.label
                  })))
                  
                  // Проверяем что треки активны
                  if (tracks.length === 0) {
                    console.error('Remote stream has no audio tracks!')
                  } else {
                    tracks.forEach(track => {
                      if (track.readyState === 'ended') {
                        console.error('Remote audio track has ended!')
                      }
                      if (track.muted) {
                        console.warn('Remote audio track is muted')
                      }
                      if (!track.enabled) {
                        console.warn('Remote audio track is disabled')
                      }
                    })
                  }
                }
                
                // Если все еще на паузе, пробуем снова
                if (audioElement.paused) {
                  console.log('Audio still paused, trying to play again...')
                  audioElement.play().catch(console.error)
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

        // Получаем данные только из user_profiles (без admin API)
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('username, display_name, avatar_url')
          .eq('id', targetUserId)
          .single()

        if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = not found
          console.error('Error getting user profile:', profileError)
        }

        // Используем display_name из профиля или username
        const displayName = profileData?.display_name ||
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
              console.log('Auto-starting remote audio...')
              remoteAudioRef.current.play()
                .then(() => console.log('Remote audio auto-play successful'))
                .catch((error) => {
                  console.log('Remote audio auto-play failed:', error.name)
                  // Добавляем глобальный обработчик клика для запуска аудио
                  const startAudioOnClick = () => {
                    if (remoteAudioRef.current) {
                      remoteAudioRef.current.play().catch(console.error)
                      document.removeEventListener('click', startAudioOnClick)
                      document.removeEventListener('touchstart', startAudioOnClick)
                    }
                  }
                  document.addEventListener('click', startAudioOnClick)
                  document.addEventListener('touchstart', startAudioOnClick)
                })
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

      {/* Screen sharing video element */}
      <video
        ref={screenVideoRef}
        autoPlay
        playsInline
        controls={false}
        muted={false}
        style={{
          display: (() => {
            // Показываем только если есть активные video треки
            const hasActiveScreenStream = screenStream?.getVideoTracks().some(track => 
              track.readyState === 'live' && track.enabled
            )
            const hasActiveRemoteScreenStream = remoteScreenStream?.getVideoTracks().some(track => 
              track.readyState === 'live' && track.enabled
            )
            return (hasActiveScreenStream || hasActiveRemoteScreenStream) ? 'block' : 'none'
          })(),
          position: 'fixed',
          top: '20px',
          right: '20px',
          width: '400px',
          height: '250px',
          border: '2px solid #10b981',
          borderRadius: '8px',
          zIndex: 1000,
          backgroundColor: '#000',
          objectFit: 'contain' // Добавляем правильное масштабирование
        }}
        onLoadedData={() => console.log('📺 Screen video loaded data')}
        onPlay={() => console.log('📺 Screen video started playing')}
        onPause={() => console.log('📺 Screen video paused')}
        onError={(e) => console.error('📺 Screen video error:', e)}
        onEmptied={() => console.log('📺 Screen video emptied')}
        onEnded={() => {
          console.log('📺 Screen video ended')
          // При завершении видео скрываем элемент
        }}
        onLoadStart={() => console.log('📺 Screen video load start')}
        onCanPlay={() => console.log('📺 Screen video can play')}
      />

      {/* Audio Call Interface */}
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
              {(isScreenSharing || remoteScreenStream) && (
                <div className="flex items-center justify-center space-x-2 bg-green-500 bg-opacity-20 rounded-full px-3 py-1">
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-green-200 text-sm">
                    {remoteScreenStream ? 'Собеседник делится экраном' : 'Демонстрация экрана'}
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

      {/* Controls */}
      <div className="p-6 bg-black bg-opacity-25">
        <div className="flex flex-col items-center space-y-4">
          <CallControls />
          
          {/* Diagnostics Button */}
          <button
            onClick={() => setShowDiagnostics(true)}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors"
          >
            🔧 Диагностика аудио
          </button>
        </div>
      </div>

      {/* Audio Diagnostics Modal */}
      {showDiagnostics && (
        <AudioDiagnostics onClose={() => setShowDiagnostics(false)} />
      )}

      {/* Connection Status */}
      <ConnectionStatus />
    </div>
  )
}

export default CallScreen
