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
      console.log('📞 Обновление сообщения о звонке:', { callChatId, callerId, newStatus, duration, messageId: callMessageIdRef.current })

      const { data, error } = await supabase.rpc('update_call_message', {
        chat_uuid: callChatId,
        caller_uuid: callerId,
        new_status: newStatus,
        call_duration: duration,
        message_uuid: callMessageIdRef.current // Передаем конкретный ID сообщения
      })

      if (error) {
        console.error('Ошибка при обновлении сообщения о звонке:', error)
      } else {
        console.log('✅ Обновлено сообщение о звонке:', data)
      }
    } catch (error) {
      console.error('Ошибка при обновлении сообщения о звонке:', error)
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

    // Определяем ID звонящего
    const currentCallerId = callerId || targetUserId || userId

      // Логика создания/обновления сообщений о звонке
    // Проверяем только изменения состояния, игнорируя начальную инициализацию

    // 1. Начало звонка (кто-то начал звонить) - только если это новое событие
    if ((isCalling || isReceivingCall) && !prevState.isCalling && !prevState.isReceivingCall) {
      console.log('📞 Начало звонка - создаем сообщение')
      createCallStartedMessage(callChatId, currentCallerId)
    }

    // 2. Звонок принят и идет - только если был started и стал active
    else if (isCallActive && !prevState.isCallActive && (prevState.isCalling || prevState.isReceivingCall)) {
      console.log('📞 Звонок принят - обновляем статус на active')
      updateCallMessage(callChatId, currentCallerId, 'active')
    }

    // 3. Звонок завершен - только если был активным и завершился
    else if (!isInCall && prevState.isInCall && prevState.isCallActive) {
      console.log('📞 Звонок завершен - обновляем статус на ended')
      const duration = Math.floor(callDurationSeconds)
      updateCallMessage(callChatId, currentCallerId, 'ended', duration)
      callMessageIdRef.current = null // Сбрасываем ID сообщения
    }

    // 4. Звонок отклонен - только если был входящий звонок и не стал активным
    else if (!isReceivingCall && prevState.isReceivingCall && !prevState.isCallActive && !isCallActive) {
      console.log('📞 Звонок отклонен - обновляем статус на rejected')
      updateCallMessage(callChatId, currentCallerId, 'rejected')
      callMessageIdRef.current = null
    }

    // 5. Отмена исходящего звонка - только если был исходящий звонок и не стал активным
    else if (!isCalling && prevState.isCalling && !prevState.isCallActive && !isCallActive && !isReceivingCall) {
      console.log('📞 Отмена исходящего звонка - обновляем статус на missed')
      updateCallMessage(callChatId, currentCallerId, 'missed')
      callMessageIdRef.current = null
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

  return {
    callMessageId: callMessageIdRef.current
  }
}
