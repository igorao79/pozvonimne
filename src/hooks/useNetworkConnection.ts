'use client'

import { useEffect, useState, useCallback } from 'react'
import useCallStore from '@/store/useCallStore'

/**
 * Хук для мониторинга состояния интернет-соединения
 * Автоматически завершает звонок при потере соединения
 */
export const useNetworkConnection = () => {
  const [isOnline, setIsOnline] = useState(true)
  const [connectionType, setConnectionType] = useState<string>('unknown')
  const { isInCall, endCall } = useCallStore()

  // Функция для проверки состояния соединения
  const updateOnlineStatus = useCallback(() => {
    const online = navigator.onLine
    console.log('🌐 Network status changed:', { online, wasOnline: isOnline })

    if (!online && isOnline && isInCall) {
      console.log('🌐 Internet connection lost during call - ending call')
      endCall()
    }

    setIsOnline(online)
  }, [isOnline, isInCall, endCall])

  // Функция для проверки типа соединения
  const updateConnectionType = useCallback(() => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      if (connection) {
        const type = connection.effectiveType || connection.type || 'unknown'
        setConnectionType(type)
        console.log('🌐 Connection type:', type)
      }
    }
  }, [])

  // Обработчик потери соединения
  const handleOffline = useCallback(() => {
    console.log('🌐 Browser detected offline')
    if (isInCall) {
      console.log('🌐 Call active, ending call due to offline status')
      endCall()
    }
    setIsOnline(false)
  }, [isInCall, endCall])

  // Обработчик восстановления соединения
  const handleOnline = useCallback(() => {
    console.log('🌐 Browser detected online')
    setIsOnline(true)
  }, [])

  useEffect(() => {
    // Устанавливаем начальное состояние
    updateOnlineStatus()
    updateConnectionType()

    // Добавляем слушатели событий
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Слушаем изменения типа соединения (если поддерживается)
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      if (connection) {
        connection.addEventListener('change', updateConnectionType)
      }
    }

    // Периодическая проверка состояния (каждые 30 секунд)
    const checkInterval = setInterval(() => {
      if (navigator.onLine !== isOnline) {
        updateOnlineStatus()
      }
    }, 30000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)

      if ('connection' in navigator) {
        const connection = (navigator as any).connection
        if (connection) {
          connection.removeEventListener('change', updateConnectionType)
        }
      }

      clearInterval(checkInterval)
    }
  }, [handleOnline, handleOffline, updateConnectionType, updateOnlineStatus, isOnline])

  return {
    isOnline,
    connectionType,
    // Для отладки
    navigatorOnline: navigator.onLine
  }
}

export default useNetworkConnection
