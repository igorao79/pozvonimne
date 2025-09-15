'use client'

import { useCallback } from 'react'
import useCallStore from '@/store/useCallStore'

export const useScreenShare = () => {
  const {
    isScreenSharing,
    screenStream,
    setScreenStream,
    startScreenShare,
    toggleScreenShare,
    stopScreenShare,
    peer,
    userId,
    targetUserId
  } = useCallStore()

  // Функция для ожидания готовности peer connection
  const waitForPeerReady = useCallback(async (maxWaitTime = 5000): Promise<boolean> => {
    return new Promise((resolve) => {
      const checkInterval = 100
      let waited = 0
      
      const checkPeer = () => {
        if (peer && !peer.destroyed && peer.connected) {
          resolve(true)
          return
        }
        
        waited += checkInterval
        if (waited >= maxWaitTime) {
          resolve(false)
          return
        }
        
        setTimeout(checkPeer, checkInterval)
      }
      
      checkPeer()
    })
  }, [peer])

  // Функция для добавления video трека к существующему peer connection
  const addVideoTrackToPeer = useCallback(async (videoTrack: MediaStreamTrack, stream: MediaStream): Promise<boolean> => {
    if (!peer || peer.destroyed || !peer.connected) {
      console.warn('📺 Peer not ready for adding video track')
      return false
    }

    try {
      const pc = (peer as any)._pc
      if (!pc) {
        console.warn('📺 RTCPeerConnection not available')
        return false
      }

      console.log('📺 Adding screen video track to peer connection...')

      // Добавляем track к RTCPeerConnection
      const sender = pc.addTrack(videoTrack, stream)
      console.log('📺 Screen video track added via addTrack:', {
        sender: !!sender,
        trackId: videoTrack.id,
        streamId: stream.id
      })

      // Ожидаем небольшую задержку для стабилизации
      await new Promise(resolve => setTimeout(resolve, 100))

      // Создаем новый offer для renegotiation
      console.log('📺 Creating offer for screen sharing renegotiation...')
      
      const offer = await pc.createOffer({
        iceRestart: false,
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      })

      console.log('📺 Created offer for screen sharing:', {
        type: offer.type,
        hasVideo: offer.sdp?.includes('m=video'),
        hasAudio: offer.sdp?.includes('m=audio'),
        sdpVideoLines: (offer.sdp?.match(/m=video/g) || []).length
      })

      // Устанавливаем локальное описание
      await pc.setLocalDescription(offer)
      console.log('📺 Set local description for screen sharing')

      // Отправляем сигнал через SimplePeer
      if (typeof (peer as any).emit === 'function') {
        console.log('📺 Sending screen sharing offer signal via SimplePeer')
        ;(peer as any).emit('signal', offer)
      }

      return true

    } catch (err: any) {
      console.warn('📺 Failed to add video track and renegotiate:', err)
      return false
    }
  }, [peer])

  // Начать демонстрацию экрана
  const startScreenShareLocal = useCallback(async () => {
    try {
      console.log('📺 Starting screen share...')

      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 30, max: 30 }
        },
        audio: false // Отключаем аудио для упрощения
      })

      console.log('📺 Screen share stream obtained:', {
        id: displayStream.id,
        videoTracks: displayStream.getVideoTracks().length,
        audioTracks: displayStream.getAudioTracks().length
      })

      const videoTrack = displayStream.getVideoTracks()[0]
      if (!videoTrack) {
        throw new Error('No video track found in screen share stream')
      }

      // Добавляем обработчик окончания демонстрации
      videoTrack.onended = () => {
        console.log('📺 Screen share ended by user')
        stopScreenShare()
      }

      // Устанавливаем состояние screen sharing в true
      console.log('📺 Setting screen sharing state to true...')
      startScreenShare()

      // Сохраняем stream в store
      console.log('📺 Setting screen stream in store...')
      setScreenStream(displayStream)

      // Проверяем готовность peer connection
      console.log('📺 Checking peer readiness for screen sharing...')
      const isPeerReady = await waitForPeerReady(3000) // ждем до 3 секунд

      if (isPeerReady) {
        console.log('📺 Peer is ready, adding video track...')
        const success = await addVideoTrackToPeer(videoTrack, displayStream)
        
        if (success) {
          console.log('📺 Screen sharing successfully started and transmitted')
        } else {
          console.warn('📺 Failed to add video track to peer, but screen sharing is local only')
        }
      } else {
        console.warn('📺 Peer not ready within timeout, screen sharing will be local only')
        console.log('📺 Peer state:', {
          hasPeer: !!peer,
          destroyed: peer?.destroyed,
          connected: peer?.connected
        })
      }

    } catch (err) {
      console.error('📺 Error starting screen share:', err)
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          alert('Доступ к демонстрации экрана запрещен. Разрешите доступ в настройках браузера.')
        } else if (err.name === 'NotFoundError') {
          alert('Демонстрация экрана не поддерживается на этом устройстве.')
        } else {
          alert(`Ошибка демонстрации экрана: ${err.message}`)
        }
      }
      // Сбрасываем состояние в случае ошибки
      setScreenStream(null)
      stopScreenShare()
    }
  }, [peer, setScreenStream, stopScreenShare, startScreenShare, waitForPeerReady, addVideoTrackToPeer])

  // Функция для удаления video трека из peer connection
  const removeVideoTrackFromPeer = useCallback(async (): Promise<boolean> => {
    if (!peer || peer.destroyed || !screenStream) {
      console.log('📺 No peer or screen stream to remove tracks from')
      return false
    }

    try {
      console.log('📺 Removing screen tracks from peer connection...')

      // Для SimplePeer нужно использовать специальный подход
      // Вместо прямого доступа к RTCPeerConnection, попробуем создать новый offer без видео
      const pc = (peer as any)._pc

      if (pc && typeof pc.createOffer === 'function') {
        try {
          console.log('📺 Creating new offer without video tracks...')

          // Небольшая задержка для стабилизации
          await new Promise(resolve => setTimeout(resolve, 100))

          const offer = await pc.createOffer({
            iceRestart: false,
            offerToReceiveAudio: true,
            offerToReceiveVideo: false // Устанавливаем false для видео
          })

          console.log('📺 Created offer without video:', {
            type: offer.type,
            hasVideo: offer.sdp?.includes('m=video'),
            hasAudio: offer.sdp?.includes('m=audio')
          })

          await pc.setLocalDescription(offer)
          console.log('📺 Set local description for track removal')

          // Отправляем сигнал через SimplePeer
          if (typeof (peer as any).emit === 'function') {
            console.log('📺 Sending track removal offer signal via SimplePeer')
            ;(peer as any).emit('signal', offer)
          }

          return true
        } catch (offerError) {
          console.warn('📺 Failed to create offer for track removal:', offerError)
        }
      }

      // Fallback: попробуем старый метод с getSenders
      if (pc && typeof pc.getSenders === 'function') {
        console.log('📺 Using fallback method with getSenders...')
        const senders = pc.getSenders()
        let tracksRemoved = 0

        // Найдем и удалим все video треки, связанные с screen sharing
        for (const sender of senders) {
          if (sender.track && sender.track.kind === 'video') {
            // Проверяем, принадлежит ли трек нашему screen stream
            const belongsToScreenStream = screenStream.getTracks().some(track => track === sender.track)

            if (belongsToScreenStream) {
              try {
                pc.removeTrack(sender)
                tracksRemoved++
                console.log('📺 Removed screen track sender:', {
                  trackId: sender.track.id,
                  trackKind: sender.track.kind
                })
              } catch (removeError) {
                console.warn('📺 Failed to remove track:', removeError)
              }
            }
          }
        }

        console.log('📺 Screen tracks removed from peer connection:', tracksRemoved)

        // Если удалили треки, попробуем создать новый offer
        if (tracksRemoved > 0) {
          try {
            await new Promise(resolve => setTimeout(resolve, 100))
            const offer = await pc.createOffer({
              iceRestart: false,
              offerToReceiveAudio: true,
              offerToReceiveVideo: false
            })

            await pc.setLocalDescription(offer)
            console.log('📺 Created fallback offer after track removal')

            if (typeof (peer as any).emit === 'function') {
              ;(peer as any).emit('signal', offer)
            }
          } catch (fallbackError) {
            console.warn('📺 Fallback offer creation failed:', fallbackError)
          }
        }

        return tracksRemoved > 0
      }

      console.warn('📺 No suitable method found for removing screen tracks')
      return false

    } catch (err: any) {
      console.warn('📺 Error removing screen tracks from peer:', err)
      return false
    }
  }, [peer, screenStream])

  // Остановить демонстрацию экрана
  const handleStopScreenShare = useCallback(async () => {
    console.log('📺 Stopping screen share...')

    // Сначала удаляем треки из peer connection
    let tracksRemoved = false
    if (peer && !peer.destroyed && screenStream) {
      console.log('📺 Removing screen tracks from WebRTC peer...')
      tracksRemoved = await removeVideoTrackFromPeer()
    }

    // Останавливаем все треки в local stream
    if (screenStream) {
      screenStream.getTracks().forEach(track => {
        track.stop()
        console.log('📺 Stopped screen track:', track.id)
      })
    }

    // Отправляем явный сигнал о прекращении демонстрации экрана
    if (peer && !peer.destroyed && tracksRemoved) {
      try {
        console.log('📺 Sending explicit screen share stop signal...')

        // Создаем специальный сигнал через data channel
        if (typeof (peer as any).send === 'function') {
          const stopSignal = {
            type: 'screen_share_stopped',
            timestamp: Date.now(),
            userId
          }
          ;(peer as any).send(JSON.stringify(stopSignal))
          console.log('📺 Explicit stop signal sent via data channel')
        }
      } catch (signalError) {
        console.warn('📺 Failed to send explicit stop signal:', signalError)
      }
    }

    // Очищаем состояние
    stopScreenShare()
    setScreenStream(null)
  }, [peer, screenStream, stopScreenShare, removeVideoTrackFromPeer, setScreenStream, userId])

  // Переключить демонстрацию экрана
  const handleToggleScreenShare = useCallback(async () => {
    console.log('📺 Toggle screen share called:', {
      currentState: isScreenSharing,
      hasScreenStream: !!screenStream
    })

    if (isScreenSharing) {
      console.log('📺 Stopping screen share...')
      handleStopScreenShare()
    } else {
      console.log('📺 Starting screen share...')
      await startScreenShareLocal()
    }
  }, [isScreenSharing, handleStopScreenShare, startScreenShareLocal, screenStream])

  return {
    isScreenSharing,
    screenStream,
    startScreenShare: startScreenShareLocal,
    stopScreenShare: handleStopScreenShare,
    toggleScreenShare: handleToggleScreenShare
  }
}

export default useScreenShare
