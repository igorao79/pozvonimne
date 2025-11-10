import { useEffect, useRef, useCallback } from 'react'
import useCallStore from '@/store/useCallStore'
import { createClient } from '@/utils/supabase/client'

interface UseCallMessagesProps {
  chatId?: string
  userId?: string
}

export const useCallMessages = ({ chatId, userId }: UseCallMessagesProps) => {
  const supabase = createClient()

  const {
    isCalling,
    isCallActive,
    isInCall,
    isReceivingCall,
    callDurationSeconds,
    targetUserId,
    callerId
  } = useCallStore()

  // Ref'ы для отслеживания
  const callMessageIdRef = useRef<string | null>(null)
  const lastCallChatIdRef = useRef<string | null>(null)
  const lastOtherUserIdRef = useRef<string | null>(null)
  const wasCallActiveRef = useRef<boolean>(false)
  const lastCallStateRef = useRef({
    isCalling: false,
    isCallActive: false,
    isInCall: false,
    isReceivingCall: false
  })

  // Debounce refs для предотвращения дублирования обновлений
  const createMessageTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const updateMessageTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Функция для получения или создания чата
  const getOrCreateChat = useCallback(async (): Promise<string | null> => {
    if (chatId) return chatId

    // Используем сохраненный ID чата, если есть
    if (lastCallChatIdRef.current) {
      console.log('📞 getOrCreateChat: Используем сохраненный ID чата:', lastCallChatIdRef.current.slice(0, 8))
      return lastCallChatIdRef.current
    }
    
    // Определяем второго участника в зависимости от роли
    let otherUserId = isCalling ? targetUserId : callerId

    // Если текущие состояния пустые, используем сохраненное значение
    if (!otherUserId && lastOtherUserIdRef.current) {
      otherUserId = lastOtherUserIdRef.current
      console.log('📞 getOrCreateChat: Используем сохраненный ID собеседника:', otherUserId.slice(0, 8))
    }
    
    console.log('📞 getOrCreateChat: Определяем участников', {
      userId: userId?.slice(0, 8),
      otherUserId: otherUserId?.slice(0, 8),
      isCalling,
      isReceivingCall,
      targetUserId: targetUserId?.slice(0, 8),
      callerId: callerId?.slice(0, 8),
      savedChatId: lastCallChatIdRef.current?.slice(0, 8),
      savedOtherUserId: lastOtherUserIdRef.current?.slice(0, 8)
    })
    
    if (!userId || !otherUserId) {
      console.log('📞 getOrCreateChat: Недостаточно данных для создания чата')
      return null
    }

    try {
      const { data, error } = await supabase.rpc('create_or_get_private_chat', {
        other_user_id: otherUserId
      })
      
      if (error) {
        console.error('❌ Ошибка получения чата:', error)
        return null
      }

      // Сохраняем полученные данные для последующего использования
      lastCallChatIdRef.current = data
      lastOtherUserIdRef.current = otherUserId
      
      console.log('✅ Получен ID чата:', data?.slice(0, 8))
      return data
    } catch (err) {
      console.error('❌ Ошибка создания чата:', err)
      return null
    }
  }, [chatId, isCalling, isReceivingCall, targetUserId, callerId, userId, supabase])

  // Создание сообщения о звонке
  const createCallMessage = useCallback(async () => {
    if (callMessageIdRef.current) {
      console.log('📞 Уже есть сообщение о звонке')
      return
    }

    const actualCallerId = isCalling ? userId : callerId
    const actualTargetId = isCalling ? targetUserId : userId

    if (!actualCallerId || !actualTargetId) {
      console.log('📞 Недостаточно данных для создания сообщения')
      return
    }

    const callChatId = await getOrCreateChat()
    if (!callChatId) {
      console.log('📞 Не удалось получить ID чата')
      return
    }

    try {
      console.log('📞 Создаем сообщение о звонке')

      const { data, error } = await supabase.rpc('create_call_message', {
        chat_uuid: callChatId,
        caller_uuid: actualCallerId,
        call_status: 'started',
        call_start_time: new Date().toISOString()
      })

      if (error) {
        console.error('❌ Ошибка создания сообщения:', error)
        return
      }

      callMessageIdRef.current = data
      lastCallChatIdRef.current = callChatId
      lastOtherUserIdRef.current = actualTargetId

      console.log('✅ Создано сообщение о звонке:', data)
    } catch (err) {
      console.error('❌ Ошибка при создании сообщения:', err)
    }
  }, [userId, isCalling, callerId, targetUserId, supabase, getOrCreateChat])


  // Обновление сообщения о звонке
  const updateCallMessage = useCallback(async (status: string, duration: number = 0) => {
    const callChatId = await getOrCreateChat()
    if (!callChatId || !userId) {
      console.log('📞 Нет чата или пользователя')
      return
    }

    const actualCallerId = isCalling ? userId : callerId || userId
    const messageId = callMessageIdRef.current

    console.log('📞 Обновляем сообщение о звонке:', status, 'duration:', duration)

    try {
      const { error } = await supabase.rpc('update_call_message', {
        chat_uuid: callChatId,
        caller_uuid: actualCallerId,
        new_status: status,
        call_duration: duration,
        message_uuid: messageId
      })

      if (error) {
        console.error('❌ Ошибка обновления сообщения:', error)
        return
      }

      console.log('✅ Обновлено сообщение о звонке:', status)
    } catch (err) {
      console.error('❌ Ошибка при обновлении сообщения:', err)
    }
  }, [getOrCreateChat, userId, isCalling, callerId, supabase])

  // Real-time подписка на изменения call messages
  useEffect(() => {
    if (!userId) return

    console.log('📞🔄 Настраиваем real-time подписку на call messages для пользователя:', userId.slice(0, 8))

    const messagesChannel = supabase
      .channel(`call_messages_${userId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'messages',
          filter: `type=eq.call`
        }, 
        (payload) => {
          const newData = payload.new as Record<string, unknown> | null
          const oldData = payload.old as Record<string, unknown> | null
          
          console.log('📞🔄 Real-time изменение call message:', {
            event: payload.eventType,
            messageId: (newData?.id as string)?.slice(0, 8) || (oldData?.id as string)?.slice(0, 8),
            chatId: (newData?.chat_id as string)?.slice(0, 8) || (oldData?.chat_id as string)?.slice(0, 8),
            senderId: (newData?.sender_id as string)?.slice(0, 8) || (oldData?.sender_id as string)?.slice(0, 8),
            metadata: newData?.metadata || oldData?.metadata,
            currentUserId: userId.slice(0, 8)
          })
          
          // Проверяем, относится ли это изменение к нам
          const messageData = newData || oldData
          if (!messageData) return
          
          // Проверяем, участвует ли текущий пользователь в этом чате
          const isOurMessage = messageData.sender_id === userId
          const chatId = messageData.chat_id as string
          const metadata = messageData.metadata as Record<string, unknown> | null
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            console.log('📞🔄 Call message создано/обновлено:', {
              isOurMessage,
              status: metadata?.status,
              duration: metadata?.duration
            })
            
            // Если сообщение не наше, сохраняем его ID для синхронизации
            if (!isOurMessage && metadata?.status) {
              console.log('📞🔄 Обновляем callMessageId с real-time данными:', (messageData.id as string)?.slice(0, 8))
              callMessageIdRef.current = messageData.id as string
              lastCallChatIdRef.current = chatId
            }
          }
        })
      .subscribe()

    return () => {
      console.log('📞🔄 Отписываемся от real-time call messages')
      messagesChannel.unsubscribe()
      
      // Очищаем debounce таймеры
      if (createMessageTimeoutRef.current) {
        clearTimeout(createMessageTimeoutRef.current)
        createMessageTimeoutRef.current = null
      }
      if (updateMessageTimeoutRef.current) {
        clearTimeout(updateMessageTimeoutRef.current)
        updateMessageTimeoutRef.current = null
      }
    }
  }, [userId, supabase])

  // Основная логика управления сообщениями о звонках
  useEffect(() => {
    if (!userId) return

    const currentState = { isCalling, isCallActive, isInCall, isReceivingCall }
    const prevState = lastCallStateRef.current

    console.log('📞 Состояние звонка изменилось:', { prev: prevState, current: currentState })

    // 1. Начало звонка - создаем сообщение
    if ((isCalling && !prevState.isCalling) || (isReceivingCall && !prevState.isReceivingCall)) {
      console.log('📞 Начинаем звонок - создаем сообщение')
      callMessageIdRef.current = null // Сбрасываем старое сообщение
      createCallMessage()
    }

    // 2. Звонок принят - обновляем на "в прямом эфире"
    if (isCallActive && !prevState.isCallActive) {
      console.log('📞 Звонок принят - обновляем статус')
      updateCallMessage('active')
    }

    // 3. Звонок завершен - обновляем с длительностью
    if (!isCallActive && !isInCall && prevState.isCallActive) {
      console.log('📞 Звонок завершен - обновляем с длительностью')
      updateCallMessage('ended', callDurationSeconds)
      callMessageIdRef.current = null // Сбрасываем после завершения
    }

    // 4. Звонок отменен/не принят
    if (!isCalling && !isCallActive && !isInCall && prevState.isCalling && !prevState.isCallActive) {
      console.log('📞 Звонок не принят - обновляем статус')
      updateCallMessage('missed', callDurationSeconds || 1)
      callMessageIdRef.current = null // Сбрасываем после отмены
    }

    lastCallStateRef.current = currentState
  }, [userId, isCalling, isCallActive, isInCall, isReceivingCall, callDurationSeconds, createCallMessage, updateCallMessage])

  // Сброс при размонтировании
  useEffect(() => {
    return () => {
      // Просто очищаем состояние без принудительного завершения
      console.log('🔥 РАЗМОНТИРОВАНИЕ: Очищаем состояние useCallMessages')
      
      // Очищаем debounce таймеры
      if (createMessageTimeoutRef.current) {
        clearTimeout(createMessageTimeoutRef.current)
        createMessageTimeoutRef.current = null
      }
      if (updateMessageTimeoutRef.current) {
        clearTimeout(updateMessageTimeoutRef.current)
        updateMessageTimeoutRef.current = null
      }
      
      callMessageIdRef.current = null
      lastCallChatIdRef.current = null
      lastOtherUserIdRef.current = null
      wasCallActiveRef.current = false
    }
  }, [])
}