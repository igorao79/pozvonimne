import React from 'react'
import { Chat } from './types'

interface ChatHeaderProps {
  chat: Chat
  onBack: () => void
  onCall?: () => void
  userStatus?: string
  isInCall?: boolean
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  chat,
  onBack,
  onCall,
  userStatus,
  isInCall = false
}) => {
  return (
    <div className="p-4 border-b bg-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Кнопка назад */}
          <button
            onClick={onBack}
            className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Аватар */}
          <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex-shrink-0">
            {(chat.avatar_url || chat.other_participant_avatar) ? (
              <img
                src={chat.avatar_url || chat.other_participant_avatar}
                alt={chat.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <span className="text-white font-medium text-sm">
                  {chat.name?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
            )}
          </div>

          {/* Имя */}
          <div>
            <h2 className="font-semibold text-foreground">{chat.name}</h2>
            {chat.type === 'private' && userStatus && (
              <p className="text-xs text-muted-foreground">
                {userStatus}
              </p>
            )}
          </div>
        </div>

        {/* Кнопка звонка */}
        {chat.type === 'private' && chat.other_participant_id && onCall && (
          <button
            onClick={onCall}
            disabled={isInCall}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21L6.16 11.37a11.045 11.045 0 005.516 5.516l1.983-4.064a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Позвонить
          </button>
        )}
      </div>
    </div>
  )
}



