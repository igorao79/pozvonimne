'use client'

import { useEffect, useState, useRef } from 'react'
import useCallStore from '@/store/useCallStore'
import { createClient } from '@/utils/supabase/client'
import useWebRTC from '@/hooks/useWebRTC'
import { CallControls, IncomingCall, CallScreen, DialPad } from '.'
import { ChatApp } from '../Chat'
import { sendCallEndedMessage, sendMissedCallMessage } from '@/utils/callSystemMessages'

interface CallInterfaceProps {
  resetChatTrigger?: number
}

const CallInterface = ({ resetChatTrigger }: CallInterfaceProps = {}) => {
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

  const supabase = createClient()

  // Состояние переподключения теперь обрабатывается глобально

  // УБРАНО: Больше не открываем чат автоматически после звонка
  
  // Состояние для автоматического восстановления чата из localStorage
  const [savedChatId, setSavedChatId] = useState<string | null>(null)
  
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
  
  useEffect(() => {
    console.log('📞 CallInterface mounted - call listening is handled globally by useGlobalCallManager')
  }, [userId])

  // ПРАВИЛЬНО: ChatApp всегда остается смонтированным
  // Компоненты звонка показываются поверх как модальные окна
  
  console.log('📱 CALL INTERFACE - Рендер чата:', {
    savedChatId,
    hasAutoOpenChat: !!savedChatId,
    isInCall,
    isCallActive,
    isReceivingCall,
    timestamp: new Date().toISOString()
  })

  return (
    <div className="relative h-full w-full">
      {/* Основной чат - ВСЕГДА смонтирован */}
      <ChatApp 
        autoOpenChatId={savedChatId || undefined} 
        onResetChat={() => {}} 
        resetTrigger={resetChatTrigger} 
      />

      {/* Модальные окна звонков - показываются ПОВЕРХ чата */}
      {isReceivingCall && (
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
  )
}

export default CallInterface
