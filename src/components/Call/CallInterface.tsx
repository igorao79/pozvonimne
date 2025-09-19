'use client'

import { useEffect, useState, useRef } from 'react'
import useCallStore from '@/store/useCallStore'
import { createClient } from '@/utils/supabase/client'
import useWebRTC from '@/hooks/useWebRTC'
import { CallControls, IncomingCall, CallScreen, DialPad } from '.'
import { ChatApp } from '../Chat'
import { ChatList } from '../Chat'
import { ChatInterface } from '../Chat'
import { CreateChatModal } from '../Chat'
import { RandomFact } from '@/components/ui/random-fact'
import { sendCallEndedMessage, sendMissedCallMessage } from '@/utils/callSystemMessages'

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

  // Состояние чатов для десктопной версии
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const chatListRef = useRef<any>(null)

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

  // Функции управления чатами для десктопной версии
  const handleChatSelect = (chat: Chat) => {
    console.log('💾 CALL INTERFACE - Выбран чат:', {
      chatId: chat.id,
      chatName: chat.name
    })
    setSelectedChat(chat)
  }

  const handleBackToList = () => {
    console.log('💾 CALL INTERFACE - Очищаем выбранный чат')
    setSelectedChat(null)
  }

  const handleCreateNewChat = () => {
    setShowCreateModal(true)
  }

  const handleChatCreated = async (chatId: string) => {
    console.log('Чат создан:', chatId)
    setShowCreateModal(false)

    // Принудительно обновляем список чатов
    if (chatListRef.current?.refreshChats) {
      await chatListRef.current.refreshChats()
    }

    // Автоматически выбираем созданный чат
    setTimeout(async () => {
      if (chatListRef.current?.findAndSelectChat) {
        const chat = await chatListRef.current.findAndSelectChat(chatId)
        if (chat) {
          setSelectedChat(chat)
        }
      }
    }, 500)
  }

  useEffect(() => {
    console.log('📞 CallInterface mounted - call listening is handled globally by useGlobalCallManager')
  }, [userId])

  // Восстановление выбранного чата из localStorage
  useEffect(() => {
    const savedChatId = localStorage.getItem('selectedChatId')
    const savedChatName = localStorage.getItem('selectedChatName')

    if (savedChatId && chatListRef.current?.findAndSelectChat) {
      console.log('🔄 CALL INTERFACE - Восстанавливаем чат из localStorage:', savedChatId)

      chatListRef.current.findAndSelectChat(savedChatId)
        .then((chat: Chat | null) => {
          if (chat) {
            console.log('✅ CALL INTERFACE - Чат успешно восстановлен:', chat.name)
            setSelectedChat(chat)
          } else {
            console.log('⚠️ CALL INTERFACE - Сохраненный чат не найден')
            localStorage.removeItem('selectedChatId')
            localStorage.removeItem('selectedChatName')
            localStorage.removeItem('selectedChatTimestamp')
          }
        })
        .catch((error: unknown) => {
          console.error('❌ CALL INTERFACE - Ошибка восстановления чата:', error)
          localStorage.removeItem('selectedChatId')
          localStorage.removeItem('selectedChatName')
          localStorage.removeItem('selectedChatTimestamp')
        })
    }
  }, [])

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
    <div className="h-full w-full">
      {/* Мобильная версия - модальные окна звонков */}
      <div className="md:hidden relative h-full w-full">
        {/* Основной чат */}
        <ChatApp
          autoOpenChatId={savedChatId || undefined}
          onResetChat={() => {}}
          resetTrigger={resetChatTrigger}
        />

        {/* Модальные окна звонков на мобильных */}
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

      {/* Десктопная версия - звонок внутри области чата */}
      <div className="hidden md:flex h-full w-full overflow-hidden">
        {/* Левая панель - список чатов (всегда видна) */}
        <div className="w-80 bg-card border-r border-border flex-shrink-0 overflow-hidden">
          <ChatList
            ref={chatListRef}
            onChatSelect={handleChatSelect}
            onCreateNewChat={handleCreateNewChat}
            selectedChatId={selectedChat?.id}
          />
        </div>

        {/* Правая панель - интерфейс чата с возможным звонком */}
        <div className="flex-1 bg-background overflow-hidden flex flex-col">
          {/* Верхняя половина - звонок (только активный звонок, входящий - модальное окно) */}
          {isInCall && isCallActive && (
            <div className="h-1/2 border-b border-border bg-background overflow-hidden">
              <CallScreen />
            </div>
          )}

          {/* Нижняя половина - интерфейс чата */}
          <div className={`${isInCall && isCallActive ? 'h-1/2' : 'h-full'} overflow-hidden`}>
            {selectedChat ? (
              <ChatInterface
                chat={selectedChat}
                onBack={handleBackToList}
                isInCall={isReceivingCall || (isInCall && isCallActive)}
              />
            ) : (
              <div className="h-full flex items-center justify-center p-4 chat-pattern-bg">
                <div className="text-center max-w-md">
                  <div className="bg-card/80 backdrop-blur-sm rounded-lg p-6 border border-border/50 mb-4">
                    <svg className="w-12 h-12 mx-auto text-muted-foreground mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <h3 className="text-lg font-medium text-foreground mb-2">Выберите чат</h3>
                    <p className="text-muted-foreground text-sm">Выберите чат из списка или создайте новый</p>
                  </div>
                  <RandomFact />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Полноэкранное модальное окно входящего звонка (только для десктопа) */}
      {isReceivingCall && (
        <div className="hidden md:block fixed inset-0 z-50 bg-background">
          <IncomingCall />
        </div>
      )}

      {/* Модал создания чата */}
      <CreateChatModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onChatCreated={handleChatCreated}
      />
    </div>
  )
}

export default CallInterface
