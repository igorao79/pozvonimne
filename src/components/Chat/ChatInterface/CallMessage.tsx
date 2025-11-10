import React from 'react'
import { Message } from './types'
import { Phone, PhoneCall, CheckCircle, PhoneMissed } from 'lucide-react'
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
  const { elementRef, isVisible } = useMessageVisibility({
    threshold: 0.5,
    rootMargin: '0px 0px -20px 0px',
    triggerOnce: true
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
  const metadata = message.metadata as {
    status?: string
    duration?: number
    callerName?: string
  }
  const callStatus = metadata?.status
  const callDuration = metadata?.duration || 0
  const callerName = metadata?.callerName || message.sender_name

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
    switch (callStatus) {
      case 'started':
        return {
          text: `"${callerName}" начал звонок!`,
          icon: Phone,
          className: 'text-blue-600 dark:text-blue-400'
        }
      case 'active':
        return {
          text: `Звонок в прямом эфире!`,
          icon: PhoneCall,
          className: 'text-green-600 dark:text-green-400'
        }
      case 'ended':
        return {
          text: `Звонок продлился ${formatDuration(callDuration)} и был завершен`,
          icon: CheckCircle,
          className: 'text-gray-600 dark:text-gray-400'
        }
      case 'missed':
        return {
          text: `"${callerName}" пытался дозвониться`,
          icon: PhoneMissed,
          className: 'text-red-600 dark:text-red-400'
        }
      default:
        return {
          text: `"${callerName}" начал звонок!`,
          icon: Phone,
          className: 'text-blue-600 dark:text-blue-400'
        }
    }
  }

  const { text, icon: IconComponent, className } = getCallMessageContent()

  return (
    <div ref={elementRef} className="flex justify-center my-2 px-4">
      <div className="flex items-center space-x-2 bg-muted/50 rounded-lg px-3 py-2 max-w-xs">
        <IconComponent className={`w-4 h-4 ${className}`} />
        <div className="flex flex-col">
          <span className={`text-sm font-medium ${className}`}>
            {text}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatCallTime(message.created_at)}
          </span>
        </div>
      </div>
    </div>
  )
}