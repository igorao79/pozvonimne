import React, { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2 } from 'lucide-react'

interface VoiceMessageItemProps {
  audioUrl: string
  duration: number
  isOwn: boolean
}

export const VoiceMessageItem: React.FC<VoiceMessageItemProps> = ({
  audioUrl,
  duration,
  isOwn
}) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [audioLoaded, setAudioLoaded] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    const audio = new Audio(audioUrl)
    audioRef.current = audio

    const handleLoadedData = () => setAudioLoaded(true)
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    audio.addEventListener('loadeddata', handleLoadedData)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('timeupdate', handleTimeUpdate)

    return () => {
      audio.removeEventListener('loadeddata', handleLoadedData)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [audioUrl])

  const togglePlayback = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    } else {
      audioRef.current.play()
      setIsPlaying(true)

      // Анимированная волна для визуализации
      const animate = () => {
        if (audioRef.current && !audioRef.current.paused) {
          animationRef.current = requestAnimationFrame(animate)
        }
      }
      animate()
    }
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className={`flex items-center space-x-3 p-3 rounded-lg min-w-[200px] ${
      isOwn
        ? 'bg-primary/10 border border-primary/20'
        : 'bg-muted/50 border border-border'
    }`}>
      {/* Кнопка воспроизведения */}
      <button
        onClick={togglePlayback}
        disabled={!audioLoaded}
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
          isPlaying
            ? 'bg-red-500 text-white scale-110'
            : 'bg-primary text-primary-foreground hover:bg-primary/90'
        } disabled:opacity-50`}
      >
        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
      </button>

      {/* Визуализация звука */}
      <div className="flex-1 flex items-center space-x-2">
        <Volume2 className={`w-4 h-4 ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`} />

        {/* Волновая визуализация */}
        <div className="flex items-center space-x-0.5 flex-1">
          {Array.from({ length: 20 }, (_, i) => (
            <div
              key={i}
              className={`w-0.5 rounded-full transition-all duration-200 ${
                isPlaying ? 'bg-primary' : 'bg-muted-foreground/40'
              }`}
              style={{
                height: isPlaying ? `${Math.random() * 20 + 4}px` : '4px',
                animationDelay: isPlaying ? `${i * 0.1}s` : '0s'
              }}
            />
          ))}
        </div>

        {/* Прогресс-бар */}
        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Время */}
      <div className={`text-xs font-mono min-w-[40px] ${
        isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
      }`}>
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>
    </div>
  )
}
