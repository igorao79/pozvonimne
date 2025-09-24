'use client'

import { useRef, useEffect, useState, useCallback} from 'react'
import useCallStore from '@/store/useCallStore'
import useAudioAnalyzer from '@/hooks/useAudioAnalyzer'
import useConnectionHandler from '@/hooks/useConnectionHandler'
import useThemeStore from '@/store/useThemeStore'
import { createClient } from '@/utils/supabase/client'
import CallControls from './CallControls'
import AudioDiagnostics from './AudioDiagnostics'
import ConnectionStatus from './ConnectionStatus'
import { ScreenSharingWindow, AudioCallInterface } from './CallScreen/'

const CallScreen = () => {
  const localAudioRef = useRef<HTMLAudioElement>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)
  const screenVideoRef = useRef<HTMLVideoElement>(null)
  const [remoteMicMuted, setRemoteMicMuted] = useState(false)
  const [remoteUserName, setRemoteUserName] = useState('')
  const [remoteUserAvatar, setRemoteUserAvatar] = useState('')
  const [showDiagnostics, setShowDiagnostics] = useState(false)

  // Screen window state
  const [screenWindowPosition, setScreenWindowPosition] = useState(() => {
    const saved = localStorage.getItem('screenWindowPosition')
    return saved ? JSON.parse(saved) : { x: 20, y: 20 }
  })
  const [screenWindowSize, setScreenWindowSize] = useState(() => {
    const saved = localStorage.getItem('screenWindowSize')
    return saved ? JSON.parse(saved) : { width: 400, height: 300 }
  })
  const [isScreenFullscreen, setIsScreenFullscreen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isResizing, setIsResizing] = useState(false)
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [isMobile, setIsMobile] = useState(false)
  const [isStreamHidden, setIsStreamHidden] = useState(false)

  // Отслеживаем размер окна для адаптивности
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    // Проверяем при монтировании
    checkIsMobile()

    // Добавляем слушатель на изменение размера окна
    window.addEventListener('resize', checkIsMobile)

    return () => {
      window.removeEventListener('resize', checkIsMobile)
    }
  }, [])

  // Убираем сложные состояния video - теперь все просто

  const {
    localStream,
    remoteStream,
    targetUserId,
    isCallActive,
    isMicMuted,
    userId,
    isScreenSharing,
    screenStream,
    remoteScreenStream,
    isReceivingCall,
    isInCall
  } = useCallStore()

  // Get current theme
  const { theme } = useThemeStore()

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

  // Audio setup effects
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
      remoteAudioRef.current.muted = false
      if (remoteAudioRef.current.volume !== undefined) {
        remoteAudioRef.current.volume = 1.0
      }

      const playPromise = remoteAudioRef.current.play()
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('Remote audio playback started successfully')
          })
          .catch((error) => {
            console.error('Remote audio playback failed:', error)
            if (error.name === 'NotAllowedError') {
              console.log('Autoplay blocked, waiting for user interaction...')
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

  // Mic status synchronization
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

        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('username, display_name, avatar_url')
          .eq('id', targetUserId)
          .single()

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error getting user profile:', profileError)
        }

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

  // Send mic status changes
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
        console.log('📡 Sent mic status to', targetUserId, ':', isMicMuted)
      } catch (err) {
        console.error('Error sending mic status:', err)
      }
    }

    sendMicStatus()
  }, [isMicMuted, targetUserId, userId, supabase])

  // Send initial mic status when call starts
  useEffect(() => {
    if (!targetUserId || !userId || !isCallActive) return

    const sendInitialMicStatus = async () => {
      try {
        // Small delay to ensure channel is ready
        setTimeout(async () => {
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
          console.log('📡 Sent initial mic status to', targetUserId, ':', isMicMuted)
        }, 100)
      } catch (err) {
        console.error('Error sending initial mic status:', err)
      }
    }

    sendInitialMicStatus()
  }, [targetUserId, userId, isCallActive, isMicMuted, supabase])

  // Reset remote mic status when target user changes
  useEffect(() => {
    if (targetUserId) {
      // Reset to assume mic is not muted initially
      // This will be updated when we receive the actual status from the remote user
      setRemoteMicMuted(false)
      console.log('🔄 Reset remote mic status for new target user:', targetUserId)
    }
  }, [targetUserId])

  // Синхронизация состояния видимости стрима между пользователями
  useEffect(() => {
    if (!userId || !targetUserId) return

    const streamVisibilityChannel = supabase
      .channel(`stream_visibility:${userId}`)
      .on('broadcast', { event: 'stream_visibility_change' }, (payload) => {
        const { user_id, is_hidden } = payload.payload
        if (user_id === targetUserId) {
          console.log('👁️ Received stream visibility from', user_id, ':', is_hidden)
          setIsStreamHidden(is_hidden)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(streamVisibilityChannel)
    }
  }, [userId, targetUserId, supabase])

  // Отправка состояния видимости стрима при изменении
  useEffect(() => {
    if (!userId || !targetUserId) return

    const sendStreamVisibility = async () => {
      try {
        const channel = supabase.channel(`stream_visibility:${targetUserId}`)
        await channel.subscribe()
        await channel.send({
          type: 'broadcast',
          event: 'stream_visibility_change',
          payload: {
            user_id: userId,
            is_hidden: isStreamHidden
          }
        })
        console.log('👁️ Sent stream visibility to', targetUserId, ':', isStreamHidden)
      } catch (err) {
        console.error('Error sending stream visibility:', err)
      }
    }

    sendStreamVisibility()
  }, [isStreamHidden, targetUserId, userId, supabase])

  // Функция для переключения видимости стрима
  const toggleStreamVisibility = useCallback(() => {
    setIsStreamHidden(prev => !prev)
  }, [])

  // Screen window controls
  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent, type: 'drag' | 'resize' = 'drag') => {
    if (isScreenFullscreen) return

    // Определяем координаты для mouse или touch событий
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    if (type === 'drag') {
      setIsDragging(true)
      const rect = e.currentTarget.getBoundingClientRect()
      setDragOffset({
        x: clientX - rect.left,
        y: clientY - rect.top
      })
    } else if (type === 'resize') {
      setIsResizing(true)
      setResizeStart({
        x: clientX,
        y: clientY,
        width: screenWindowSize.width,
        height: screenWindowSize.height
      })
    }

    e.preventDefault()
  }, [isScreenFullscreen, screenWindowSize])

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    // Определяем координаты для mouse или touch событий
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    if (isDragging) {
      const newX = Math.max(0, Math.min(clientX - dragOffset.x, window.innerWidth - screenWindowSize.width))
      const newY = Math.max(0, Math.min(clientY - dragOffset.y, window.innerHeight - screenWindowSize.height))
      setScreenWindowPosition({ x: newX, y: newY })
    } else if (isResizing) {
      const deltaX = clientX - resizeStart.x
      const deltaY = clientY - resizeStart.y
      const newWidth = Math.max(100, Math.min(resizeStart.width + deltaX, window.innerWidth - screenWindowPosition.x))
      const newHeight = Math.max(80, Math.min(resizeStart.height + deltaY, window.innerHeight - screenWindowPosition.y))
      setScreenWindowSize({ width: newWidth, height: newHeight })
    }
  }, [isDragging, isResizing, dragOffset, resizeStart, screenWindowSize, screenWindowPosition])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setIsResizing(false)
  }, [])

  // Add global mouse and touch event listeners
  useEffect(() => {
    if (isDragging || isResizing) {
      // Mouse events
      document.addEventListener('mousemove', handleMouseMove as EventListener)
      document.addEventListener('mouseup', handleMouseUp)

      // Touch events
      document.addEventListener('touchmove', handleMouseMove as EventListener, { passive: false })
      document.addEventListener('touchend', handleMouseUp, { passive: false })

      document.body.style.cursor = isDragging ? 'move' : 'nw-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      // Mouse events
      document.removeEventListener('mousemove', handleMouseMove as EventListener)
      document.removeEventListener('mouseup', handleMouseUp)

      // Touch events
      document.removeEventListener('touchmove', handleMouseMove as EventListener)
      document.removeEventListener('touchend', handleMouseUp)

      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp])

  const toggleFullscreen = useCallback(() => {
    setIsScreenFullscreen(!isScreenFullscreen)
  }, [isScreenFullscreen])

  const resetPosition = useCallback(async () => {
    console.log('🔄 Starting full stream reconnection...')

    // Сбрасываем позицию и размер окна
    setScreenWindowPosition({ x: 20, y: 20 })
    setScreenWindowSize({ width: 400, height: 300 })
    setIsScreenFullscreen(false)

    // Полная переподключка к стриму
    if (screenVideoRef.current) {
      const videoElement = screenVideoRef.current

      try {
        // Останавливаем текущий стрим
        console.log('🔄 Stopping current stream...')
        videoElement.pause()
        videoElement.currentTime = 0
        videoElement.srcObject = null

        // Ждем немного для полной очистки
        await new Promise(resolve => setTimeout(resolve, 300))

        // Выбираем stream для переподключения
        const streamToShow = remoteScreenStream || screenStream

        if (streamToShow) {
          console.log('🔄 Reconnecting to stream:', streamToShow.id)

          // Убеждаемся, что tracks активны
          const videoTracks = streamToShow.getVideoTracks()
          const activeTracks = videoTracks.filter(track => track.readyState === 'live' && track.enabled)

          if (activeTracks.length > 0) {
            // Переподключаем stream
            videoElement.srcObject = streamToShow

            // Принудительно перезагружаем видео элемент
            videoElement.load()

            // Небольшая задержка перед запуском
            await new Promise(resolve => setTimeout(resolve, 100))

            // Запускаем воспроизведение
            try {
              await videoElement.play()
              console.log('✅ Stream reconnection successful')

              // Дополнительная проверка через некоторое время
              setTimeout(() => {
                if (videoElement && videoElement.paused && videoElement.srcObject) {
                  console.log('🔄 Additional attempt to start playback')
                  videoElement.play().catch(console.error)
                }
              }, 1000)

            } catch (playError) {
              console.warn('⚠️ Auto-play failed after reconnection, waiting for user interaction')
              // Ждем взаимодействия пользователя
              const startPlayback = () => {
                if (videoElement && videoElement.srcObject) {
                  videoElement.play().catch(console.error)
                  document.removeEventListener('click', startPlayback)
                  document.removeEventListener('touchstart', startPlayback)
                }
              }
              document.addEventListener('click', startPlayback)
              document.addEventListener('touchstart', startPlayback)
            }
          } else {
            console.warn('⚠️ No active video tracks in stream')
          }
        } else {
          console.log('⚠️ No stream available for reconnection')
        }
      } catch (error) {
        console.error('❌ Error during stream reconnection:', error)

        // Попытка восстановления в случае ошибки
        setTimeout(() => {
          if (screenVideoRef.current) {
            const streamToShow = remoteScreenStream || screenStream
            if (streamToShow) {
              console.log('🔄 Recovery attempt after error')
              screenVideoRef.current.srcObject = streamToShow
              screenVideoRef.current.play().catch(console.error)
            }
          }
        }, 2000)
      }
    }
  }, [remoteScreenStream, screenStream])

  // Save screen window position and size
  useEffect(() => {
    localStorage.setItem('screenWindowPosition', JSON.stringify(screenWindowPosition))
  }, [screenWindowPosition])

  useEffect(() => {
    localStorage.setItem('screenWindowSize', JSON.stringify(screenWindowSize))
  }, [screenWindowSize])

  // Theme-based background classes - адаптированные для половинного экрана на десктопе
  const getBackgroundClasses = () => {
    if (isMobile) {
      // Полноэкранный режим для мобильных
      if (theme === 'dark') {
        return 'min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col relative'
      } else {
        return 'min-h-screen bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-600 flex flex-col relative'
      }
    } else {
      // Половинный экран для десктопа
      if (theme === 'dark') {
        return 'h-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col relative'
      } else {
        return 'h-full bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-600 flex flex-col relative'
      }
    }
  }

  // Theme-based overlay classes for better contrast
  const getOverlayClasses = () => {
    if (theme === 'dark') {
      return 'absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10'
    } else {
      return 'absolute inset-0 bg-gradient-to-t from-white/10 via-transparent to-blue-900/20'
    }
  }

  return (
    <div className={getBackgroundClasses()}>
      {/* Theme overlay for better visual hierarchy */}
      <div className={getOverlayClasses()}></div>

      {/* Content container with relative positioning */}
      <div className={`relative z-10 flex flex-col ${
        isMobile ? 'min-h-screen' : 'h-full'
      }`}>
        {/* Hidden audio elements */}
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
            if (remoteAudioRef.current) {
              console.log('Auto-starting remote audio...')
              remoteAudioRef.current.play()
                .then(() => console.log('Remote audio auto-play successful'))
                .catch((error) => {
                  console.log('Remote audio auto-play failed:', error.name)
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

        {/* Screen Sharing Window */}
        <ScreenSharingWindow
          isScreenFullscreen={isScreenFullscreen}
          screenWindowPosition={screenWindowPosition}
          screenWindowSize={screenWindowSize}
          isStreamHidden={isStreamHidden}
          onMouseDown={handleMouseDown}
          onToggleFullscreen={toggleFullscreen}
          onToggleStreamVisibility={toggleStreamVisibility}
          onStopVideo={() => {
            if (screenVideoRef.current) {
              console.log('📺 Stopping video playback')
              screenVideoRef.current.pause()
              screenVideoRef.current.srcObject = null
            }
          }}
          onResetPosition={resetPosition}
        />

        {/* Audio Call Interface */}
        <div className="flex-1 flex items-center justify-center pb-32">
          <AudioCallInterface
            remoteMicMuted={remoteMicMuted}
            setRemoteMicMuted={setRemoteMicMuted}
            remoteUserName={remoteUserName}
            remoteUserAvatar={remoteUserAvatar}
            showDiagnostics={showDiagnostics}
            setShowDiagnostics={setShowDiagnostics}
            remoteAudioRef={remoteAudioRef}
          />
        </div>

        {/* Controls - positioned based on screen size */}
        <div className={`${
          isMobile ? 'fixed' : 'absolute'
        } bottom-0 left-0 right-0 p-6 z-1 ${
          theme === 'dark'
            ? 'bg-black/50 backdrop-blur-md border-t border-white/20'
            : 'bg-white/40 backdrop-blur-md border-t border-white/30'
        }`}>
          <div className="flex flex-col items-center space-y-4">
            <CallControls
              isStreamHidden={isStreamHidden}
              onToggleStreamVisibility={toggleStreamVisibility}
            />
          </div>
        </div>

        {/* Audio Diagnostics Modal */}
        {showDiagnostics && (
          <AudioDiagnostics onClose={() => setShowDiagnostics(false)} />
        )}

        {/* Connection Status */}
        <ConnectionStatus />
      </div>
    </div>
  )
}

export default CallScreen