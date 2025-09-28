'use client'

import React from 'react'
import { Mic } from 'lucide-react'
import { useActivityUsers } from '@/hooks/useActivitySelectors'
import { ActivityType } from '@/store/useActivityStore'

interface ActivityIndicatorProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showText?: boolean
}

export const ActivityIndicator: React.FC<ActivityIndicatorProps> = ({
  size = 'md',
  className = '',
  showText = true
}) => {
  const sizeClasses = {
    sm: {
      container: 'h-4',
      dot: 'w-1 h-1',
      icon: 'w-3 h-3',
      text: 'text-xs'
    },
    md: {
      container: 'h-6', 
      dot: 'w-1.5 h-1.5',
      icon: 'w-4 h-4',
      text: 'text-sm'
    },
    lg: {
      container: 'h-8',
      dot: 'w-2 h-2',
      icon: 'w-5 h-5', 
      text: 'text-base'
    }
  }

  const currentSize = sizeClasses[size]

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Анимированные точки для печати */}
      <div className={`flex items-center space-x-1 ${currentSize.container}`}>
        <div 
          className={`${currentSize.dot} bg-muted-foreground rounded-full animate-pulse`}
          style={{ animationDelay: '0ms' }}
        />
        <div 
          className={`${currentSize.dot} bg-muted-foreground rounded-full animate-pulse`} 
          style={{ animationDelay: '150ms' }}
        />
        <div 
          className={`${currentSize.dot} bg-muted-foreground rounded-full animate-pulse`}
          style={{ animationDelay: '300ms' }}
        />
      </div>

      {/* Текст */}
      {showText && (
        <span className={`text-muted-foreground ${currentSize.text} italic`}>
          печатает...
        </span>
      )}
    </div>
  )
}

export const VoiceRecordingIndicator: React.FC<ActivityIndicatorProps> = ({
  size = 'md',
  className = '',
  showText = true
}) => {
  const sizeClasses = {
    sm: {
      container: 'h-4',
      icon: 'w-3 h-3',
      text: 'text-xs'
    },
    md: {
      container: 'h-6', 
      icon: 'w-4 h-4',
      text: 'text-sm'
    },
    lg: {
      container: 'h-8',
      icon: 'w-5 h-5', 
      text: 'text-base'
    }
  }

  const currentSize = sizeClasses[size]

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Анимированная иконка микрофона */}
      <div className={`flex items-center ${currentSize.container}`}>
        <Mic 
          className={`${currentSize.icon} text-red-500 animate-pulse`}
        />
      </div>

      {/* Текст */}
      {showText && (
        <span className={`text-muted-foreground ${currentSize.text} italic`}>
          записывает голосовое...
        </span>
      )}
    </div>
  )
}

// Универсальный компонент для отображения активности пользователей
interface UserActivityIndicatorProps {
  chatId: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showText?: boolean
  excludeCurrentUser?: boolean
  currentUserId?: string
}

export const UserActivityIndicator: React.FC<UserActivityIndicatorProps> = ({
  chatId,
  size = 'sm',
  className = '',
  showText = true,
  excludeCurrentUser = false,
  currentUserId
}) => {
  const { typingUsers, voiceRecordingUsers } = useActivityUsers(chatId)

  // Фильтруем пользователей если нужно исключить текущего
  const filteredTypingUsers = excludeCurrentUser && currentUserId
    ? typingUsers.filter(userId => userId !== currentUserId)
    : typingUsers

  const filteredVoiceUsers = excludeCurrentUser && currentUserId
    ? voiceRecordingUsers.filter(userId => userId !== currentUserId)
    : voiceRecordingUsers

  // Приоритет: голосовая запись важнее печати
  if (filteredVoiceUsers.length > 0) {
    return (
      <VoiceRecordingIndicator
        size={size}
        className={className}
        showText={showText}
      />
    )
  }

  if (filteredTypingUsers.length > 0) {
    return (
      <ActivityIndicator
        size={size}
        className={className}
        showText={showText}
      />
    )
  }

  return null
}

// Экспортируем также старые компоненты для совместимости
export const TypingIndicator = ActivityIndicator
export const VoiceRecordingIndicators = UserActivityIndicator
