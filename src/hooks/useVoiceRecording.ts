import { useCallback, useRef } from 'react'
import useCallStore from '@/store/useCallStore'
import useSupabaseStore from '@/store/useSupabaseStore'
import useTypingStore from '@/store/useTypingStore'

interface UseVoiceRecordingProps {
  chatId: string
  enabled?: boolean
}

interface UseVoiceRecordingReturn {
  startRecording: () => void
  stopRecording: () => void
}

export const useVoiceRecording = ({ chatId, enabled = true }: UseVoiceRecordingProps): UseVoiceRecordingReturn => {
  const { userId } = useCallStore()
  const { supabase } = useSupabaseStore()
  const { startTyping: startRecordingStore, stopTyping: stopRecordingStore } = useTypingStore()
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const stopRecording = useCallback(async () => {
    if (!enabled || !userId || !chatId) return

    try {
      // 🚀 ОПТИМИЗАЦИЯ: Сначала быстро обновляем локальное состояние (UI)
      stopRecordingStore(chatId, userId)

      // Очищаем таймаут
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current)
        recordingTimeoutRef.current = null
      }

      // Затем асинхронно отправляем в базу данных (не блокирует UI)
      const { error } = await supabase.rpc('clear_typing_indicator_fixed', {
        chat_uuid: chatId,
        user_uuid: userId
      })

      if (error) {
        console.error('❌ [useVoiceRecording] Ошибка очистки typing indicator:', error)
        return
      }

      console.log('✅ [useVoiceRecording] Typing indicator успешно очищен')

      // 🔄 Принудительная очистка локального состояния для гарантии
      try {
        const { globalTypingManager } = await import('@/lib/GlobalTypingManager')
        globalTypingManager.forceStopTyping(chatId, userId, 'voice_recording_ended')
      } catch (error) {
        console.error('💥 [useVoiceRecording] Ошибка принудительной очистки:', error)
      }
    } catch (error) {
      console.error('💥 [useVoiceRecording] Исключение при очистке typing indicator:', error)
    }
  }, [enabled, userId, chatId, stopRecordingStore, supabase])

  const startRecording = useCallback(async () => {
    if (!enabled || !userId || !chatId) return
    
    try {
      // 🚀 ОПТИМИЗАЦИЯ: Сначала быстро обновляем локальное состояние (UI)
      startRecordingStore(chatId, userId, 'voice')
      
      // Затем асинхронно отправляем в базу данных (не блокирует UI)
      const { error } = await supabase.rpc('set_voice_typing_indicator', {
        chat_uuid: chatId,
        user_uuid: userId
      })
      
      if (error) {
        console.error('❌ [useVoiceRecording] Ошибка установки voice typing indicator:', error)
        // Откатываем локальное состояние при ошибке
        stopRecordingStore(chatId, userId)
        return
      }
      
      console.log('✅ [useVoiceRecording] Voice typing indicator успешно установлен')
      
      // Автоматически останавливаем через 30 секунд (голосовые сообщения могут быть длиннее)
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current)
      }
      
      recordingTimeoutRef.current = setTimeout(() => {
        stopRecording()
      }, 30000)
    } catch (error) {
      console.error('💥 [useVoiceRecording] Исключение при установке voice typing indicator:', error)
      stopRecordingStore(chatId, userId)
    }
  }, [enabled, userId, chatId, startRecordingStore, stopRecordingStore, supabase, stopRecording])

  return {
    startRecording,
    stopRecording
  }
}