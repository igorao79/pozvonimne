import React, { useState, useEffect } from 'react'
import { Message } from './types'
import { Phone, PhoneCall, CheckCircle, PhoneMissed, X } from 'lucide-react'
import useCallStore from '@/store/useCallStore'
import { useMessageVisibility, useMessageReadTracking } from '@/hooks/useMessageVisibility'

interface CallMessageProps {
  message: Message
  chat: {
    id: string
    name: string
    type: string
  }
  userId?: string
}

export const CallMessage: React.FC<CallMessageProps> = ({ message, chat, userId }) => {
  const isOwn = message.sender_id === userId

  // Отслеживание видимости сообщения для пометки как прочитанное
  const { elementRef, isVisible, hasBeenVisible } = useMessageVisibility({
    threshold: 0.5, // 50% сообщения должно быть видно
    rootMargin: '0px 0px -20px 0px', // Небольшой отступ снизу
    triggerOnce: true // Пометить как прочитанное только один раз
  })

  // Пометка сообщения как прочитанного при его видимости
  useMessageReadTracking({
    messageId: message.id,
    isOwn,
    isVisible,
    userId,
    chatId: chat.id
  })

  // Извлекаем информацию о звонке из метаданных
  const metadata = message.metadata as any
  const callStatus = metadata?.status
  const callDuration = metadata?.duration || 0
  const callerName = metadata?.callerName || message.sender_name
  const callStartTime = metadata?.startTime
  
  // Получаем состояние текущего звонка
  const { isCallActive, callStartTime: currentCallStartTime, callDurationSeconds } = useCallStore()
  
  // Состояние для динамического обновления времени
  const [liveCallDuration, setLiveCallDuration] = useState(0)
  const [showingLiveTime, setShowingLiveTime] = useState(false)
  
  // Проверяем, является ли это сообщение текущим активным звонком
  const isCurrentActiveCall = callStatus === 'active' && isCallActive && 
    callStartTime && currentCallStartTime && 
    Math.abs(new Date(callStartTime).getTime() - currentCallStartTime) < 60000 // В пределах минуты
    
  // Проверяем, завершился ли звонок, но сообщение еще не обновлено
  const isCallEndedButNotUpdated = callStatus === 'active' && !isCallActive && 
    callStartTime && currentCallStartTime &&
    Math.abs(new Date(callStartTime).getTime() - currentCallStartTime) < 60000
  
  // Эффект для обновления времени активного звонка
  useEffect(() => {
    if (isCurrentActiveCall) {
      console.log('📞 CallMessage: Активный звонок обнаружен, запускаем live обновление')
      setShowingLiveTime(true)
      
      const interval = setInterval(() => {
        if (currentCallStartTime) {
          const duration = Math.floor((Date.now() - currentCallStartTime) / 1000)
          setLiveCallDuration(duration)
        } else if (callDurationSeconds > 0) {
          // Fallback на callDurationSeconds из store
          setLiveCallDuration(callDurationSeconds)
        }
      }, 1000)
      
      return () => {
        clearInterval(interval)
      }
    } else {
      setShowingLiveTime(false)
      setLiveCallDuration(0)
    }
  }, [isCurrentActiveCall, currentCallStartTime, callDurationSeconds])
  
  // Эффект для принудительного обновления "зависших" активных звонков
  useEffect(() => {
    if (callStatus === 'active') {
      // Проверяем время с момента начала звонка
      const callAge = callStartTime ? Date.now() - new Date(callStartTime).getTime() : 0
      const TWO_HOURS = 2 * 60 * 60 * 1000 // 2 часа в миллисекундах
      
      // Если звонок активен больше 2 часов и не является текущим звонком - это "зависший" звонок
      if (callAge > TWO_HOURS && !isCurrentActiveCall) {
        console.warn('📞 CallMessage: Обнаружен зависший активный звонок:', {
          messageId: message.id.slice(0, 8),
          age: Math.round(callAge / 1000 / 60) + ' минут',
          callStartTime
        })
        
        // Можно добавить API вызов для обновления статуса
        // Но лучше полагаться на серверную очистку через cleanup_stale_active_calls()
      }
      
      // Если звонок завершен (не является текущим активным), но сообщение не обновилось
      if (isCallEndedButNotUpdated) {
        console.log('📞 CallMessage: Звонок завершен, но сообщение не обновлено - ждем обновления')
        
        // Принудительное обновление через 5 секунд, если база данных не обновила сообщение
        const forceUpdateTimeout = setTimeout(() => {
          console.log('📞 CallMessage: Сообщение все еще не обновлено через 5 сек - возможно проблема с БД')
        }, 5000)
        
        return () => {
          clearTimeout(forceUpdateTimeout)
        }
      }
    }
  }, [callStatus, callStartTime, isCurrentActiveCall, isCallEndedButNotUpdated, message.id])
  
  // Логирование для отладки
  useEffect(() => {
    if (callStatus === 'active') {
      console.log('📞 CallMessage Debug:', {
        messageId: message.id.slice(0, 8),
        callStatus,
        callStartTime,
        currentCallStartTime,
        isCallActive,
        isCurrentActiveCall,
        isCallEndedButNotUpdated,
        showingLiveTime,
        liveCallDuration,
        callDurationFromStore: callDurationSeconds
      })
    }
  }, [message.id, callStatus, isCurrentActiveCall, isCallEndedButNotUpdated, showingLiveTime, liveCallDuration])

  // Форматируем время звонка
  const formatCallTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)

    if (diffHours < 24) {
      return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      })
    } else if (diffHours < 168) { // 7 дней
      return date.toLocaleDateString('ru-RU', {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })
    } else {
      return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  // Форматируем длительность звонка (синхронизировано с SQL логикой)
  const formatDuration = (seconds: number): string => {
    // Минимальная продолжительность 1 секунда для отображения
    const duration = Math.max(1, seconds)
    
    if (duration < 60) {
      return `${duration} сек`
    } else if (duration < 3600) {
      // Минуты и секунды
      if (duration % 60 === 0) {
        return `${Math.floor(duration / 60)} мин`
      } else {
        return `${Math.floor(duration / 60)} мин ${duration % 60} сек`
      }
    } else {
      // Часы и минуты
      const hours = Math.floor(duration / 3600)
      const minutes = Math.floor((duration % 3600) / 60)
      const remainingSeconds = duration % 60

      let hourText = ''
      if (hours === 1) hourText = '1 час'
      else if (hours === 2) hourText = '2 часа'
      else if (hours === 3) hourText = '3 часа'
      else if (hours === 4) hourText = '4 часа'
      else hourText = `${hours} часов`

      if (duration % 3600 === 0) {
        // Ровно часы
        return hourText
      } else {
        // Часы + минуты/секунды
        let result = hourText + ' '

        if (remainingSeconds === 0) {
          // Только минуты
          result += `${minutes} мин`
        } else {
          // Минуты и секунды
          result += `${minutes} мин ${remainingSeconds} сек`
        }

        return result
      }
    }
  }

  // Определяем текст и стиль сообщения в зависимости от статуса
  const getCallMessageContent = () => {
    // Проверяем не является ли звонок "зависшим"
    const callAge = callStartTime ? Date.now() - new Date(callStartTime).getTime() : 0
    const TWO_HOURS = 2 * 60 * 60 * 1000
    const isStaleCall = callAge > TWO_HOURS && !isCurrentActiveCall
    
    switch (callStatus) {
      case 'started':
        return {
          text: `"${callerName}" начал звонок!`,
          icon: Phone,
          className: 'text-blue-600 dark:text-blue-400',
          showDuration: false
        }
      case 'active':
        // Если звонок "завис" (старше 2 часов)
        if (isStaleCall) {
          const estimatedDuration = Math.floor(callAge / 1000)
          return {
            text: `Звонок был прерван`,
            icon: X,
            className: 'text-orange-600 dark:text-orange-400',
            showDuration: false,
            animated: false
          }
        }
        // Если звонок завершился, но сообщение еще не обновлено
        if (isCallEndedButNotUpdated) {
          return {
            text: `Звонок завершен (${formatDuration(liveCallDuration || callDurationSeconds)})`,
            icon: CheckCircle,
            className: 'text-gray-600 dark:text-gray-400',
            showDuration: false,
            animated: false
          }
        }
        return {
          text: `Звонок в прямом эфире`,
          icon: PhoneCall,
          className: 'text-green-600 dark:text-green-400',
          showDuration: showingLiveTime,
          animated: showingLiveTime
        }
      case 'ended':
        return {
          text: `Звонок продлился ${formatDuration(callDuration)} и был завершен`,
          icon: CheckCircle,
          className: 'text-gray-600 dark:text-gray-400',
          showDuration: false
        }
      case 'missed':
        return {
          text: `"${callerName}" пытался дозвониться`,
          icon: PhoneMissed,
          className: 'text-red-600 dark:text-red-400',
          showDuration: false
        }
      case 'rejected':
        return {
          text: `"${callerName}" отклонил звонок`,
          icon: X,
          className: 'text-orange-600 dark:text-orange-400',
          showDuration: false
        }
      default:
        return {
          text: `"${callerName}" начал звонок!`,
          icon: Phone,
          className: 'text-blue-600 dark:text-blue-400',
          showDuration: false
        }
    }
  }

  const { text, icon, className, animated, showDuration } = getCallMessageContent()

  const IconComponent = icon

  return (
    <div ref={elementRef} className="flex justify-center my-2 px-4">
      <div className={`flex items-center space-x-2 bg-muted/50 rounded-lg px-3 py-2 max-w-xs transition-all duration-200 ${
        animated ? 'ring-2 ring-green-500/20 bg-green-50/50 dark:bg-green-900/20' : ''
      }`}>
        <IconComponent className={`w-4 h-4 ${className} ${
          animated ? 'animate-pulse' : ''
        }`} />
        <div className="flex flex-col">
          <span className={`text-sm font-medium ${className} ${
            animated ? 'animate-pulse' : ''
          }`}>
            {text}
          </span>
          <span className="text-xs text-muted-foreground">
            {showingLiveTime ? (
              <span className="flex items-center space-x-1">
                <span>сейчас</span>
                <span className="inline-block w-1 h-1 bg-green-500 rounded-full animate-ping"></span>
              </span>
            ) : isCallEndedButNotUpdated ? (
              <span className="flex items-center space-x-1">
                <span>завершен</span>
                <span className="inline-block w-1 h-1 bg-gray-500 rounded-full"></span>
              </span>
            ) : (
              formatCallTime(message.created_at)
            )}
          </span>
        </div>
      </div>
    </div>
  )
}