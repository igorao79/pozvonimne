'use client'

import React from 'react'

interface TypingIndicatorProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showText?: boolean
  text?: string
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  size = 'md',
  className = '',
  showText = true,
  text = 'печатает...'
}) => {
  const sizeClasses = {
    sm: {
      container: 'h-4',
      dot: 'w-1 h-1',
      text: 'text-xs'
    },
    md: {
      container: 'h-6', 
      dot: 'w-1.5 h-1.5',
      text: 'text-sm'
    },
    lg: {
      container: 'h-8',
      dot: 'w-2 h-2', 
      text: 'text-base'
    }
  }

  const currentSize = sizeClasses[size]

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Анимированные точки */}
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
          {text}
        </span>
      )}
    </div>
  )
}

// Упрощенный компонент только с точками
export const TypingDots: React.FC<{
  size?: 'sm' | 'md' | 'lg'
  className?: string
}> = ({ size = 'sm', className = '' }) => {
  return (
    <TypingIndicator
      size={size}
      showText={false}
      className={className}
    />
  )
}