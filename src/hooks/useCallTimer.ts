import { useState, useEffect, useRef } from 'react'

interface UseCallTimerProps {
  isActive: boolean // Активен ли звонок
  reset?: boolean   // Сбросить ли таймер
}

interface CallTimer {
  timeString: string
  totalSeconds: number
}

export const useCallTimer = ({ isActive, reset }: UseCallTimerProps): CallTimer => {
  const [seconds, setSeconds] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Сбрасываем таймер при reset
  useEffect(() => {
    if (reset) {
      setSeconds(0)
    }
  }, [reset])

  // Управляем таймером
  useEffect(() => {
    if (isActive) {
      // Запускаем таймер
      intervalRef.current = setInterval(() => {
        setSeconds(prev => prev + 1)
      }, 1000)
    } else {
      // Останавливаем таймер
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    // Cleanup функция
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isActive])

  // Форматируем время в строку
  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return {
    timeString: formatTime(seconds),
    totalSeconds: seconds
  }
}

export default useCallTimer
