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
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = isMicMuted
        set({ isMicMuted: !isMicMuted })
      }
    }
  },
  
  setLocalStream: (stream) => set({ localStream: stream }),
  setRemoteStream: (stream) => set({ remoteStream: stream }),
  setPeer: (peer) => set({ peer }),
  
  // UI actions
  setTargetUserId: (userId) => set({ targetUserId: userId }),
  setError: (error) => set({ error }),
  setIsLoading: (isLoading) => set({ isLoading }),
  
  // Call management actions
  startCall: (targetUserId) => {
    set({ 
      targetUserId, 
      isCalling: true, 
      isInCall: true,
      error: null 
    })
  },
  
  acceptCall: () => {
    const { callerId } = get()
    set({ 
      isReceivingCall: false, 
      isCallActive: true, 
      isInCall: true,
      targetUserId: callerId || '', // Устанавливаем targetUserId как ID звонящего
      callerId: null,
      callerName: null
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
    const { peer, localStream } = get()
    
    // Close peer connection safely
    if (peer && !peer.destroyed) {
      try {
        peer.destroy()
      } catch (err) {
        console.log('Peer already destroyed:', err)
      }
    }
    
    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach(track => {
        try {
          track.stop()
        } catch (err) {
          console.log('Track already stopped:', err)
        }
      })
    }
    
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
      isMicMuted: false
    })
  },
  
  // Reset functions
  resetCallState: () => {
    const { peer, localStream } = get()
    
    if (peer) {
      peer.destroy()
    }
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop())
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
