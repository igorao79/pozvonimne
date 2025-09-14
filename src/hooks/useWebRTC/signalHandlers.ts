import SimplePeer from 'simple-peer'
import type { SignalMessage, PeerRefs } from './types'
import useCallStore from '@/store/useCallStore'
import { createClient } from '@/utils/supabase/client'

// Функция для обработки буферизованных сигналов
export const processBufferedSignals = (
  peerRefs: PeerRefs,
  userId: string | null
) => {
  const { signalBufferRef, peerRef } = peerRefs
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

// Функция для буферизации сигналов
export const bufferSignal = (
  signal: any,
  from: string,
  peerRefs: PeerRefs,
  userId: string | null
) => {
  const { signalBufferRef, peerRef } = peerRefs

  console.log(`📦 [User ${userId?.slice(0, 8)}] Buffering ${signal.type} signal from ${from.slice(0, 8)} (peer not ready)`)
  signalBufferRef.current.push({ signal, from })
  console.log(`📦 [User ${userId?.slice(0, 8)}] Buffer size: ${signalBufferRef.current.length}`)
}

// Функция для обработки входящих сигналов
export const handleIncomingSignal = async (
  payload: any,
  peerRefs: PeerRefs,
  userId: string | null,
  targetUserId: string | null
) => {
  console.log('📡 Received WebRTC signal:', payload)
  const { signal, from } = payload.payload

  console.log('📡 Signal processing check:', {
    hasPeer: !!peerRefs.peerRef.current,
    peerDestroyed: peerRefs.peerRef.current?.destroyed,
    signalFrom: from,
    expectedFrom: targetUserId,
    signalType: signal?.type,
    shouldProcess: peerRefs.peerRef.current && !peerRefs.peerRef.current.destroyed && from === targetUserId
  })

  // Проверяем что сигнал от правильного пользователя
  if (from === targetUserId) {
    // Если peer готов, обрабатываем сигнал
    if (peerRefs.peerRef.current && !peerRefs.peerRef.current.destroyed) {
      try {
        // Проверяем состояние peer connection
        const peerState = (peerRefs.peerRef.current as any)._pc?.connectionState || 'unknown'
        console.log('✅ Processing signal from', from, 'Peer state:', peerState, 'Signal type:', signal.type)

        // Разрешаем обработку сигналов в большинстве состояний для лучшей надежности
        if (peerState === 'closed' || peerState === 'closing') {
          console.log('Peer connection closed or closing, ignoring signal')
          return
        }

        // Для failed состояния пробуем обработать, возможно поможет восстановиться
        if (peerState === 'failed') {
          console.log('Peer connection failed, but trying to process signal for recovery')
        }

        // Проверяем, не пытаемся ли установить уже установленный answer
        if (signal.type === 'answer' && (peerRefs.peerRef.current as any)._pc?.remoteDescription) {
          // Для renegotiation (например, добавления screen sharing) позволяем новые answer
          const pc = (peerRefs.peerRef.current as any)._pc
          if (pc?.signalingState === 'have-local-offer') {
            console.log('📺 Allowing answer for renegotiation (have-local-offer state)')
          } else {
            console.log('Answer already set, ignoring duplicate answer signal')
            return
          }
        }

        // Логирование для renegotiation процессов
        if (signal.type === 'offer' || signal.type === 'answer') {
          const pc = (peerRefs.peerRef.current as any)._pc
          console.log(`📺 Processing ${signal.type} signal:`, {
            signalingState: pc?.signalingState,
            hasLocalDescription: !!pc?.localDescription,
            hasRemoteDescription: !!pc?.remoteDescription,
            isRenegotiation: signal.type === 'offer' && !!pc?.remoteDescription
          })
        }

        console.log(`🔄 [User ${userId?.slice(0, 8)}] Processing ${signal.type} signal from ${from.slice(0, 8)}`)
        peerRefs.peerRef.current.signal(signal)
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
      bufferSignal(signal, from, peerRefs, userId)
    }
  } else {
    console.log('Ignoring signal - wrong sender:', {
      from: from?.slice(0, 8),
      expectedFrom: targetUserId?.slice(0, 8)
    })
  }
}

// Функция для отправки сигнала
export const sendSignal = async (
  data: any,
  peerRefs: PeerRefs,
  userId: string | null,
  targetUserId: string | null
) => {
  try {
    // Проверяем что peer не уничтожен и соответствует текущему соединению
    if (peerRefs.peerRef.current?.destroyed) {
      console.log('Peer destroyed, not sending signal')
      return
    }

    // Проверяем состояние peer connection
    const peerState = (peerRefs.peerRef.current as any)._pc?.connectionState || 'unknown'
    if (peerState === 'closed' || peerState === 'closing' || peerState === 'failed') {
      console.log('Peer connection closed/closing/failed, not sending signal')
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

    const supabase = createClient()
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
}
