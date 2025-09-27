import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, StopCircle, Play, Pause } from 'lucide-react'

interface VoiceMessageInputProps {
  onVoiceSubmit: (audioBlob: Blob, duration: number) => void
  disabled?: boolean
}

export const VoiceMessageInput: React.FC<VoiceMessageInputProps> = ({
  onVoiceSubmit,
  disabled = false
}) => {
  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationRef = useRef<number | null>(null)

  // Проверяем разрешение на использование микрофона
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(() => setHasPermission(true))
      .catch(() => setHasPermission(false))
  }, [])

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
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
    }
  }, [audioUrl])

  const startRecording = useCallback(async () => {
    if (disabled || !hasPermission) return

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
    }
  }, [disabled, hasPermission])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)

      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isRecording])

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

  const sendVoiceMessage = useCallback(() => {
    if (audioBlob && recordingTime > 0) {
      onVoiceSubmit(audioBlob, recordingTime)
      resetState()
    }
  }, [audioBlob, recordingTime, onVoiceSubmit])

  const resetState = useCallback(() => {
    setIsRecording(false)
    setIsPlaying(false)
    setRecordingTime(0)
    setAudioBlob(null)
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
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
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
