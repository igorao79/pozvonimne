'use client'

import React from 'react'
import { Mic } from 'lucide-react'
import { useVoiceRecordingUsers } from '@/hooks/useVoiceRecordingSelectors'

interface VoiceRecordingIndicatorProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showText?: boolean
  text?: string
}

export const VoiceRecordingIndicator: React.FC<VoiceRecordingIndicatorProps> = ({
  size = 'md',
  className = '',
  showText = true,
  text = 'записывает голосовое...'
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
          {text}
        </span>
      )}
    </div>
  )
}

// Упрощенный компонент только с иконкой
export const VoiceRecordingIcon: React.FC<{
  size?: 'sm' | 'md' | 'lg'
  className?: string
}> = ({ size = 'sm', className = '' }) => {
  const sizeClasses = {
    sm: { icon: 'w-3 h-3' },
    md: { icon: 'w-4 h-4' },
    lg: { icon: 'w-5 h-5' }
  }

  return (
    <Mic 
      className={`${sizeClasses[size].icon} text-red-500 animate-pulse ${className}`}
    />
  )
}

// Компонент-контейнер для отображения индикаторов записи голоса
interface VoiceRecordingIndicatorsProps {
  chatId: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showText?: boolean
  excludeCurrentUser?: boolean
  currentUserId?: string
}

export const VoiceRecordingIndicators: React.FC<VoiceRecordingIndicatorsProps> = ({
  chatId,
  size = 'sm',
  className = '',
  showText = true,
  excludeCurrentUser = false,
  currentUserId
}) => {
  const allRecordingUsers = useVoiceRecordingUsers(chatId)

  // Фильтруем пользователей если нужно исключить текущего
  const recordingUsers = excludeCurrentUser && currentUserId
    ? allRecordingUsers.filter((userId: string) => userId !== currentUserId)
    : allRecordingUsers

  // Если никто не записывает, не показываем ничего
  if (recordingUsers.length === 0) {
    return null
  }

  return (
    <VoiceRecordingIndicator
      size={size}
      className={className}
      showText={showText}
    />
  )
}