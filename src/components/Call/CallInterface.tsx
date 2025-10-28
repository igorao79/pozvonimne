'use client'

import { useEffect, useState, useRef } from 'react'
import useCallStore from '@/store/useCallStore'
import { createClient } from '@/utils/supabase/client'
import useWebRTC from '@/hooks/useWebRTC'
import { CallControls, IncomingCall, CallScreen, DialPad } from '.'
import { ChatApp } from '../Chat'
// УБРАНО: ChatList, ChatInterface, CreateChatModal теперь внутри ChatApp
// УБРАНО: RandomFact, UserCounter теперь внутри ChatApp
import { useSoundNotifications } from '@/hooks/useSoundNotifications'
import { useCallMessages } from '@/hooks/useCallMessages'

interface Chat {
  id: string
  type: 'private' | 'group'
  name: string
  avatar_url?: string
  other_participant_id?: string
  other_participant_name?: string
  other_participant_avatar?: string
}

interface CallInterfaceProps {
  resetChatTrigger?: number
  onCurrentChatChange?: (chatId: string | null) => void
}

const CallInterface = ({ resetChatTrigger, onCurrentChatChange }: CallInterfaceProps = {}) => {
  const {
    userId,
    isInCall,
    isCalling,
    isReceivingCall,
    isCallActive,
    remoteStream,
    setIsReceivingCall,
    setIsCallActive,
    setError,
    endCall,
    targetUserId,
    callDurationSeconds,
    callerId,
    callerName
  } = useCallStore()

  // Initialize WebRTC
  useWebRTC()

  // Звуковые уведомления для звонков
  const { playEndCallSound } = useSoundNotifications()

  // Глобальный хук для создания сообщений о звонках (работает всегда)
  useCallMessages({ chatId: undefined, userId: userId || undefined })

  // Определение мобильного устройства
  const [isMobile, setIsMobile] = useState(false)

  // Определяем мобильное устройство при монтировании
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768) // md breakpoint
    }

    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)

    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  const supabase = createClient()

  // Состояние переподключения теперь обрабатывается глобально

  // УБРАНО: Больше не открываем чат автоматически после звонка

  // Состояние для автоматического восстановления чата из localStorage
  const [savedChatId, setSavedChatId] = useState<string | null>(null)

  // УБРАНО: selectedChat, showCreateModal, chatListRef теперь управляются в ChatApp

  // Состояние для отслеживания предыдущих состояний звонка
  const prevCallStateRef = useRef({
    isInCall: false,
    isCallActive: false,
    isCalling: false,
    isReceivingCall: false,
    targetUserId: '',
    callerId: '',
    callerName: ''
  })

  // УБРАНО: Функция поиска чата больше не нужна

  // Восстановление сохраненного чата из localStorage при загрузке
  // УБРАНО: Автоматическое восстановление чата при входе в аккаунт
  // Теперь чат восстанавливается только после звонка или при явном выборе

  // Отслеживаем состояния звонка для системных сообщений
  useEffect(() => {
    const prev = prevCallStateRef.current
    const current = {
      isInCall,
      isCallActive,
      isCalling,
      isReceivingCall,
      targetUserId,
      callerId: callerId || '',
      callerName: callerName || ''
    }

    // Определяем какой пользователь участвует в звонке
    const otherUserId = targetUserId || current.callerId
    const otherUserName = callerName || 'Пользователь'

    console.log('📞 Call state analysis:', {
      prev,
      current,
      otherUserId,
      otherUserName,
      callDurationSeconds
    })

    // Обработка пропущенного звонка
    if (prev.isCalling && !current.isCalling && !current.isCallActive && !current.isInCall && prev.targetUserId) {
      console.log('📞 Missed call detected - caller hung up before answer')
      setTimeout(() => handleMissedCall(prev.targetUserId, 'Вы'), 1000)
    }

    // Обработка отклонения входящего звонка (звонящий сбросил)
    if (prev.isReceivingCall && !current.isReceivingCall && !current.isCallActive && !current.isInCall && prev.callerId) {
      console.log('📞 Incoming call cancelled - caller hung up before answer')
      setTimeout(() => handleMissedCall(prev.callerId, prev.callerName || 'Пользователь'), 1000)
    }

    // Обработка завершения активного звонка
    if (prev.isCallActive && !current.isCallActive && !current.isInCall && callDurationSeconds > 0) {
      console.log('📞 Active call ended with duration:', callDurationSeconds)

      // Воспроизводим звук завершения звонка
      setTimeout(() => {
        playEndCallSound()
      }, 500) // Небольшая задержка, чтобы звук не пересекался с голосом

      if (otherUserId) {
        setTimeout(() => handleCallEnded(otherUserId, callDurationSeconds), 1000)
      }
    }

    // Обновляем предыдущее состояние
    prevCallStateRef.current = current
  }, [isInCall, isCallActive, isCalling, isReceivingCall, targetUserId, callerId, callerName, callDurationSeconds])

  // ВРЕМЕННО ОТКЛЮЧИЛИ системные сообщения - они вызывают 400 ошибки
  const handleMissedCall = async (userId: string, userName: string) => {
    console.log('🚨 СИСТЕМНЫЕ СООБЩЕНИЯ ОТКЛЮЧЕНЫ - Пропускаем пропущенный звонок')
    // Системные сообщения временно отключены из-за ошибок с несуществующими столбцами
  }

  const handleCallEnded = async (userId: string, duration: number) => {
    console.log('🚨 СИСТЕМНЫЕ СООБЩЕНИЯ ОТКЛЮЧЕНЫ - Пропускаем завершение звонка')
    // Системные сообщения временно отключены из-за ошибок с несуществующими столбцами
  }

  // УБРАНА НЕПРАВИЛЬНАЯ ЛОГИКА: Не переходим автоматически к чату после звонка!
  // Как в Telegram/Discord - пользователь остается там, где был до звонка

  // УБРАНО: Локальная подписка на звонки теперь обрабатывается глобально
  // через useGlobalCallManager в page.tsx

  // УБРАНО: Функции управления чатами теперь в ChatApp

  // УБРАНО: handleChatCreated теперь в ChatApp

  useEffect(() => {
    console.log('📞 CallInterface mounted - call listening is handled globally by useGlobalCallManager')
  }, [userId])

  // УБРАНО: Восстановление чата теперь обрабатывается в ChatApp через autoOpenChatId

  // ПРАВИЛЬНО: ChatApp всегда остается смонтированным
  // Компоненты звонка показываются поверх как модальные окна

  // Логируем изменения состояния только при реальных изменениях
  useEffect(() => {
    console.log('📱 CALL INTERFACE - Состояние изменилось:', {
      savedChatId,
      hasAutoOpenChat: !!savedChatId,
      isInCall,
      isCallActive,
      isReceivingCall,
      userId: userId?.slice(0, 8),
      timestamp: new Date().toISOString()
    })
  }, [savedChatId, isInCall, isCallActive, isReceivingCall, userId])

  return (
    <div className="h-full w-full">
      {/* Мобильная версия - модальные окна звонков */}
      <div className="md:hidden relative h-full w-full">
        {/* Основной чат */}
        <ChatApp
          autoOpenChatId={savedChatId || undefined}
          onResetChat={() => {}}
          resetTrigger={resetChatTrigger}
          onCurrentChatChange={onCurrentChatChange}
          layout="mobile"
        />

        {/* Модальные окна звонков на мобильных */}
        {isReceivingCall && isMobile && (
          <div className="absolute inset-0 z-50 bg-background">
            <IncomingCall />
          </div>
        )}

        {isInCall && isCallActive && (
          <div className="absolute inset-0 z-50 bg-background">
            <CallScreen />
          </div>
        )}
      </div>

      {/* Десктопная версия - ChatApp управляет всем */}
      <div className="hidden md:block h-full w-full relative">
        <ChatApp
          autoOpenChatId={savedChatId || undefined}
          resetTrigger={resetChatTrigger}
          onCurrentChatChange={onCurrentChatChange}
          layout="desktop"
          isInCall={isReceivingCall || (isInCall && isCallActive)}
        />

        {/* Звонки поверх области чата */}
        {isInCall && isCallActive && (
          <div className="absolute top-0 left-80 right-0 h-1/2 border-b border-border bg-background overflow-hidden z-10">
            <CallScreen />
          </div>
        )}
      </div>

        {/* Полноэкранное модальное окно входящего звонка (только для десктопа) */}
      {isReceivingCall && !isMobile && (
        <div className="fixed inset-0 z-50 bg-background">
          <IncomingCall />
        </div>
      )}

      {/* УБРАНО: CreateChatModal теперь в ChatApp */}
    </div>
  )
}

export default CallInterface
