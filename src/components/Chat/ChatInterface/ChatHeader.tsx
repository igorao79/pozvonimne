import React, { useState, useEffect } from 'react'
import { Chat } from './types'
import { TypingIndicator } from '../TypingIndicator'
import useCallStore from '@/store/useCallStore'

interface ChatHeaderProps {
  chat: Chat
  onBack: () => void
  onCall?: () => void
  onCancel?: () => void
  userStatus?: string
  isInCall?: boolean
  typingUsers?: string[]
  currentUserId?: string
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  chat,
  onBack,
  onCall,
  onCancel,
  userStatus,
  isInCall = false,
  typingUsers = [],
  currentUserId
}) => {
  const { isCalling, targetUserId, endCall, error: callError } = useCallStore()
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'failed'>('idle')

  // Определяем, звоним ли мы этому пользователю
  const isCallingThisUser = isCalling && targetUserId === chat.other_participant_id

  // Эффект для отслеживания состояния звонка
  useEffect(() => {
    if (isCallingThisUser) {
      setCallStatus('calling')
    } else if (callStatus === 'calling' && !isCallingThisUser) {
      // Если только что перестали звонить этому пользователю
      if (callError && (callError.includes('отклонен') || callError.includes('завершен') || callError.includes('Не удалось'))) {
        setCallStatus('failed')
        // Через 3 секунды возвращаем к дефолтному состоянию
        setTimeout(() => setCallStatus('idle'), 3000)
      } else {
        setCallStatus('idle')
      }
    }
  }, [isCallingThisUser, callError, callStatus])

  // Эффект для обработки таймаута звонка (если звонок длится слишком долго без ответа)
  useEffect(() => {
    if (callStatus === 'calling') {
      const timeoutId = setTimeout(() => {
        // Если через 30 секунд звонок все еще в состоянии calling - считаем его неудачным
        if (callStatus === 'calling') {
          setCallStatus('failed')
          setTimeout(() => setCallStatus('idle'), 3000)
        }
      }, 30000) // 30 секунд таймаут

      return () => clearTimeout(timeoutId)
    }
  }, [callStatus])

  // Обработчик отмены звонка
  const handleCancelCall = () => {
    if (onCancel) {
      onCancel()
    } else {
      // Fallback если onCancel не передан
      endCall()
    }
    setCallStatus('idle')
  }
  // Проверяем, печатает ли кто-то из собеседников (исключая текущего пользователя)
  const isOtherParticipantTyping = React.useMemo(() => {
    if (chat.type !== 'private') {
      return false
    }

    // Поскольку текущий пользователь уже исключен в селекторе, 
    // любые пользователи в списке - это собеседники
    const hasTyping = typingUsers.length > 0
    
    // Логируем только когда кто-то печатает
    if (hasTyping) {
      console.log(`🎯 [ChatHeader] ✅ СОБЕСЕДНИК ПЕЧАТАЕТ!`, {
        chatName: chat.name,
        typingUsers: typingUsers
      })
    }
    
    return hasTyping
  }, [chat.type, typingUsers, chat.name, currentUserId])

  return (
    <div className={`p-4 border-b transition-colors duration-300 ${
      callStatus === 'calling' ? '!bg-green-300 dark:!bg-green-700/50' :
      callStatus === 'failed' ? '!bg-red-300 dark:!bg-red-700/50' :
      'bg-card'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Кнопка назад */}
          <button
            onClick={onBack}
            className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer"
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
            {chat.type === 'private' && (
              <div className="flex items-center space-x-2">
                {isOtherParticipantTyping ? (
                  // Индикатор печатания вместо статуса - только когда печатает собеседник
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-primary italic">
                      печатает
                    </span>
                    <TypingIndicator
                      size="sm"
                      showText={false}
                      className="scale-75"
                    />
                  </div>
                ) : userStatus ? (
                  // Обычный статус (онлайн/оффлайн)
                  <p className="text-xs text-muted-foreground">
                    {userStatus}
                  </p>
                ) : (
                  // Нет статуса
                  <p className="text-xs text-muted-foreground italic">
                    не в сети
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Кнопки звонка */}
        {chat.type === 'private' && chat.other_participant_id && (
          <div className="flex items-center space-x-2">
            {callStatus === 'calling' ? (
              <>
                <button
                  disabled={true}
                  className="flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg cursor-not-allowed transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21L6.16 11.37a11.045 11.045 0 005.516 5.516l1.983-4.064a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Звоним...
                </button>
                <button
                  onClick={handleCancelCall}
                  className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 cursor-pointer transition-colors"
                >
                  Отменить
                </button>
              </>
            ) : onCall ? (
              <button
                onClick={onCall}
                disabled={isInCall}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21L6.16 11.37a11.045 11.045 0 005.516 5.516l1.983-4.064a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Позвонить
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}




