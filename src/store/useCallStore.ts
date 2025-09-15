import { create } from 'zustand'
import { User } from '@supabase/supabase-js'
import SimplePeer from 'simple-peer'

interface CallState {
  // User state
  user: User | null
  userId: string | null
  isAuthenticated: boolean
  
  // Call state
  isInCall: boolean
  isCallActive: boolean
  isCalling: boolean
  isReceivingCall: boolean
  callerId: string | null
  callerName: string | null
  
  // Media state
  isMicMuted: boolean
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  peer: SimplePeer.Instance | null

  // Screen sharing state
  isScreenSharing: boolean
  screenStream: MediaStream | null
  remoteScreenStream: MediaStream | null
  
  // UI state
  targetUserId: string
  error: string | null
  isLoading: boolean
}

interface CallActions {
  // User actions
  setUser: (user: User | null) => void
  setUserId: (userId: string | null) => void
  setAuthenticated: (isAuthenticated: boolean) => void
  
  // Call actions
  setIsInCall: (isInCall: boolean) => void
  setIsCallActive: (isCallActive: boolean) => void
  setIsCalling: (isCalling: boolean) => void
  setIsReceivingCall: (isReceivingCall: boolean, callerId?: string, callerName?: string) => void
  
  // Media actions
  toggleMic: () => void
  setLocalStream: (stream: MediaStream | null) => void
  setRemoteStream: (stream: MediaStream | null) => void
  setPeer: (peer: SimplePeer.Instance | null) => void

  // Screen sharing actions
  toggleScreenShare: () => void
  setScreenStream: (stream: MediaStream | null) => void
  setRemoteScreenStream: (stream: MediaStream | null) => void
  startScreenShare: () => void
  stopScreenShare: () => void
  
  // UI actions
  setTargetUserId: (userId: string) => void
  setError: (error: string | null) => void
  setIsLoading: (isLoading: boolean) => void
  
  // Call management
  startCall: (targetUserId: string) => void
  acceptCall: () => void
  rejectCall: () => void
  endCall: () => void
  
  // Reset functions
  resetCallState: () => void
  resetAll: () => void
}

type CallStore = CallState & CallActions

