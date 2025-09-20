import React from 'react'
import { CheckCheck } from 'lucide-react'

interface SimpleMessageStatusProps {
  isOwn: boolean
  sentAt: string
  deliveredAt?: string
  readAt?: string
}

export const SimpleMessageStatus: React.FC<SimpleMessageStatusProps> = ({
  isOwn,
  sentAt,
  deliveredAt,
  readAt
}) => {
  return (
    <div className="flex items-center space-x-1">
      <span className="text-xs text-inherit">
        {sentAt}
      </span>
      
      {/* Показываем галочки только для собственных сообщений */}
      {isOwn && (
        <div className="flex items-center">
          {readAt ? (
            // Синие галочки - сообщение прочитано
            <CheckCheck 
              className="w-3 h-3 text-blue-500" 
              strokeWidth={2.5}
            />
          ) : deliveredAt ? (
            // Серые галочки - сообщение доставлено, но не прочитано
            <CheckCheck 
              className="w-3 h-3 text-gray-400" 
              strokeWidth={2.5}
            />
          ) : (
            // Одна серая галочка - сообщение отправляется
            <CheckCheck 
              className="w-3 h-3 text-gray-300" 
              strokeWidth={2.5}
            />
          )}
        </div>
      )}
    </div>
  )
}
