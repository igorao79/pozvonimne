import React from 'react'
import { Message } from './types'
import { Phone, PhoneCall, CheckCircle, PhoneMissed, X } from 'lucide-react'

interface CallMessageProps {
  message: Message
  chat: {
    id: string
    name: string
    type: string
  }
  userId?: string
}

export const CallMessage: React.FC<CallMessageProps> = ({ message }) => {
  // Извлекаем информацию о звонке из метаданных
  const metadata = message.metadata as any
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

  // Форматируем длительность звонка
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds} сек`
    } else if (seconds % 60 === 0) {
      return `${Math.floor(seconds / 60)} мин`
    } else {
      return `${Math.floor(seconds / 60)} мин ${seconds % 60} сек`
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
          text: 'Звонок в прямом эфире',
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
      case 'rejected':
        return {
          text: `"${callerName}" отклонил звонок`,
          icon: X,
          className: 'text-orange-600 dark:text-orange-400'
        }
      default:
        return {
          text: `"${callerName}" начал звонок!`,
          icon: Phone,
          className: 'text-blue-600 dark:text-blue-400'
        }
    }
  }

  const { text, icon, className } = getCallMessageContent()

  const IconComponent = icon

  return (
    <div className="flex justify-center my-2 px-4">
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