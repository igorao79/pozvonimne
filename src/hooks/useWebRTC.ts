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

  // ICE servers configuration
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ]

  const initializePeer = async (isInitiator: boolean) => {
    try {
      console.log('Requesting microphone access...')
      // Get user media (только аудио)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      
      console.log('Microphone access granted, stream:', stream)
      setLocalStream(stream)

      // Create peer connection
      const peer = new SimplePeer({
        initiator: isInitiator,
        trickle: false,
        stream,
        config: {
          iceServers
        }
      })

      peer.on('error', (err) => {
        console.error('Peer error:', err)
        setError('Ошибка соединения: ' + err.message)
        endCall()
      })

      peer.on('signal', async (data) => {
        try {
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

      peer.on('stream', (remoteStream) => {
        console.log('Received remote stream:', remoteStream)
        setRemoteStream(remoteStream)
      })

      peer.on('close', () => {
        console.log('Peer connection closed')
        endCall()
      })

      peerRef.current = peer
      setPeer(peer)

    } catch (err) {
      console.error('Error initializing peer:', err)
      setError('Не удалось получить доступ к микрофону')
      endCall()
    }
  }

  // Listen for WebRTC signals
  useEffect(() => {
    if (!userId) return

    console.log('Setting up WebRTC signal listener for user:', userId)
    const webrtcChannel = supabase
      .channel(`webrtc:${userId}`)
      .on('broadcast', { event: 'webrtc_signal' }, (payload) => {
        console.log('Received WebRTC signal:', payload)
        const { signal, from } = payload.payload
        
        if (peerRef.current && from === targetUserId) {
          try {
            console.log('Processing signal from', from, ':', signal)
            peerRef.current.signal(signal)
          } catch (err) {
            console.error('Error processing signal:', err)
          }
        } else {
          console.log('Ignoring signal - no peer or wrong sender:', { 
            hasPeer: !!peerRef.current, 
            from, 
            expectedFrom: targetUserId 
          })
        }
      })
      .subscribe()

    return () => {
      console.log('Cleaning up WebRTC signal listener')
      supabase.removeChannel(webrtcChannel)
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
          peerRef.current.destroy()
        } catch (err) {
          console.log('Peer cleanup error:', err)
        }
        peerRef.current = null
      }
    }
  }, [])

  return {
    peer: peerRef.current
  }
}

export default useWebRTC