const useCallStore = create<CallStore>((set, get) => ({
  // Initial state
  user: null,
  userId: null,
  isAuthenticated: false,
  
  isInCall: false,
  isCallActive: false,
  isCalling: false,
  isReceivingCall: false,
  callerId: null,
  callerName: null,
  
  isMicMuted: false,
  localStream: null,
  remoteStream: null,
  peer: null,

  isScreenSharing: false,
  screenStream: null,
  remoteScreenStream: null,
  
  targetUserId: '',
  error: null,
  isLoading: false,
  
  // User actions
  setUser: (user) => set({ user }),
  setUserId: (userId) => set({ userId }),
  setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  
  // Call actions
  setIsInCall: (isInCall) => set({ isInCall }),
  setIsCallActive: (isCallActive) => set({ isCallActive }),
  setIsCalling: (isCalling) => set({ isCalling }),
  setIsReceivingCall: (isReceivingCall, callerId, callerName) => 
    set({ isReceivingCall, callerId: callerId || null, callerName: callerName || null }),
  
  // Media actions
  toggleMic: () => {
    const { isMicMuted, localStream } = get()

    console.log('Toggling mic:', { currentState: isMicMuted, hasStream: !!localStream })

    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0]
      if (audioTrack) {
        try {
          // Если сейчас выключен - включаем, если включен - выключаем
          const newMutedState = !isMicMuted
          audioTrack.enabled = !newMutedState // enabled = true когда не muted

          console.log('Audio track state changed:', {
            wasMuted: isMicMuted,
            nowMuted: newMutedState,
            trackEnabled: audioTrack.enabled,
            trackReadyState: audioTrack.readyState
          })

          set({ isMicMuted: newMutedState })
        } catch (error) {
          console.error('Error toggling mic:', error)
          // В случае ошибки все равно обновляем состояние UI
          set({ isMicMuted: !isMicMuted })
        }
      } else {
        console.warn('No audio track found in local stream')
        // Все равно обновляем состояние UI
        set({ isMicMuted: !isMicMuted })
      }
    } else {
      console.warn('No local stream available for mic toggle')
      // Все равно обновляем состояние UI для лучшего UX
      set({ isMicMuted: !isMicMuted })
    }
  },
  
  setLocalStream: (stream) => set({ localStream: stream }),
  setRemoteStream: (stream) => set({ remoteStream: stream }),
  setPeer: (peer) => set({ peer }),

  setScreenStream: (stream) => {
    console.log('🏪 setScreenStream called:', {
      hasStream: !!stream,
      streamId: stream?.id,
      videoTracks: stream?.getVideoTracks().length
    })
    set({ screenStream: stream })
  },

  setRemoteScreenStream: (stream) => {
    console.log('🏪 setRemoteScreenStream called:', {
      hasStream: !!stream,
      streamId: stream?.id,
      videoTracks: stream?.getVideoTracks().length
    })
    set({ remoteScreenStream: stream })
  },

  startScreenShare: () => {
    console.log('🏪 startScreenShare called')
    set({ isScreenSharing: true })
  },

  toggleScreenShare: () => {
    const { isScreenSharing, screenStream } = get()

    console.log('🏪 toggleScreenShare called:', {
      currentState: isScreenSharing,
      hasScreenStream: !!screenStream
    })

    if (isScreenSharing) {
      // Останавливаем демонстрацию экрана
      console.log('🏪 Stopping screen share in store')
      if (screenStream) {
        screenStream.getTracks().forEach(track => {
          try {
            track.stop()
          } catch (err) {
            console.log('Screen track already stopped:', err)
          }
        })
      }
      set({
        isScreenSharing: false,
        screenStream: null
      })
      console.log('🏪 Screen share stopped in store')
    } else {
      // Начинаем демонстрацию экрана - логика будет в компоненте
      console.log('🏪 Starting screen share in store')
      set({ isScreenSharing: true })
      console.log('🏪 Screen share started in store')
    }
  },

  stopScreenShare: () => {
    const { screenStream } = get()

    if (screenStream) {
      screenStream.getTracks().forEach(track => {
        try {
          track.stop()
        } catch (err) {
          console.log('Screen track already stopped:', err)
        }
      })
    }

    set({
      isScreenSharing: false,
      screenStream: null
    })
  },

  // UI actions
  setTargetUserId: (userId) => set({ targetUserId: userId }),
  setError: (error) => set({ error }),
  setIsLoading: (isLoading) => set({ isLoading }),
  
  // Call management actions
  startCall: (targetUserId) => {
    console.log('🚀 StartCall: Starting new call to', targetUserId.slice(0, 8))
    
    // Очищаем предыдущее состояние перед новым звонком
    const { peer, localStream, remoteStream } = get()
    
    if (peer && !peer.destroyed) {
      console.log('🚀 StartCall: Cleaning up old peer')
      try {
        peer.destroy()
      } catch (err) {
        console.log('🚀 StartCall: Error destroying old peer:', err)
      }
    }
    
    // Останавливаем старые потоки
    if (localStream) {
      console.log('🚀 StartCall: Stopping old local stream')
      localStream.getTracks().forEach(track => track.stop())
    }
    
    console.log('🚀 StartCall: Setting new call state')
    set({
      // Очищаем все предыдущее состояние
      peer: null,
      localStream: null,
      remoteStream: null,
      isCallActive: false, // Оставляем false, чтобы показать лоадер пока второй не примет
      isReceivingCall: false,
      callerId: null,
      callerName: null,
      isMicMuted: false,
      error: null,
      // Устанавливаем новое состояние
      targetUserId,
      isCalling: true,
      isInCall: true
    })

    console.log('🚀 StartCall: New outgoing call initiated, waiting for acceptance...')
  },
  
  acceptCall: () => {
    const { callerId } = get()
    console.log('📞 Accepting call - before state change:', {
      callerId,
      currentState: {
        isInCall: get().isInCall,
        isCallActive: get().isCallActive,
        isCalling: get().isCalling,
        isReceivingCall: get().isReceivingCall
      }
    })
    
    set({ 
      isReceivingCall: false, 
      isCallActive: true, 
      isInCall: true,
      isCalling: false, // Явно устанавливаем в false для принимающей стороны
      targetUserId: callerId || '', // Устанавливаем targetUserId как ID звонящего
      callerId: null,
      callerName: null
    })
    
    console.log('📞 Accepting call - after state change:', {
      newState: {
        isInCall: get().isInCall,
        isCallActive: get().isCallActive,
        isCalling: get().isCalling,
        isReceivingCall: get().isReceivingCall,
        targetUserId: get().targetUserId
      }
    })
  },
  
  rejectCall: () => {
    set({ 
      isReceivingCall: false, 
      callerId: null,
      callerName: null
    })
  },
  
  endCall: () => {
    const { peer, localStream, screenStream } = get()

    console.log('🔚 EndCall: Starting cleanup process')

    // Close peer connection safely
    if (peer && !peer.destroyed) {
      try {
        console.log('🔚 EndCall: Destroying peer connection from store')
        peer.destroy()
      } catch (err) {
        console.log('🔚 EndCall: Peer already destroyed:', err)
      }
    }

    // Stop local stream
    if (localStream) {
      console.log('🔚 EndCall: Stopping local stream tracks')
      localStream.getTracks().forEach(track => {
        try {
          track.stop()
        } catch (err) {
          console.log('🔚 EndCall: Track already stopped:', err)
        }
      })
    }

    // Stop screen sharing
    if (screenStream) {
      console.log('🔚 EndCall: Stopping screen sharing tracks')
      screenStream.getTracks().forEach(track => {
        try {
          track.stop()
        } catch (err) {
          console.log('🔚 EndCall: Screen track already stopped:', err)
        }
      })
    }

    // Очищаем буфер сигналов в useWebRTC hook
    // Это нужно сделать через callback или напрямую в hook

    console.log('🔚 EndCall: Resetting all call state')
    set({
      isInCall: false,
      isCallActive: false,
      isCalling: false,
      isReceivingCall: false,
      callerId: null,
      callerName: null,
      peer: null,
      localStream: null,
      remoteStream: null,
      isMicMuted: false,
      isScreenSharing: false,
      screenStream: null,
      remoteScreenStream: null,
      targetUserId: '', // ВАЖНО: очищаем targetUserId
      error: null
    })

    console.log('🔚 EndCall: Cleanup completed')
  },
  
  // Reset functions
  resetCallState: () => {
    const { peer, localStream, screenStream } = get()

    if (peer) {
      peer.destroy()
    }

    if (localStream) {
      localStream.getTracks().forEach(track => track.stop())
    }

    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop())
    }

    set({
      isInCall: false,
      isCallActive: false,
      isCalling: false,
      isReceivingCall: false,
      callerId: null,
      callerName: null,
      isMicMuted: false,
      localStream: null,
      remoteStream: null,
      peer: null,
      isScreenSharing: false,
      screenStream: null,
      remoteScreenStream: null,
      targetUserId: '',
      error: null
    })
  },
  
  resetAll: () => {
    get().resetCallState()
    set({
      user: null,
      userId: null,
      isAuthenticated: false,
      isLoading: false
    })
  }
}))

export default useCallStore
