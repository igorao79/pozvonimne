'use client'

import { useEffect, useRef } from 'react'
import SimplePeer from 'simple-peer'
import useCallStore from '@/store/useCallStore'
import { createClient } from '@/utils/supabase/client'

const useWebRTC = () => {
  const peerRef = useRef<SimplePeer.Instance | null>(null)
  const supabase = createClient()
  
  const {
    userId,
    targetUserId,
    isInCall,
    isCalling,
    isCallActive,
    setLocalStream,
    setRemoteStream,
    setPeer,
    setIsCallActive,
    setError,
    endCall
  } = useCallStore()

  // Оптимизированная конфигурация ICE серверов для быстрого соединения
  const iceServers = [
    // Быстрые STUN серверы
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    // Надежные TURN серверы (бесплатные)
    {
      urls: ['turn:openrelay.metered.ca:80', 'turn:openrelay.metered.ca:443'],
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    // Дополнительные STUN серверы
    { urls: 'stun:stun.freeswitch.org' },
    { urls: 'stun:stun.xten.com' }
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

      // Get user media (только аудио)
      const constraints = {
        video: false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
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

      // Create peer connection с оптимизированной конфигурацией
      const peer = new SimplePeer({
        initiator: isInitiator,
        trickle: true, // Включаем trickle ICE для более быстрого соединения
        stream,
        config: {
          iceServers,
          iceTransportPolicy: 'all', // Пробуем все типы соединений
          bundlePolicy: 'max-bundle', // Оптимизация для лучшего качества
          rtcpMuxPolicy: 'require', // Требуем RTCP mux для лучшей производительности
          iceCandidatePoolSize: 10 // Увеличиваем пул кандидатов
        },
        offerOptions: {
          offerToReceiveAudio: true,
          offerToReceiveVideo: false
        },
        answerOptions: {
          offerToReceiveAudio: true,
          offerToReceiveVideo: false
        }
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

          console.log('Sending signal to', targetUserId, ':', data)
          // Send signal to the other user
          const targetChannel = supabase.channel(`webrtc:${targetUserId}`)
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
      })

      // Обработчик ICE кандидатов для более быстрого соединения
      peer.on('iceStateChange', (state) => {
        console.log('ICE state changed:', state)
      })

      peer.on('iceCandidate', (candidate) => {
        console.log('New ICE candidate:', candidate)
      })

      peer.on('signal', (data) => {
        console.log('Generated signal:', data.type, data)
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

      peer.on('close', () => {
        console.log('Peer connection closed')
        // Не вызываем endCall() здесь, чтобы избежать рекурсии
        // endCall() будет вызван через обработчик события в CallInterface
      })

      peerRef.current = peer
      setPeer(peer)

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
        console.log('Received WebRTC signal:', payload)
        const { signal, from } = payload.payload

        if (peerRef.current && !peerRef.current.destroyed && from === targetUserId) {
          try {
            // Проверяем состояние peer connection
            const peerState = (peerRef.current as any)._pc?.connectionState || 'unknown'
            console.log('Processing signal from', from, 'Peer state:', peerState, 'Signal type:', signal.type)

            // Не обрабатываем сигналы если соединение уже установлено или закрыто
            if (peerState === 'connected' || peerState === 'completed') {
              console.log('Peer already connected, ignoring signal')
              return
            }

            // Не обрабатываем сигналы если соединение закрыто
            if (peerState === 'closed' || peerState === 'failed') {
              console.log('Peer connection closed/failed, ignoring signal')
              return
            }

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
          console.log('Ignoring signal - no peer, peer destroyed, or wrong sender:', {
            hasPeer: !!peerRef.current,
            peerDestroyed: peerRef.current?.destroyed,
            peerState: (peerRef.current as any)?._pc?.connectionState,
            from,
            expectedFrom: targetUserId
          })
        }
      })
      .subscribe()

    return () => {
      console.log('Cleaning up WebRTC signal listener')
      supabase.removeChannel(webrtcChannel)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [userId, targetUserId, supabase])

  // Initialize peer when starting a call
  useEffect(() => {
    if (isInCall && isCalling && !peerRef.current) {
      console.log('Initializing peer as caller')
      initializePeer(true) // Caller is initiator
    }
  }, [isInCall, isCalling])

  // Initialize peer when accepting a call
  useEffect(() => {
    if (isInCall && isCallActive && !isCalling && !peerRef.current) {
      console.log('Initializing peer as receiver')
      initializePeer(false) // Receiver is not initiator
    }
  }, [isInCall, isCallActive, isCalling])

  // Cleanup on unmount or call end
  useEffect(() => {
    return () => {
      if (peerRef.current && !peerRef.current.destroyed) {
        try {
          console.log('Cleaning up peer connection')

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
          console.log('Peer cleanup error:', err)
        }
      }
    }
  }, [])

  return {
    peer: peerRef.current
  }
}

export default useWebRTC
