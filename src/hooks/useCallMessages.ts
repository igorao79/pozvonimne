import { useEffect, useRef } from 'react'
import useCallStore from '@/store/useCallStore'
import { createClient } from '@/utils/supabase/client'
import useChatSyncStore from '@/store/useChatSyncStore'

interface UseCallMessagesProps {
  chatId?: string
  userId?: string
}

export const useCallMessages = ({ chatId, userId }: UseCallMessagesProps) => {
  const supabase = createClient()
  const { refreshChatList } = useChatSyncStore()
  
  const {
    isCalling,
    isCallActive,
    isInCall,
    isReceivingCall,
    callDurationSeconds,
    targetUserId,
    callerId
  } = useCallStore()

  // Простые ref'ы для отслеживания состояния
  const callMessageIdRef = useRef<string | null>(null)
  const lastCallChatIdRef = useRef<string | null>(null) // Сохраняем ID чата
  const lastOtherUserIdRef = useRef<string | null>(null) // Сохраняем ID собеседника
  const wasCallActiveRef = useRef<boolean>(false) // Флаг: был ли звонок активным
  const lastCallStateRef = useRef({
    isCalling: false,
    isCallActive: false,
    isInCall: false,
    isReceivingCall: false
  })

  // Функция для получения или создания чата
  const getOrCreateChat = async (): Promise<string | null> => {
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
    }

  // Создание сообщения о звонке (может создать любой участник)
  const createCallMessage = async () => {
    // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Проверяем, нет ли уже активного сообщения
    if (callMessageIdRef.current) {
      console.log('📞 createCallMessage: Уже есть активное сообщение, пропускаем создание:', callMessageIdRef.current.slice(0, 8))
      return
    }
    
    // Определяем кто звонит и кому
    const actualCallerId = isCalling ? userId : callerId
    const actualTargetId = isCalling ? targetUserId : userId
    
    console.log('📞 createCallMessage: Проверяем условия', {
      isCalling,
      isReceivingCall,
      userId: userId?.slice(0, 8),
      targetUserId: targetUserId?.slice(0, 8),
      callerId: callerId?.slice(0, 8),
      actualCallerId: actualCallerId?.slice(0, 8),
      actualTargetId: actualTargetId?.slice(0, 8),
      existingMessageId: callMessageIdRef.current?.slice(0, 8)
    })
    
    if (!actualCallerId || !actualTargetId || !userId) {
      console.log('📞 createCallMessage: Недостаточно данных для создания сообщения')
      return
    }
    
    const callChatId = await getOrCreateChat()
    if (!callChatId) {
      console.log('📞 createCallMessage: Не удалось получить ID чата')
      return
    }

    try {
      console.log('📞 createCallMessage: Создаем сообщение', {
        chat_uuid: callChatId.slice(0, 8),
        caller_uuid: actualCallerId.slice(0, 8),
        call_status: 'started'
      })

      const { data, error } = await supabase.rpc('create_call_message', {
        chat_uuid: callChatId,
        caller_uuid: actualCallerId, // Тот кто звонит
        call_status: 'started',
        call_start_time: new Date().toISOString()
      })

      if (error) {
        console.error('❌ Ошибка создания сообщения:', error)
        return
      }

      callMessageIdRef.current = data
      
      // Сохраняем данные о звонке для последующего использования
      lastCallChatIdRef.current = callChatId
      lastOtherUserIdRef.current = actualTargetId
      
      console.log('✅ Создано сообщение о звонке:', data)
      
      // Принудительно обновляем чат МГНОВЕННО
      refreshChatList()
    } catch (err) {
      console.error('❌ Ошибка при создании сообщения:', err)
    }
  }

  // Принудительное завершение всех активных сообщений о звонках
  const forceEndAllActiveCallMessages = async () => {
    if (!userId) return
    
    try {
      console.log('🔥 ПРИНУДИТЕЛЬНОЕ ЗАВЕРШЕНИЕ: Ищем и завершаем все активные сообщения о звонках')
      
      const { data, error } = await supabase.rpc('force_end_active_call_messages', {
        user_uuid: userId
      })
      
      if (error) {
        console.error('❌ Ошибка принудительного завершения сообщений:', error)
      } else {
        console.log('✅ Принудительно завершено сообщений:', data)
        // Принудительно обновляем чат МГНОВЕННО
        refreshChatList()
      }
    } catch (err) {
      console.error('❌ Ошибка при принудительном завершении:', err)
    }
  }

  // Обновление сообщения о звонке (любой участник может обновить)
  const updateCallMessage = async (status: string, duration: number = 0) => {
    const callChatId = await getOrCreateChat()
    if (!callChatId || !userId) {
      console.log('📞 updateCallMessage: Нет чата или пользователя')
      return
    }
    
      // Если у нас нет ID сообщения, попробуем найти последнее активное сообщение о звонке
      let messageId = callMessageIdRef.current
      if (!messageId) {
        console.log('📞 updateCallMessage: Нет ID сообщения, ищем активное сообщение через SQL')
        // Передаем null в SQL функцию, чтобы она сама нашла активное сообщение
        messageId = null
      }

    // Определяем кто был звонящим (тот кто инициировал звонок)
    const actualCallerId = isCalling ? userId : callerId || userId
    
    console.log('📞 updateCallMessage: Обновляем сообщение', {
      chat_uuid: callChatId.slice(0, 8),
      caller_uuid: actualCallerId?.slice(0, 8),
      new_status: status,
      call_duration: duration,
      message_uuid: messageId?.slice(0, 8)
    })
    
    try {
      const { data, error } = await supabase.rpc('update_call_message', {
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

      console.log('✅ Обновлено сообщение о звонке:', status, 'ID:', data?.slice(0, 8))
      
      // Принудительно обновляем чат МГНОВЕННО
      refreshChatList()
      
      // НЕ сбрасываем состояние здесь - это делается в основном useEffect мгновенно
      console.log('✅ Сообщение обновлено, состояние сброшено в основном useEffect')
    } catch (err) {
      console.error('❌ Ошибка при обновлении сообщения:', err)
    }
  }

  // Основная логика
  useEffect(() => {
    console.log('📞 useCallMessages: Hook triggered', {
      userId: userId?.slice(0, 8),
      chatId: chatId?.slice(0, 8),
      isCalling,
      isCallActive,
      isInCall,
      isReceivingCall,
      targetUserId: targetUserId?.slice(0, 8),
      callerId: callerId?.slice(0, 8)
    })

    if (!userId) {
      console.log('📞 useCallMessages: No userId, skipping')
      return
    }

      const currentState = {
      isCalling,
      isCallActive,
      isInCall,
      isReceivingCall
    }

    const prevState = lastCallStateRef.current

    console.log('📞 Call state change:', {
      prev: prevState,
      current: currentState,
      userId: userId.slice(0, 8),
      targetUserId: targetUserId?.slice(0, 8),
      callerId: callerId?.slice(0, 8),
      callMessageId: callMessageIdRef.current?.slice(0, 8)
    })

    // 1. Начало звонка - создаем сообщение (любой участник может создать)
    if ((!prevState.isCalling && currentState.isCalling && targetUserId) ||
        (!prevState.isReceivingCall && currentState.isReceivingCall && callerId)) {
      console.log('📞 Начинаю звонок или получаю входящий - создаю сообщение')
      createCallMessage()
    }

    // 2. Звонок принят - обновляем статус (любой участник)
    if (!prevState.isCallActive && currentState.isCallActive) {
      console.log('📞 Звонок принят - обновляю статус')
      wasCallActiveRef.current = true // Помечаем, что звонок был активным
      updateCallMessage('active')
    }

    // 3. Звонок завершен после активного разговора (любой участник)
    if (prevState.isCallActive && !currentState.isCallActive && !currentState.isInCall) {
      console.log('📞 Активный звонок завершен - обновляю статус с продолжительностью:', callDurationSeconds)
      
      // КРИТИЧЕСКИ ВАЖНО: Сначала обновляем наше сообщение
      updateCallMessage('ended', callDurationSeconds)
      
      // ЗАТЕМ принудительно завершаем ВСЕ активные сообщения (на случай если есть дубли)
      console.log('🔥 ПРИНУДИТЕЛЬНО завершаем ВСЕ активные сообщения о звонках')
      forceEndAllActiveCallMessages()
      
      // МГНОВЕННО сбрасываем состояние - больше никаких задержек!
      callMessageIdRef.current = null
      lastCallChatIdRef.current = null
      lastOtherUserIdRef.current = null
      wasCallActiveRef.current = false
      console.log('🧹 МГНОВЕННЫЙ сброс после завершения звонка')
    }

    // 4. Звонок отменен/пропущен (только звонящий и ТОЛЬКО если звонок НЕ был активным)
    if (prevState.isCalling && !currentState.isCalling && !currentState.isCallActive && !currentState.isInCall && 
        callMessageIdRef.current && !wasCallActiveRef.current) {
      console.log('📞 Звонок пропущен/отменен (НЕ был активным) - обновляю статус')
      updateCallMessage('missed')
      
      // МГНОВЕННО сбрасываем состояние - больше никаких задержек!
      callMessageIdRef.current = null
      lastCallChatIdRef.current = null
      lastOtherUserIdRef.current = null
      wasCallActiveRef.current = false
      console.log('🧹 МГНОВЕННЫЙ сброс после пропущенного звонка')
    }

    // 5. ДОПОЛНИТЕЛЬНАЯ ЗАЩИТА: Если пользователь больше не в звонке, через 2 секунды принудительно завершаем все активные сообщения
    if (!currentState.isCalling && !currentState.isCallActive && !currentState.isInCall && !currentState.isReceivingCall) {
      if (prevState.isCalling || prevState.isCallActive || prevState.isInCall || prevState.isReceivingCall) {
        console.log('🛡️ ДОПОЛНИТЕЛЬНАЯ ЗАЩИТА: Пользователь больше не в звонке, через 2 сек принудительно завершим ВСЕ активные сообщения')
        
        setTimeout(() => {
          // Проверяем еще раз - может быть пользователь снова в звонке
          const { isCalling, isCallActive, isInCall, isReceivingCall } = useCallStore.getState()
          if (!isCalling && !isCallActive && !isInCall && !isReceivingCall) {
            console.log('🛡️ ДОПОЛНИТЕЛЬНАЯ ЗАЩИТА: Пользователь все еще не в звонке, ПРИНУДИТЕЛЬНО завершаем ВСЕ активные сообщения')
            forceEndAllActiveCallMessages()
          } else {
            console.log('🛡️ ДОПОЛНИТЕЛЬНАЯ ЗАЩИТА: Пользователь снова в звонке, НЕ завершаем сообщения')
          }
        }, 2000)
      }
    }

      lastCallStateRef.current = currentState
  }, [userId, isCalling, isCallActive, isInCall, isReceivingCall, callDurationSeconds, targetUserId, callerId])

  // Сброс при размонтировании
  useEffect(() => {
    return () => {
      // Просто очищаем состояние без принудительного завершения
      console.log('🔥 РАЗМОНТИРОВАНИЕ: Очищаем состояние useCallMessages')
      callMessageIdRef.current = null
      lastCallChatIdRef.current = null
      lastOtherUserIdRef.current = null
      wasCallActiveRef.current = false
    }
  }, [])
}