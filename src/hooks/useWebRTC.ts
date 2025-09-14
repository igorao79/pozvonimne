'use client'

import { useEffect, useRef } from 'react'
import SimplePeer from 'simple-peer'
import useCallStore from '@/store/useCallStore'
import { createClient } from '@/utils/supabase/client'

const useWebRTC = () => {
  const peerRef = useRef<SimplePeer.Instance | null>(null)
  const signalBufferRef = useRef<Array<{signal: any, from: string}>>([])
  const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const connectionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastKeepAliveRef = useRef<number>(0)
  const reconnectAttemptsRef = useRef<number>(0)
  const supabase = createClient()
  
  const {
    userId,
    targetUserId,
    isInCall,
    isCalling,
    isCallActive,
    isReceivingCall,
    callerId,
    setLocalStream,
    setRemoteStream,
    setPeer,
    setIsCallActive,
    setError,
    endCall,
    setTargetUserId
  } = useCallStore()

  // Логируем состояние при каждом рендере
  console.log(`🎯 [User ${userId?.slice(0, 8)}] useWebRTC render with state:`, {
    isInCall,
    isCalling,
    isCallActive,
    isReceivingCall,
    hasPeer: !!peerRef.current,
    targetUserId: targetUserId?.slice(0, 8),
    callerId: callerId?.slice(0, 8)
  })

  // Функция для обработки буферизованных сигналов
  const processBufferedSignals = () => {
    const bufferedSignals = signalBufferRef.current
    if (bufferedSignals.length > 0 && peerRef.current && !peerRef.current.destroyed) {
      console.log(`🔄 [User ${userId?.slice(0, 8)}] Processing ${bufferedSignals.length} buffered signals`)
      
      bufferedSignals.forEach(({ signal, from }, index) => {
        try {
          console.log(`🔄 [User ${userId?.slice(0, 8)}] Processing buffered signal ${index + 1}/${bufferedSignals.length}: ${signal.type} from ${from.slice(0, 8)}`)
          peerRef.current!.signal(signal)
        } catch (err) {
          console.error(`Error processing buffered signal ${index + 1}:`, err)
        }
      })
      
      // Очищаем буфер после обработки
      signalBufferRef.current = []
      console.log(`✅ [User ${userId?.slice(0, 8)}] All buffered signals processed and buffer cleared`)
    }
  }

  // Функция для отправки keep-alive сигналов
  const startKeepAlive = () => {
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current)
    }

    console.log(`💓 [User ${userId?.slice(0, 8)}] Starting keep-alive mechanism`)
    
    keepAliveIntervalRef.current = setInterval(() => {
      if (peerRef.current && !peerRef.current.destroyed && targetUserId && isCallActive) {
        try {
          const currentTime = Date.now()
          
          // Отправляем keep-alive пакет через data channel
          if (peerRef.current.connected) {
            peerRef.current.send(JSON.stringify({
              type: 'keep_alive',
              timestamp: currentTime,
              from: userId
            }))
            
            lastKeepAliveRef.current = currentTime
            console.log(`💓 [User ${userId?.slice(0, 8)}] Keep-alive sent at ${new Date(currentTime).toLocaleTimeString()}`)
          } else {
            console.warn(`💓 [User ${userId?.slice(0, 8)}] Peer not connected, skipping keep-alive`)
          }
        } catch (err) {
          console.warn(`💓 [User ${userId?.slice(0, 8)}] Keep-alive error:`, err)
        }
      }
    }, 30000) // Отправляем keep-alive каждые 30 секунд
  }

  // Функция для остановки keep-alive
  const stopKeepAlive = () => {
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current)
      keepAliveIntervalRef.current = null
      console.log(`💓 [User ${userId?.slice(0, 8)}] Keep-alive stopped`)
    }
  }

  // Функция для мониторинга состояния соединения
  const startConnectionMonitoring = () => {
    if (connectionCheckIntervalRef.current) {
      clearInterval(connectionCheckIntervalRef.current)
    }

    console.log(`📊 [User ${userId?.slice(0, 8)}] Starting connection monitoring`)
    
    connectionCheckIntervalRef.current = setInterval(() => {
      if (peerRef.current && !peerRef.current.destroyed) {
        const pc = (peerRef.current as any)._pc
        
        if (pc) {
          const connectionState = pc.connectionState
          const iceConnectionState = pc.iceConnectionState
          const iceGatheringState = pc.iceGatheringState
          
          console.log(`📊 [User ${userId?.slice(0, 8)}] Connection status:`, {
            connectionState,
            iceConnectionState,
            iceGatheringState,
            connected: peerRef.current.connected,
            lastKeepAlive: lastKeepAliveRef.current ? new Date(lastKeepAliveRef.current).toLocaleTimeString() : 'never'
          })

          // Проверяем критические состояния
          if (connectionState === 'failed' || iceConnectionState === 'failed') {
            console.error(`📊 [User ${userId?.slice(0, 8)}] Connection failed, attempting reconnection`)
            attemptReconnection()
          } else if (connectionState === 'disconnected' || iceConnectionState === 'disconnected') {
            console.warn(`📊 [User ${userId?.slice(0, 8)}] Connection disconnected, monitoring...`)
            // Ждем 10 секунд на восстановление, если не восстановилось - переподключаемся
            setTimeout(() => {
              if (peerRef.current && !peerRef.current.destroyed) {
                const currentState = (peerRef.current as any)._pc?.connectionState
                if (currentState === 'disconnected' || currentState === 'failed') {
                  console.error(`📊 [User ${userId?.slice(0, 8)}] Connection still disconnected after 10s, attempting reconnection`)
                  attemptReconnection()
                }
              }
            }, 10000)
          }

          // Проверяем последний keep-alive (не должен быть старше 2 минут)
          if (lastKeepAliveRef.current && Date.now() - lastKeepAliveRef.current > 120000) {
            console.warn(`📊 [User ${userId?.slice(0, 8)}] No keep-alive response for 2+ minutes, checking connection...`)
            if (connectionState !== 'connected') {
              attemptReconnection()
            }
          }
        }
      }
    }, 15000) // Проверяем каждые 15 секунд
  }

  // Функция для остановки мониторинга
  const stopConnectionMonitoring = () => {
    if (connectionCheckIntervalRef.current) {
      clearInterval(connectionCheckIntervalRef.current)
      connectionCheckIntervalRef.current = null
      console.log(`📊 [User ${userId?.slice(0, 8)}] Connection monitoring stopped`)
    }
  }

  // Функция для попытки переподключения
  const attemptReconnection = () => {
    if (reconnectTimeoutRef.current || !isInCall || !targetUserId) {
      return
    }

    const maxRetries = 3
    const currentAttempt = reconnectAttemptsRef.current + 1
    
    if (currentAttempt > maxRetries) {
      console.error(`🔄 [User ${userId?.slice(0, 8)}] Max reconnection attempts reached, ending call`)
      setError('Соединение потеряно и не может быть восстановлено')
      endCall()
      return
    }

    console.log(`🔄 [User ${userId?.slice(0, 8)}] Attempting reconnection ${currentAttempt}/${maxRetries}`)
    reconnectAttemptsRef.current = currentAttempt

    // Небольшая задержка перед переподключением
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = null
      
      if (isInCall && targetUserId) {
        console.log(`🔄 [User ${userId?.slice(0, 8)}] Reinitializing peer connection`)
        
        // Уничтожаем старое соединение
        if (peerRef.current && !peerRef.current.destroyed) {
          try {
            peerRef.current.destroy()
          } catch (err) {
            console.warn('Error destroying old peer during reconnection:', err)
          }
          peerRef.current = null
        }

        // Создаем новое соединение
        const wasInitiator = isCalling
        initializePeer(wasInitiator)
      }
    }, 2000 * currentAttempt) // Увеличиваем задержку с каждой попыткой
  }

  // Функция для сброса счетчика переподключений
  const resetReconnectionCounter = () => {
    reconnectAttemptsRef.current = 0
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
  }

  // Максимально оптимизированная конфигурация ICE серверов
  const iceServers = [
    // Основные быстрые STUN серверы Google
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    
    // Надежные TURN серверы для сложных сетей
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turns:openrelay.metered.ca:443'
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    
    // Дополнительные TURN серверы для надежности
    {
      urls: [
        'turn:relay.backups.cz',
        'turn:relay.backups.cz:443'
      ],
      username: 'webrtc',
      credential: 'webrtc'
    },
    
    // Альтернативные STUN серверы
    { urls: 'stun:stun.freeswitch.org' },
    { urls: 'stun:stun.voip.blackberry.com:3478' },
    { urls: 'stun:stun.sipgate.net:3478' },
    { urls: 'stun:stun.ekiga.net' },
    { urls: 'stun:stun.ideasip.com' }
  ]

  const initializePeer = async (isInitiator: boolean) => {
    try {
      // Предотвращаем создание нескольких peer соединений
      if (peerRef.current && !peerRef.current.destroyed) {
        console.log('Peer already exists, destroying old one')
        try {
          peerRef.current.destroy()
        } catch (err) {
          console.warn('Error destroying old peer:', err)
        }
        peerRef.current = null
      }

      console.log('Requesting microphone access...')
      console.log('HTTPS check:', window.location.protocol === 'https:')
      console.log('User agent:', navigator.userAgent)

      // Оптимизированные ограничения для лучшего качества аудио
      const constraints = {
        video: false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          googEchoCancellation: true,
          googAutoGainControl: true,
          googNoiseSuppression: true,
          googHighpassFilter: true,
          googTypingNoiseDetection: true,
          sampleRate: 48000, // Высокое качество звука
          sampleSize: 16,
          channelCount: 1, // Моно для экономии трафика
          latency: 0.01, // Минимальная задержка
          volume: 1.0
        }
      }

      console.log('Requesting media with constraints:', constraints)
      const stream = await navigator.mediaDevices.getUserMedia(constraints)

      console.log('Microphone access granted, stream:', {
        id: stream.id,
        tracks: stream.getTracks().map(track => ({
          kind: track.kind,
          label: track.label,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState
        }))
      })

      // Проверяем что треки активны
      const audioTracks = stream.getAudioTracks()
      console.log('Audio tracks:', audioTracks.length)
      audioTracks.forEach((track, index) => {
        console.log(`Audio track ${index}:`, {
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          constraints: track.getConstraints(),
          settings: track.getSettings()
        })
      })

      setLocalStream(stream)

      // Максимально оптимизированная конфигурация peer connection
      const peer = new SimplePeer({
        initiator: isInitiator,
        trickle: true, // Включаем trickle ICE для быстрого соединения
        stream,
        config: {
          iceServers,
          iceTransportPolicy: 'all',
          bundlePolicy: 'max-bundle',
          rtcpMuxPolicy: 'require',
          iceCandidatePoolSize: 15, // Увеличиваем пул для лучшего соединения
          // Дополнительные настройки для стабильности
          certificates: undefined // Автогенерация сертификата
        },
        offerOptions: {
          offerToReceiveAudio: true,
          offerToReceiveVideo: false
        },
        answerOptions: {
          offerToReceiveAudio: true,
          offerToReceiveVideo: false
        },
        // Дополнительные оптимизации
        allowHalfTrickle: true,
        objectMode: false,
        // Включаем data channel для keep-alive
        channelConfig: {
          ordered: true,
          maxRetransmits: 30
        },
        channelName: `datachannel-${userId}-${Date.now()}`
      })

      peer.on('error', (err) => {
        console.error('Peer error:', err)

        // Игнорируем определенные типы ошибок, которые не требуют завершения звонка
        if (err instanceof Error) {
          if (err.message.includes('InvalidStateError') ||
              err.message.includes('wrong state') ||
              err.message.includes('already have a remote') ||
              err.message.includes('remote description')) {
            console.log('Ignoring recoverable peer error:', err.message)
            return
          }
        }

        setError('Ошибка соединения: ' + err.message)
        endCall()
      })

      peer.on('signal', async (data) => {
        try {
          // Проверяем что peer не уничтожен и соответствует текущему соединению
          if (peer.destroyed || peer !== peerRef.current) {
            console.log('Peer destroyed or outdated, not sending signal')
            return
          }

          // Проверяем состояние peer connection
          const peerState = (peer as any)._pc?.connectionState || 'unknown'
          if (peerState === 'closed' || peerState === 'failed') {
            console.log('Peer connection closed/failed, not sending signal')
            return
          }

          // Получаем актуальный targetUserId из store на момент отправки
          const currentTargetUserId = useCallStore.getState().targetUserId
          
          if (!currentTargetUserId) {
            console.error(`❌ [User ${userId?.slice(0, 8)}] Cannot send signal - no targetUserId set!`, {
              originalTargetUserId: targetUserId,
              currentTargetUserId,
              signalType: data.type,
              isReceivingCall: useCallStore.getState().isReceivingCall,
              callerId: useCallStore.getState().callerId
            })
            return
          }

          console.log(`📤 [User ${userId?.slice(0, 8)}] Sending signal to ${currentTargetUserId.slice(0, 8)}:`, data.type)
          // Send signal to the other user using current targetUserId
          const targetChannel = supabase.channel(`webrtc:${currentTargetUserId}`)
          await targetChannel.subscribe()

          await targetChannel.send({
            type: 'broadcast',
            event: 'webrtc_signal',
            payload: {
              signal: data,
              from: userId
            }
          })
          console.log('Signal sent successfully')
        } catch (err) {
          console.error('Error sending signal:', err)
        }
      })

      peer.on('connect', () => {
        console.log('Peer connected!')
        setIsCallActive(true)
        
        // Сбрасываем счетчик переподключений при успешном соединении
        resetReconnectionCounter()
        
        // Запускаем keep-alive и мониторинг
        startKeepAlive()
        startConnectionMonitoring()
      })

      // Обработчик ICE кандидатов для более быстрого соединения
      peer.on('iceStateChange', (state) => {
        console.log('ICE state changed:', state)
      })

      peer.on('iceCandidate', (candidate) => {
        console.log('New ICE candidate:', candidate)
      })

      peer.on('signal', (data) => {
        console.log(`📤 [User ${userId?.slice(0, 8)}] Generated signal:`, data.type, {
          type: data.type,
          hasSdp: !!(data as any).sdp,
          hasCandidate: !!(data as any).candidate,
          targetUser: targetUserId?.slice(0, 8)
        })
      })

      peer.on('stream', (remoteStream) => {
        console.log('Received remote stream:', {
          id: remoteStream.id,
          tracks: remoteStream.getTracks().map(track => ({
            kind: track.kind,
            label: track.label,
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState
          }))
        })

        // Проверяем remote audio tracks
        const remoteAudioTracks = remoteStream.getAudioTracks()
        console.log('Remote audio tracks:', remoteAudioTracks.length)
        remoteAudioTracks.forEach((track, index) => {
          console.log(`Remote audio track ${index}:`, {
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState,
            constraints: track.getConstraints(),
            settings: track.getSettings()
          })

          // Добавляем обработчики событий для трека
          track.onended = () => console.log(`Remote audio track ${index} ended`)
          track.onmute = () => console.log(`Remote audio track ${index} muted`)
          track.onunmute = () => console.log(`Remote audio track ${index} unmuted`)
        })

        setRemoteStream(remoteStream)
      })

      // Обработчик для получения данных через data channel
      peer.on('data', (data) => {
        try {
          const message = JSON.parse(data.toString())
          
          if (message.type === 'keep_alive') {
            console.log(`💓 [User ${userId?.slice(0, 8)}] Keep-alive received from ${message.from?.slice(0, 8)} at ${new Date(message.timestamp).toLocaleTimeString()}`)
            
            // Отправляем ответ на keep-alive
            if (peerRef.current && !peerRef.current.destroyed && peerRef.current.connected) {
              peerRef.current.send(JSON.stringify({
                type: 'keep_alive_response',
                timestamp: Date.now(),
                originalTimestamp: message.timestamp,
                from: userId
              }))
            }
          } else if (message.type === 'keep_alive_response') {
            console.log(`💓 [User ${userId?.slice(0, 8)}] Keep-alive response received from ${message.from?.slice(0, 8)}`)
            lastKeepAliveRef.current = Date.now()
          }
        } catch (err) {
          console.warn('Error parsing data channel message:', err)
        }
      })

      peer.on('close', () => {
        console.log('Peer connection closed')
        
        // Останавливаем keep-alive и мониторинг
        stopKeepAlive()
        stopConnectionMonitoring()
        
        // Не вызываем endCall() здесь, чтобы избежать рекурсии
        // endCall() будет вызван через обработчик события в CallInterface
      })

      peerRef.current = peer
      setPeer(peer)

      // Обрабатываем буферизованные сигналы после создания peer
      console.log(`✅ [User ${userId?.slice(0, 8)}] Peer initialized, checking for buffered signals...`)
      processBufferedSignals()

    } catch (err) {
      console.error('Error initializing peer:', err)

      // Детальная диагностика ошибок
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Доступ к микрофону запрещен. Разрешите доступ в настройках браузера.')
        } else if (err.name === 'NotFoundError') {
          setError('Микрофон не найден. Проверьте подключение микрофона.')
        } else if (err.name === 'NotReadableError') {
          setError('Микрофон занят другим приложением.')
        } else if (err.name === 'OverconstrainedError') {
          setError('Запрошенные параметры микрофона не поддерживаются.')
        } else if (err.name === 'SecurityError') {
          setError('Требуется HTTPS для доступа к микрофону в продакшене.')
        } else if (err.name === 'AbortError') {
          setError('Запрос на доступ к микрофону был отменен.')
        } else {
          setError(`Ошибка доступа к микрофону: ${err.message}`)
        }
      } else {
        setError('Неизвестная ошибка при получении доступа к микрофону')
      }

      endCall()
    }
  }

  // Listen for WebRTC signals
  useEffect(() => {
    if (!userId) return

    console.log('Setting up WebRTC signal listener for user:', userId)

    // Обработчик для очистки при закрытии/обновлении страницы
    const handleBeforeUnload = () => {
      if (peerRef.current && !peerRef.current.destroyed) {
        try {
          peerRef.current.destroy()
        } catch (err) {
          console.warn('Error destroying peer on page unload:', err)
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    // Обработка изменения видимости страницы
    const handleVisibilityChange = () => {
      const isHidden = document.hidden
      console.log('Page visibility changed:', { hidden: isHidden, visibilityState: document.visibilityState })

      if (isHidden) {
        console.log('Page hidden during call - maintaining connection')
        // Можно добавить дополнительную логику если нужно
      } else {
        console.log('Page visible again')
        // Можно добавить дополнительную логику если нужно
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    const webrtcChannel = supabase
      .channel(`webrtc:${userId}`)
      .on('broadcast', { event: 'webrtc_signal' }, (payload) => {
        console.log('📡 Received WebRTC signal:', payload)
        const { signal, from } = payload.payload

        console.log('📡 Signal processing check:', {
          hasPeer: !!peerRef.current,
          peerDestroyed: peerRef.current?.destroyed,
          signalFrom: from,
          expectedFrom: targetUserId,
          signalType: signal?.type,
          shouldProcess: peerRef.current && !peerRef.current.destroyed && from === targetUserId
        })

        // Проверяем что сигнал от правильного пользователя
        if (from === targetUserId) {
          // Если peer готов, обрабатываем сигнал
          if (peerRef.current && !peerRef.current.destroyed) {
            try {
              // Проверяем состояние peer connection
              const peerState = (peerRef.current as any)._pc?.connectionState || 'unknown'
              console.log('✅ Processing signal from', from, 'Peer state:', peerState, 'Signal type:', signal.type)

              // Разрешаем обработку сигналов в большинстве состояний для лучшей надежности
              if (peerState === 'closed') {
                console.log('Peer connection closed, ignoring signal')
                return
              }

              // Для failed состояния пробуем обработать, возможно поможет восстановиться
              if (peerState === 'failed') {
                console.log('Peer connection failed, but trying to process signal for recovery')
              }

              console.log(`🔄 [User ${userId?.slice(0, 8)}] Processing ${signal.type} signal from ${from.slice(0, 8)}`)
              peerRef.current.signal(signal)
            } catch (err) {
              console.error('Error processing signal:', err)

              // Игнорируем определенные типы ошибок
              if (err instanceof Error) {
                if (err.message.includes('destroyed')) {
                  console.log('Peer already destroyed, ignoring signal')
                } else if (err.message.includes('InvalidStateError') || err.message.includes('wrong state')) {
                  console.log('Invalid peer state for signal, ignoring')
                } else if (err.message.includes('already have a remote') || err.message.includes('remote description')) {
                  console.log('Remote description already set, ignoring duplicate signal')
                } else {
                  // Для других ошибок логируем и игнорируем
                  console.warn('Unexpected peer error:', err.message)
                }
              }
            }
          } else {
            // Peer не готов - буферизуем сигнал для последующей обработки
            console.log(`📦 [User ${userId?.slice(0, 8)}] Buffering ${signal.type} signal from ${from.slice(0, 8)} (peer not ready)`)
            signalBufferRef.current.push({ signal, from })
            console.log(`📦 [User ${userId?.slice(0, 8)}] Buffer size: ${signalBufferRef.current.length}`)
          }
        } else {
          console.log('Ignoring signal - wrong sender:', {
            from: from?.slice(0, 8),
            expectedFrom: targetUserId?.slice(0, 8)
          })
        }
      })
      .subscribe()

    return () => {
      console.log('Cleaning up WebRTC signal listener')
      // Очищаем буфер сигналов при смене targetUserId или размонтировании
      if (signalBufferRef.current.length > 0) {
        console.log(`🗑️ [User ${userId?.slice(0, 8)}] Clearing signal buffer (${signalBufferRef.current.length} signals)`)
        signalBufferRef.current = []
      }
      supabase.removeChannel(webrtcChannel)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [userId, targetUserId, supabase])

  // Initialize peer when starting a call (только после принятия звонка)
  useEffect(() => {
    console.log(`🔍 [User ${userId?.slice(0, 8)}] Caller peer initialization check:`, {
      isInCall,
      isCalling,
      isCallActive,
      hasPeer: !!peerRef.current,
      originalCondition: isInCall && isCalling && !peerRef.current,
      newCondition: isInCall && isCalling && isCallActive && !peerRef.current,
      targetUserId: targetUserId?.slice(0, 8)
    })
    
    // Caller должен ждать принятия звонка (isCallActive = true)
    if (isInCall && isCalling && isCallActive && !peerRef.current) {
      console.log(`✅ [User ${userId?.slice(0, 8)}] Initializing peer as caller (call accepted)`)
      initializePeer(true) // Caller is initiator
    } else if (isInCall && isCalling && !isCallActive) {
      console.log(`⏳ [User ${userId?.slice(0, 8)}] Caller waiting for call acceptance...`)
    }
  }, [isInCall, isCalling, isCallActive])

  // Initialize peer when receiving call
  useEffect(() => {
    console.log(`🔍 [User ${userId?.slice(0, 8)}] Receiver peer initialization check:`, {
      isInCall,
      isCallActive,
      isCalling,
      isReceivingCall,
      hasPeer: !!peerRef.current,
      callerId: callerId?.slice(0, 8),
      targetUserId: targetUserId?.slice(0, 8),
      conditions: {
        original: isInCall && isCallActive && !isCalling && !peerRef.current,
        simplified: isInCall && !isCalling && !peerRef.current,
        new: isReceivingCall && !peerRef.current
      }
    })
    
    // Новая стратегия: инициализируем peer сразу при получении входящего звонка
    if (isReceivingCall && !peerRef.current && callerId) {
      console.log(`✅ [User ${userId?.slice(0, 8)}] Initializing peer as receiver (on incoming call)`)
      console.log(`🎯 [User ${userId?.slice(0, 8)}] Setting targetUserId to ${callerId.slice(0, 8)} before peer init`)
      
      // Устанавливаем targetUserId как callerId СНАЧАЛА
      setTargetUserId(callerId)
      
      // Даем немного времени на обновление состояния
      setTimeout(() => {
        if (!peerRef.current) {
          console.log(`🎯 [User ${userId?.slice(0, 8)}] Delayed peer initialization as receiver`)
          initializePeer(false) // Receiver is not initiator
        }
      }, 50)
    } 
    // ОСНОВНОЙ Fallback: если в звонке, НЕ caller, и нет peer - это receiver!
    else if (isInCall && !isCalling && isCallActive && !peerRef.current && targetUserId) {
      console.log(`✅ [User ${userId?.slice(0, 8)}] Initializing peer as receiver (main fallback - call active)`)
      initializePeer(false) // Receiver is not initiator
    }
    // Дополнительный fallback: просто в звонке и не caller
    else if (isInCall && !isCalling && !peerRef.current) {
      console.log(`✅ [User ${userId?.slice(0, 8)}] Initializing peer as receiver (simple fallback)`)
      initializePeer(false) // Receiver is not initiator
    } else {
      console.log(`❌ [User ${userId?.slice(0, 8)}] Receiver peer initialization skipped`)
    }
  }, [isInCall, isCalling, isCallActive, isReceivingCall, callerId || '', targetUserId || ''])

  // Cleanup on unmount or call end
  useEffect(() => {
    return () => {
      console.log('🧹 useWebRTC: Starting cleanup on unmount')
      
      // Останавливаем все интервалы и таймауты
      stopKeepAlive()
      stopConnectionMonitoring()
      resetReconnectionCounter()
      
      if (peerRef.current && !peerRef.current.destroyed) {
        try {
          console.log('🧹 useWebRTC: Cleaning up peer connection')

          // Устанавливаем флаг, что соединение уничтожается
          const peerToDestroy = peerRef.current
          peerRef.current = null

          // Даем время на завершение текущих операций
          setTimeout(() => {
            if (peerToDestroy && !peerToDestroy.destroyed) {
              peerToDestroy.destroy()
            }
          }, 100)
        } catch (err) {
          console.log('🧹 useWebRTC: Peer cleanup error:', err)
        }
      }
    }
  }, [])

  // Принудительная очистка peer при изменении состояния звонка
  useEffect(() => {
    if (!isInCall && peerRef.current) {
      console.log(`🧹 [User ${userId?.slice(0, 8)}] Call ended, force cleanup peer`)
      
      // Останавливаем все процессы
      stopKeepAlive()
      stopConnectionMonitoring()
      resetReconnectionCounter()
      
      try {
        if (!peerRef.current.destroyed) {
          peerRef.current.destroy()
        }
      } catch (err) {
        console.log('🧹 Force cleanup error:', err)
      }
      peerRef.current = null
    }
  }, [isInCall])

  // Дополнительная проверка - принудительная инициализация peer для receiver
  useEffect(() => {
    const forceReceiverPeerInit = setTimeout(() => {
      if (isInCall && !isCalling && !peerRef.current && targetUserId) {
        console.log(`🔄 [User ${userId?.slice(0, 8)}] FORCE initializing peer as receiver after 2s delay`)
        initializePeer(false)
      }
    }, 2000)

    return () => clearTimeout(forceReceiverPeerInit)
  }, [isInCall, isCalling, targetUserId || ''])

  return {
    peer: peerRef.current
  }
}

export default useWebRTC
