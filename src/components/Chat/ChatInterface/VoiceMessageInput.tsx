import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, StopCircle, Play, Pause } from 'lucide-react'
import { useTyping } from '@/hooks/useTyping'
import useCallStore from '@/store/useCallStore'
import useSupabaseStore from '@/store/useSupabaseStore'

interface VoiceMessageInputProps {
  onVoiceSubmit: (audioBlob: Blob, duration: number) => void
  disabled?: boolean
  chatId: string
}

export const VoiceMessageInput: React.FC<VoiceMessageInputProps> = ({
  onVoiceSubmit,
  disabled = false,
  chatId
}) => {
  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [typingStarted, setTypingStarted] = useState(false)

  // Получаем данные из stores
  const { userId } = useCallStore()
  const { supabase } = useSupabaseStore()

  // Хук для typing indicator
  const { startTyping, stopTyping } = useTyping({
    chatId,
    enabled: !disabled
  })

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationRef = useRef<number | null>(null)
  const serverIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Проверяем разрешение на использование микрофона
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => setHasPermission(true))
      .catch(() => setHasPermission(false))
  }, [])


  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      // Останавливаем typing indicator при размонтировании компонента
      console.log('🧹 [VoiceMessageInput] Очистка при размонтировании')
      stopTyping()
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (serverIntervalRef.current) {
        clearInterval(serverIntervalRef.current)
        serverIntervalRef.current = null
      }
    }
  }, [audioUrl, stopTyping])

  const startRecording = useCallback(async () => {
    if (disabled || !hasPermission || !userId || !chatId) return

    // Очищаем предыдущий интервал если он есть
    if (serverIntervalRef.current) {
      clearInterval(serverIntervalRef.current)
      serverIntervalRef.current = null
    }

    // 🔥 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Устанавливаем индикатор голосовой записи СРАЗУ при начале записи
    // Это гарантирует, что индикатор появится до того, как пользователь увидит UI
    if (!typingStarted) {
      console.log('🎤 [VoiceMessageInput] Устанавливаем индикатор голосовой записи')
      startTyping('voice')
      setTypingStarted(true)
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      })

      streamRef.current = stream
      audioChunksRef.current = []

      // Создаем анализатор для визуализации звука
      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)

        // Останавливаем все треки
        stream.getTracks().forEach(track => track.stop())
        audioContext.close()
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(100) // Записываем чанки каждые 100ms
      setIsRecording(true)
      setRecordingTime(0)

      // Таймер записи
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

    } catch (error) {
      console.error('Ошибка при запуске записи:', error)
      setHasPermission(false)
      // Очищаем интервал при ошибке
      if (serverIntervalRef.current) {
        clearInterval(serverIntervalRef.current)
        serverIntervalRef.current = null
      }
    }
  }, [disabled, hasPermission, userId, chatId, startTyping, typingStarted])

  const stopRecording = useCallback(async () => {
    console.log('🎤 [VoiceMessageInput] Остановка записи, isRecording:', isRecording)

    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
    }

    // Всегда устанавливаем isRecording = false
    setIsRecording(false)

    // Очищаем интервал сервера
    if (serverIntervalRef.current) {
      clearInterval(serverIntervalRef.current)
      serverIntervalRef.current = null
    }

    // Очищаем индикатор через useTyping (локальный store + сервер)
    if (typingStarted) {
      console.log('🎤 [VoiceMessageInput] Очищаем индикатор голосовой записи')
      stopTyping()
      setTypingStarted(false)
    }

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [isRecording, stopTyping, typingStarted])

  // Глобальные обработчики событий для надежной остановки записи
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isRecording) {
        console.log('🎤 [VoiceMessageInput] Глобальный mouseup - останавливаем запись')
        stopRecording()
      }
    }

    const handleGlobalTouchEnd = () => {
      if (isRecording) {
        console.log('🎤 [VoiceMessageInput] Глобальный touchend - останавливаем запись')
        stopRecording()
      }
    }

    if (isRecording) {
      window.addEventListener('mouseup', handleGlobalMouseUp)
      window.addEventListener('touchend', handleGlobalTouchEnd)
      window.addEventListener('touchcancel', handleGlobalTouchEnd)
    }

    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp)
      window.removeEventListener('touchend', handleGlobalTouchEnd)
      window.removeEventListener('touchcancel', handleGlobalTouchEnd)
    }
  }, [isRecording]) // Убрали stopRecording из зависимостей, чтобы избежать бесконечного цикла

  const playAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }, [])

  const pauseAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }, [])

  const sendVoiceMessage = useCallback(async () => {
    if (audioBlob && recordingTime > 0) {
      console.log('🎤 [VoiceMessageInput] Отправка голосового сообщения')

      onVoiceSubmit(audioBlob, recordingTime)

      // 🔥 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Очищаем индикатор через RPC вызов через 1 секунду после отправки
      setTimeout(async () => {
        if (typingStarted) {
          console.log('🎤 [VoiceMessageInput] Очищаем индикатор после отправки голосового сообщения через RPC', { chatId, userId })
          try {
            await supabase.rpc('clear_typing_indicator_fixed', {
              chat_uuid: chatId,
              user_uuid: userId
            })
            console.log('✅ [VoiceMessageInput] Индикатор очищен через RPC')
          } catch (err) {
            console.error('❌ [VoiceMessageInput] Ошибка очистки индикатора:', err)
          }
          setTypingStarted(false)
        }
      }, 1000)

      resetState()
    }
  }, [audioBlob, recordingTime, onVoiceSubmit, supabase, chatId, userId, typingStarted])

  const resetState = useCallback(() => {
    console.log('🎤 [VoiceMessageInput] Сброс состояния')

    setIsRecording(false)
    setIsPlaying(false)
    setRecordingTime(0)
    setAudioBlob(null)
    setTypingStarted(false)

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (serverIntervalRef.current) {
      clearInterval(serverIntervalRef.current)
      serverIntervalRef.current = null
    }
  }, [audioUrl])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (hasPermission === false) {
    return (
      <div className="flex items-center justify-center p-4 text-muted-foreground">
        <div className="text-center">
          <Mic className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Нет доступа к микрофону</p>
          <p className="text-xs mt-1">Разрешите доступ к микрофону в настройках браузера</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-4 p-4">
      {/* Основной контрол записи/воспроизведения */}
      <div className="flex-1 flex items-center space-x-3">
        {audioBlob ? (
          // Режим прослушивания
          <div className="flex items-center space-x-3 flex-1">
            <button
              onClick={isPlaying ? pauseAudio : playAudio}
              disabled={disabled}
              className="flex-shrink-0 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
            </button>

            <div className="flex-1">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-200"
                  style={{ width: isPlaying ? '60%' : '0%' }} // Заглушка для прогресс-бара
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0:00</span>
                <span>{formatTime(recordingTime)}</span>
              </div>
            </div>
          </div>
        ) : (
          // Режим записи
          <div className="flex items-center space-x-3 flex-1">
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onMouseLeave={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              onTouchCancel={stopRecording}
              disabled={disabled || hasPermission === null}
              className={`flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 ${
                isRecording
                  ? 'bg-red-500 text-white animate-pulse scale-110'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              } disabled:opacity-50`}
            >
              <Mic className="w-8 h-8" />
            </button>

            <div className="flex-1">
              <div className="text-sm font-medium">
                {isRecording ? 'Запись...' : 'Нажмите и удерживайте для записи'}
              </div>
              <div className="text-xs text-muted-foreground">
                {isRecording ? formatTime(recordingTime) : 'Максимум 60 секунд'}
              </div>
              {isRecording && (
                <div className="flex items-center space-x-1 mt-1">
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`w-1 bg-red-500 rounded-full animate-pulse`}
                        style={{
                          height: `${Math.random() * 16 + 4}px`,
                          animationDelay: `${i * 0.1}s`
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Кнопка отправки */}
      {audioBlob && (
        <button
          onClick={sendVoiceMessage}
          disabled={disabled}
          className="flex-shrink-0 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 font-medium"
        >
          Отправить
        </button>
      )}

      {/* Скрытый audio элемент для воспроизведения */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
        />
      )}
    </div>
  )
}
