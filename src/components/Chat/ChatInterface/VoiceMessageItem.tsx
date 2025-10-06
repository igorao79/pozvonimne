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
  const [waveHeights, setWaveHeights] = useState<number[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const animationRef = useRef<number | null>(null)
  const baseHeightsRef = useRef<number[]>([8, 12, 18, 24, 16, 20, 14, 22, 10, 26, 18, 15, 20, 12, 24, 16, 19, 13, 21, 17])

  useEffect(() => {
    // Инициализируем статичные высоты волн
    console.log('🌊 [VoiceMessageItem] Инициализируем волны:', baseHeightsRef.current)
    setWaveHeights(baseHeightsRef.current)

    const audio = new Audio(audioUrl)
    audioRef.current = audio

    const handleLoadedData = () => setAudioLoaded(true)
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
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

  // Анимация волн во время воспроизведения
  useEffect(() => {
    console.log('🌊 [VoiceMessageItem] Статус воспроизведения изменился:', isPlaying)
    
    if (isPlaying) {
      const animateWaves = () => {
        const time = Date.now() * 0.01
        const newHeights = baseHeightsRef.current.map((baseHeight, i) => {
          // Более выраженная анимация с большими колебаниями
          const wave1 = Math.sin(time + i * 0.8) * 0.7
          const wave2 = Math.sin(time * 1.3 + i * 0.5) * 0.5
          const wave3 = Math.sin(time * 0.7 + i * 1.2) * 0.4
          const multiplier = 1.2 + wave1 + wave2 + wave3
          // Увеличиваем диапазон высот для более заметной анимации
          return Math.max(4, Math.min(35, baseHeight * multiplier))
        })
        setWaveHeights(newHeights)
        animationRef.current = requestAnimationFrame(animateWaves)
      }
      console.log('🌊 [VoiceMessageItem] Запускаем анимацию волн')
      animateWaves()
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      // Возвращаем к базовым высотам
      console.log('🌊 [VoiceMessageItem] Останавливаем анимацию, возвращаем к базовым высотам')
      setWaveHeights(baseHeightsRef.current)
    }
  }, [isPlaying])

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

  return (
    <div className={`flex items-center space-x-3 p-3 rounded-lg min-w-[200px] max-w-full ${
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
      <div className="flex-1 flex items-center space-x-2 min-w-0">
        <Volume2 className={`w-4 h-4 flex-shrink-0 ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`} />

        {/* Волновая визуализация */}
        <div className="flex items-end space-x-0.5 flex-1 min-w-0">
          {waveHeights.length > 0 ? waveHeights.map((height, i) => (
            <div
              key={i}
              className={`w-0.5 rounded-full transition-all duration-100 flex-shrink-0`}
              style={{
                height: `${height}px`,
                transformOrigin: 'bottom',
                backgroundColor: isPlaying ? '#3b82f6' : 'rgba(156, 163, 175, 0.6)' // Принудительные цвета
              }}
            />
          )) : (
            <div className="text-xs text-red-500">Нет данных волн</div>
          )}
        </div>

        {/* Таймер - показывает общее время или прошедшее время при воспроизведении */}
        <div className={`text-xs font-mono flex-shrink-0 ${
          isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
        }`}>
          {isPlaying ? formatTime(currentTime) : formatTime(duration)}
        </div>
      </div>
    </div>
  )
}
