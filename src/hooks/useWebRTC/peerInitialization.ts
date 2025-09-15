import SimplePeer from 'simple-peer'
import type { PeerRefs, SimplePeerConfig } from './types'
import useCallStore from '@/store/useCallStore'
import { getPeerConfig, getOfferOptions, getAnswerOptions, getChannelConfig, getAudioConstraints } from './peerConfig'
import { sendSignal } from './signalHandlers'
import { startKeepAlive, stopKeepAlive, handleKeepAliveMessage } from './keepAlive'
import { startConnectionMonitoring, stopConnectionMonitoring } from './connectionMonitor'
import { resetReconnectionCounter, handlePeerError, handlePeerClose } from './reconnection'

// Функция для инициализации peer соединения
export const initializePeer = async (
  isInitiator: boolean,
  peerRefs: PeerRefs,
  userId: string | null,
  targetUserId: string | null,
  isCallActive: boolean,
  processBufferedSignals: () => void
) => {
  const { setLocalStream, setRemoteStream, setRemoteScreenStream, setPeer, setIsCallActive, setError, endCall } = useCallStore.getState()

  try {
    // Предотвращаем создание нескольких peer соединений
    if (peerRefs.peerRef.current && !peerRefs.peerRef.current.destroyed) {
      console.log('Peer already exists, destroying old one')
      try {
        peerRefs.peerRef.current.destroy()
      } catch (err) {
        console.warn('Error destroying old peer:', err)
      }
      peerRefs.peerRef.current = null
    }

    console.log('Requesting microphone access...')
    console.log('HTTPS check:', window.location.protocol === 'https:')
    console.log('User agent:', navigator.userAgent)

    const constraints = getAudioConstraints()
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

    // Создаем конфигурацию peer
    const peerConfig: SimplePeerConfig = {
      initiator: isInitiator,
      trickle: true,
      stream,
      config: getPeerConfig(),
      offerOptions: getOfferOptions(),
      answerOptions: getAnswerOptions(),
      allowHalfTrickle: true,
      objectMode: false,
      channelConfig: getChannelConfig(),
      channelName: `datachannel-${userId}-${Date.now()}`
    }

    const peer = new SimplePeer(peerConfig)

    // Обработчик ошибок
    peer.on('error', (err) => {
      handlePeerError(err, peerRefs, userId, targetUserId, useCallStore.getState().isInCall, (isInit) => initializePeer(isInit, peerRefs, userId, targetUserId, isCallActive, processBufferedSignals))
    })

    // Обработчик сигналов
    peer.on('signal', async (data) => {
      await sendSignal(data, peerRefs, userId, targetUserId)
    })

    // Обработчик подключения
    peer.on('connect', () => {
      console.log('Peer connected!')
      setIsCallActive(true)

      // Сбрасываем счетчик переподключений при успешном соединении
      resetReconnectionCounter(peerRefs)

      // Запускаем keep-alive и мониторинг
      startKeepAlive(peerRefs, userId, targetUserId, isCallActive)
      startConnectionMonitoring(peerRefs, userId, () => {
        // Функция переподключения
        const { isInCall: currentIsInCall, targetUserId: currentTargetUserId } = useCallStore.getState()
        attemptReconnection(peerRefs, userId, currentIsInCall, currentTargetUserId, (isInit) => initializePeer(isInit, peerRefs, userId, currentTargetUserId, isCallActive, processBufferedSignals))
      })
    })

    // Обработчик ICE состояний
    peer.on('iceStateChange', (state) => {
      console.log('ICE state changed:', state)
    })

    peer.on('iceCandidate', (candidate) => {
      console.log('New ICE candidate:', candidate)
    })

    // Обработчик получения данных через data channel
    peer.on('data', (data) => {
      const message = data.toString()

      // Проверяем, является ли сообщение сигналом о прекращении демонстрации экрана
      try {
        const parsedMessage = JSON.parse(message)
        if (parsedMessage.type === 'screen_share_stopped') {
          console.log('📺 Received explicit screen share stop signal:', parsedMessage)
          setRemoteScreenStream(null)
          return
        }
      } catch (e) {
        // Не JSON сообщение, обрабатываем как keep-alive
      }

      handleKeepAliveMessage(message, peerRefs, userId)
    })

    // Функция для очистки screen stream при отсутствии video треков
    const clearScreenStreamIfNoVideoTracks = () => {
      const pc = (peer as any)._pc
      if (pc && typeof pc.getReceivers === 'function') {
        const receivers = pc.getReceivers()
        const videoReceivers = receivers.filter((receiver: any) =>
          receiver.track && receiver.track.kind === 'video' && receiver.track.readyState === 'live'
        )

        if (videoReceivers.length === 0) {
          console.log('📺 No active video receivers found, clearing remote screen stream')
          setRemoteScreenStream(null)
        }
      }
    }

    // Добавляем обработчик для отслеживания изменений в RTCPeerConnection
    const pc = (peer as any)._pc
    if (pc) {
      // Отслеживаем изменения в remote description
      const originalSetRemoteDescription = pc.setRemoteDescription
      pc.setRemoteDescription = async (description: any) => {
        const result = await originalSetRemoteDescription.call(pc, description)

        // Проверяем, есть ли video треки в новом SDP
        const hasVideoTracks = description.sdp?.includes('m=video') &&
                              !description.sdp?.includes('m=video 0') // Проверяем что video не отключен

        console.log('📺 SDP analysis after setRemoteDescription:', {
          type: description.type,
          hasVideoInSDP: hasVideoTracks,
          sdpVideoLines: (description.sdp?.match(/m=video/g) || []).length
        })

        // Если в новом SDP нет video треков, очищаем screen stream
        if (!hasVideoTracks) {
          console.log('📺 No video tracks in new SDP, clearing remote screen stream')
          setRemoteScreenStream(null)
        }

        return result
      }
    }

    // Обработчик получения remote stream
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

      // Проверяем remote tracks (audio + video для screen sharing)
      const remoteAudioTracks = remoteStream.getAudioTracks()
      const remoteVideoTracks = remoteStream.getVideoTracks()

      console.log('Remote tracks:', {
        audio: remoteAudioTracks.length,
        video: remoteVideoTracks.length
      })

      // Обрабатываем audio tracks
      remoteAudioTracks.forEach((track, index) => {
        console.log(`Remote audio track ${index}:`, {
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          constraints: track.getConstraints(),
          settings: track.getSettings()
        })

        // Добавляем обработчики событий для трека (без onended, чтобы не ломать соединение)
        // track.onended = () => console.log(`Remote audio track ${index} ended`)
        track.onmute = () => console.log(`Remote audio track ${index} muted`)
        track.onunmute = () => console.log(`Remote audio track ${index} unmuted`)
      })

      // Обрабатываем video tracks (для screen sharing)
      remoteVideoTracks.forEach((track, index) => {
        console.log(`Remote video track ${index}:`, {
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          label: track.label
        })

        // ВАЖНО: Добавляем обработчики событий для правильной работы screen sharing
        track.onended = () => {
          console.log(`📺 Remote video track ${index} ended - checking remaining tracks`)
          
          // Проверяем есть ли еще активные video треки в текущем stream
          const currentRemoteScreenStream = useCallStore.getState().remoteScreenStream
          if (currentRemoteScreenStream) {
            const remainingActiveTracks = currentRemoteScreenStream.getVideoTracks().filter(t => 
              t.readyState === 'live' && t.enabled && t.id !== track.id
            )
            
            if (remainingActiveTracks.length === 0) {
              console.log(`📺 No more active video tracks, clearing remote screen stream`)
              setRemoteScreenStream(null)
            } else {
              console.log(`📺 ${remainingActiveTracks.length} active tracks remaining, keeping stream`)
            }
          }
        }
        
        track.onmute = () => {
          console.log(`📺 Remote video track ${index} muted`)
          // Не очищаем stream при mute, так как это временное состояние
        }
        
        track.onunmute = () => {
          console.log(`📺 Remote video track ${index} unmuted`)
        }

        // Обработка изменения состояния готовности трека
        track.addEventListener('readystatechange', () => {
          console.log(`📺 Remote video track ${index} ready state changed:`, track.readyState)
          if (track.readyState === 'ended') {
            console.log(`📺 Remote video track ${index} ended via readyState - checking remaining tracks`)
            
            // Проверяем есть ли еще активные video треки
            const currentRemoteScreenStream = useCallStore.getState().remoteScreenStream
            if (currentRemoteScreenStream) {
              const remainingActiveTracks = currentRemoteScreenStream.getVideoTracks().filter(t => 
                t.readyState === 'live' && t.enabled && t.id !== track.id
              )
              
              if (remainingActiveTracks.length === 0) {
                console.log(`📺 No more active video tracks via readyState, clearing remote screen stream`)
                setRemoteScreenStream(null)
              } else {
                console.log(`📺 ${remainingActiveTracks.length} active tracks remaining via readyState, keeping stream`)
              }
            }
          }
        })
      })

      // Создаем отдельные streams для audio и screen sharing
      if (remoteAudioTracks.length > 0) {
        const audioStream = new MediaStream(remoteAudioTracks)
        setRemoteStream(audioStream)
        console.log('Set remote audio stream:', audioStream.id)
      }

      // Обрабатываем video tracks для screen sharing
      if (remoteVideoTracks.length > 0) {
        // Проверяем что треки активны
        const activeTracks = remoteVideoTracks.filter(track =>
          track.readyState === 'live' && track.enabled
        )

        if (activeTracks.length > 0) {
          const screenStream = new MediaStream(activeTracks)
          setRemoteScreenStream(screenStream)
          console.log('📺 Set remote screen stream:', {
            streamId: screenStream.id,
            activeTracks: activeTracks.length,
            totalTracks: remoteVideoTracks.length
          })
        } else {
          console.log('📺 No active video tracks found, clearing remote screen stream')
          setRemoteScreenStream(null)
        }
      } else {
        // Если нет video треков, очищаем screen stream
        console.log('📺 No video tracks in remote stream - clearing screen stream')
        setRemoteScreenStream(null)
      }

      // Дополнительная проверка: если все video треки завершились или отключены, очищаем screen stream
      const allVideoTracksInactive = remoteVideoTracks.every(track =>
        track.readyState === 'ended' || !track.enabled
      )

      if (remoteVideoTracks.length > 0 && allVideoTracksInactive) {
        console.log('📺 All remote video tracks ended/disabled, clearing screen stream')
        setRemoteScreenStream(null)
      }

      // Также очищаем screen stream, если это явно указано в track labels (дополнительная проверка)
      const hasScreenShareLabel = remoteVideoTracks.some(track =>
        track.label && track.label.toLowerCase().includes('screen')
      )

      const activeTracks = remoteVideoTracks.filter(track =>
        track.readyState === 'live' && track.enabled
      )

      if (remoteVideoTracks.length > 0 && !hasScreenShareLabel && activeTracks.length === 0) {
        console.log('📺 No screen share tracks detected, clearing screen stream')
        setRemoteScreenStream(null)
      }
    })

    // Обработчик закрытия соединения
    peer.on('close', () => {
      console.log('🧹 Clearing signal buffer on peer close')
      peerRefs.signalBufferRef.current = [] // Очищаем буфер сигналов при закрытии
      handlePeerClose(peerRefs, userId, stopKeepAlive, stopConnectionMonitoring)
    })

    peerRefs.peerRef.current = peer
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

// Импорт функции переподключения
const attemptReconnection = (
  peerRefs: PeerRefs,
  userId: string | null,
  isInCall: boolean,
  targetUserId: string | null,
  initializePeerFunc: (isInitiator: boolean) => Promise<void>
) => {
  // Импортируем функцию из reconnection.ts
  const { attemptReconnection: attemptReconn } = require('./reconnection')
  return attemptReconn(peerRefs, userId, isInCall, targetUserId, initializePeerFunc)
}
 