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
  const { isCalling, targetUserId, endCall, error: callError, isInCall: isInCallStore } = useCallStore()
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'failed'>('idle')
  const [isCancelling, setIsCancelling] = useState(false)

  // Определяем, звоним ли мы этому пользователю
  const isCallingThisUser = isCalling && targetUserId === chat.other_participant_id


  // Эффект для отслеживания состояния звонка
  useEffect(() => {
    if (isCallingThisUser) {
      setCallStatus('calling')
      setIsCancelling(false) // Сбрасываем состояние отмены при новом звонке
    }
    // НЕ обрабатываем завершение звонка здесь - это делается в других эффектах
  }, [isCallingThisUser])

  // Эффект для обработки таймаута звонка (если звонок длится слишком долго без ответа)
  useEffect(() => {
    if (callStatus === 'calling') {
      const timeoutId = setTimeout(() => {
        // Если через 30 секунд звонок все еще в состоянии calling - считаем его неудачным
        if (callStatus === 'calling') {
          console.log('📞 Call timeout - showing failed state')
          setIsCancelling(false) // Сбрасываем состояние отмены при таймауте
          setCallStatus('failed')
          setTimeout(() => {
            console.log('📞 Resetting call status to idle after timeout')
            setCallStatus('idle')
          }, 3000)
        }
      }, 30000) // 30 секунд таймаут

      return () => clearTimeout(timeoutId)
    }
  }, [callStatus])

  // Эффект для отслеживания завершения звонка без ошибки
  useEffect(() => {
    // Если мы были в состоянии calling, но теперь не звоним и не в звонке
    if (callStatus === 'calling' && !isCalling && !isInCallStore) {
      console.log('📞 Call ended - immediately resetting to idle state')

      // Сразу устанавливаем статус в idle для мгновенного изменения цвета плашки
      setCallStatus('idle')
      // Сбрасываем состояние отмены сразу
      setIsCancelling(false)

      // Не ждем ошибки - плашка должна сразу стать серой
    }
  }, [callStatus, isCalling, isInCallStore])

  // Дополнительный эффект для отслеживания изменения callError
  useEffect(() => {
    // Если пришла ошибка CALL_REJECTED_VISUAL - показываем красную плашку
    if (callError === 'CALL_REJECTED_VISUAL') {
      console.log('📞 Call rejection detected, showing red indicator for 3 seconds')
      setIsCancelling(false) // Сбрасываем состояние отмены при ошибке
      setCallStatus('failed')
      // Через 1 секунду возвращаем к дефолтному состоянию
      const timeoutId = setTimeout(() => {
        console.log('📞 Resetting call status to idle after 1 second red indicator')
        setCallStatus('idle')
        setIsCancelling(false) // Сбрасываем состояние отмены при возврате к idle
      }, 1000) // Уменьшаем до 1 секунды

      return () => clearTimeout(timeoutId)
    }
    // Обработка других ошибок
    else if (callError && callStatus === 'calling') {
      const shouldShowFailedState = callError.includes('отклонен') ||
                                   callError.includes('завершен') ||
                                   callError.includes('Не удалось') ||
                                   callError.includes('отменен') ||
                                   callError.includes('cancelled')

      if (shouldShowFailedState) {
        console.log('📞 Call failed with other error, showing red indicator briefly')
        setCallStatus('failed')
        // Короткая задержка для показа красной плашки, затем сразу в idle
        setTimeout(() => {
          setCallStatus('idle')
          setIsCancelling(false)
        }, 1000) // Уменьшаем до 1 секунды
      }
    }
  }, [callError, callStatus])

  // Гарантированный сброс статуса failed через 1.5 секунды (для надежности)
  useEffect(() => {
    if (callStatus === 'failed') {
      const safetyTimeoutId = setTimeout(() => {
        console.log('📞 Safety reset: ensuring call status returns to idle')
        setCallStatus('idle')
        setIsCancelling(false) // Гарантированный сброс состояния отмены при возврате к idle
      }, 1500) // Уменьшаем до 1.5 секунд

      return () => clearTimeout(safetyTimeoutId)
    }
  }, [callStatus])

  // Обработчик отмены звонка
  const handleCancelCall = () => {
    // Предотвращаем множественные нажатия
    if (isCancelling) {
      console.log('📞 Cancel button is already pressed, ignoring duplicate click')
      return
    }

    setIsCancelling(true)
    console.log('📞 HandleCancelCall: Starting call cancellation')

    if (onCancel) {
      onCancel()
    } else {
      // Fallback если onCancel не передан
      endCall()
    }

    // Устанавливаем статус в idle сразу, чтобы плашка вернулась к нормальному состоянию
    setCallStatus('idle')

    // Сбрасываем isCancelling через небольшую задержку, чтобы дать время на обработку отмены
    setTimeout(() => {
      setIsCancelling(false)
      console.log('📞 Cancel button state reset after call cancellation')
    }, 1000)
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
                {/* Мобильная версия - круглые иконки */}
                <button
                  onClick={handleCancelCall}
                  disabled={isCancelling}
                  className="w-10 h-10 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed md:hidden"
                  title={isCancelling ? "Отмена..." : "Отменить звонок"}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 9l6 6m0-6l-6 6"/>
                  </svg>
                </button>
                <button
                  disabled={true}
                  className="w-10 h-10 bg-gray-500 text-white rounded-full flex items-center justify-center cursor-not-allowed transition-colors md:hidden"
                  title="Звоним..."
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21L6.16 11.37a11.045 11.045 0 005.516 5.516l1.983-4.064a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </button>

                {/* Десктопная версия - кнопки с текстом */}
                <button
                  onClick={handleCancelCall}
                  disabled={isCancelling}
                  className="hidden md:flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 9l6 6m0-6l-6 6"/>
                  </svg>
                  {isCancelling ? 'Отмена...' : 'Отменить'}
                </button>
                <button
                  disabled={true}
                  className="hidden md:flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg cursor-not-allowed transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21L6.16 11.37a11.045 11.045 0 005.516 5.516l1.983-4.064a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Звоним...
                </button>
              </>
            ) : onCall ? (
              <>
                {/* Мобильная версия - круглая иконка */}
                <button
                  onClick={onCall}
                  disabled={isInCall || callStatus === 'failed'}
                  className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors md:hidden"
                  title="Позвонить"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21L6.16 11.37a11.045 11.045 0 005.516 5.516l1.983-4.064a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </button>

                {/* Десктопная версия - кнопка с текстом */}
                <button
                  onClick={onCall}
                  disabled={isInCall || callStatus === 'failed'}
                  className="hidden md:flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21L6.16 11.37a11.045 11.045 0 005.516 5.516l1.983-4.064a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Позвонить
                </button>
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}




