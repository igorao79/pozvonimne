import { useEffect, useRef } from 'react'
import useSupabaseStore from '@/store/useSupabaseStore'
import useCallStore from '@/store/useCallStore'

interface UseCallMessagesProps {
  chatId?: string
  userId?: string
}

export const useCallMessages = ({ chatId, userId }: UseCallMessagesProps) => {
  const { supabase } = useSupabaseStore()
  const {
    isInCall,
    isCallActive,
    isCalling,
    isReceivingCall,
    callStartTime,
    callDurationSeconds,
    targetUserId,
    callerId
  } = useCallStore()

  const lastCallStateRef = useRef({
    isInCall: false,
    isCallActive: false,
    isCalling: false,
    isReceivingCall: false,
    callStartTime: null as number | null,
    callDurationSeconds: 0
  })

  const callMessageIdRef = useRef<string | null>(null)
  const callInProgressRef = useRef<boolean>(false)

  // Определяем ID чата для звонка
  const getCallChatId = () => {
    if (chatId) return chatId

    // Если чат не передан, находим приватный чат между текущим пользователем и собеседником
    if (userId && targetUserId) {
      // Это нужно реализовать через запрос к базе данных
      // Пока возвращаем null, предполагая что chatId всегда передается
      return null
    }

    return null
  }

  // Создание сообщения о начале звонка
  const createCallStartedMessage = async (callChatId: string, callerId: string) => {
    try {
      console.log('📞 Создание сообщения о начале звонка:', { callChatId, callerId })

      const { data, error } = await supabase.rpc('create_call_message', {
        chat_uuid: callChatId,
        caller_uuid: callerId,
        call_status: 'started',
        call_start_time: new Date().toISOString()
      })

      if (error) {
        console.error('Ошибка при создании сообщения о звонке:', error)
      } else {
        callMessageIdRef.current = data
        console.log('✅ Создано сообщение о начале звонка:', data)
      }
    } catch (error) {
      console.error('Ошибка при создании сообщения о звонке:', error)
    }
  }

  // Обновление статуса сообщения о звонке
  const updateCallMessage = async (callChatId: string, callerId: string, newStatus: string, duration: number = 0) => {
    try {
      console.log('📞 Обновление сообщения о звонке:', {
        callChatId,
        callerId,
        newStatus,
        duration,
        messageId: callMessageIdRef.current,
        callInProgress: callInProgressRef.current
      })

      if (!callMessageIdRef.current) {
        console.error('❌ Нет ID сообщения для обновления!')
        return
      }

      const { data, error } = await supabase.rpc('update_call_message', {
        chat_uuid: callChatId,
        caller_uuid: callerId,
        new_status: newStatus,
        call_duration: duration,
        message_uuid: callMessageIdRef.current // Передаем конкретный ID сообщения
      })

      if (error) {
        console.error('❌ Ошибка при обновлении сообщения о звонке:', error)
        console.error('❌ Детали ошибки:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
      } else {
        console.log('✅ Обновлено сообщение о звонке:', data)
      }
    } catch (error) {
      console.error('❌ Исключение при обновлении сообщения о звонке:', error)
    }
  }

  // Отслеживание изменений состояния звонка
  useEffect(() => {
    const currentState = {
      isInCall,
      isCallActive,
      isCalling,
      isReceivingCall,
      callStartTime,
      callDurationSeconds
    }

    const prevState = lastCallStateRef.current
    const callChatId = getCallChatId()

    if (!callChatId || !userId) return

    // КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: Определяем кто должен создавать/обновлять сообщения
    // Сообщения создает только тот, кто начал звонок (имеет targetUserId)
    // Получатель звонка (имеет callerId) НЕ создает сообщения, только инициатор
    const isCallInitiator = isCalling && targetUserId && !callerId
    const isCallReceiver = isReceivingCall && callerId && !targetUserId

    console.log('🔍 Call state debug:', {
      userId,
      callerId,
      targetUserId,
      isCalling,
      isReceivingCall,
      isCallActive,
      isInCall,
      callInProgress: callInProgressRef.current,
      hasMessageId: !!callMessageIdRef.current,
      isCallInitiator,
      isCallReceiver,
      logic: isCallInitiator ? 'Я ИНИЦИАТОР - буду создавать сообщения' : 
             isCallReceiver ? 'Я ПОЛУЧАТЕЛЬ - НЕ буду создавать сообщения' : 
             'НЕТ АКТИВНОЙ РОЛИ'
    })

    // ТОЛЬКО ИНИЦИАТОР создает и управляет сообщениями о звонке
    if (!isCallInitiator) {
      console.log('📞 Я НЕ инициатор звонка - не создаю сообщения')
      lastCallStateRef.current = currentState
      return
    }

    // Логика создания/обновления сообщений о звонке - ТОЛЬКО ДЛЯ ИНИЦИАТОРА

    // 1. Начало звонка - только ИНИЦИАТОР создает сообщение
    if (isCalling && !prevState.isCalling && !callInProgressRef.current) {
      console.log('📞 Я ИНИЦИАТОР - создаю сообщение о начале звонка')
      callInProgressRef.current = true
      createCallStartedMessage(callChatId, userId) // Передаем userId как caller_id
    }

    // 2. Звонок принят и идет - обновляем только если у нас есть созданное сообщение
    else if (isCallActive && !prevState.isCallActive && callMessageIdRef.current && callInProgressRef.current) {
      console.log('📞 Звонок принят - обновляем статус на active')
      updateCallMessage(callChatId, userId, 'active')
    }

    // 3. Звонок завершен - обновляем только если у нас есть созданное сообщение
    else if (!isInCall && prevState.isInCall && callMessageIdRef.current && callInProgressRef.current) {
      console.log('📞 Звонок завершен - обновляем статус на ended')
      const duration = Math.floor(callDurationSeconds)
      updateCallMessage(callChatId, userId, 'ended', duration)
      callMessageIdRef.current = null // Сбрасываем ID сообщения
      callInProgressRef.current = false // Сбрасываем флаг звонка
    }

    // 4. Звонок отклонен получателем - обновляем только если у нас есть созданное сообщение (только инициатор)
    else if (!isCalling && prevState.isCalling && !prevState.isCallActive && !isCallActive && callMessageIdRef.current && callInProgressRef.current) {
      console.log('📞 Звонок отклонен - обновляем статус на rejected')
      updateCallMessage(callChatId, userId, 'rejected')
      callMessageIdRef.current = null
      callInProgressRef.current = false
    }

    // 5. Отмена исходящего звонка - обновляем только если у нас есть созданное сообщение (только инициатор)
    else if (!isCalling && prevState.isCalling && !prevState.isCallActive && !isCallActive && callMessageIdRef.current && callInProgressRef.current) {
      console.log('📞 Отмена исходящего звонка - обновляем статус на missed')
      updateCallMessage(callChatId, userId, 'missed')
      callMessageIdRef.current = null
      callInProgressRef.current = false
    }

    // Сохраняем текущее состояние
    lastCallStateRef.current = currentState
  }, [
    isInCall,
    isCallActive,
    isCalling,
    isReceivingCall,
    callStartTime,
    callDurationSeconds,
    chatId,
    userId,
    targetUserId,
    callerId
  ])

  // Сброс состояния при размонтировании
  useEffect(() => {
    return () => {
      callMessageIdRef.current = null
      callInProgressRef.current = false
      console.log('🧹 useCallMessages cleanup: сброс состояния')
    }
  }, [])

  return {
    callMessageId: callMessageIdRef.current
  }
}
