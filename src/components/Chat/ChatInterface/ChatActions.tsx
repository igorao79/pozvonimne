import { useCallback } from 'react'
import useCallStore from '@/store/useCallStore'
import useSupabaseStore from '@/store/useSupabaseStore'
import { Chat } from './types'

interface UseChatActionsProps {
  chat: Chat
  onError: (error: string) => void
}

export const useChatActions = ({ chat, onError }: UseChatActionsProps) => {
  const { userId, startCall, endCall } = useCallStore()
  const { supabase } = useSupabaseStore()

  // Обработка звонка
  const handleCall = useCallback(async () => {
    console.log('📞 HandleCall: Нажата кнопка звонка', {
      chatType: chat.type,
      otherParticipantId: chat.other_participant_id,
      chatId: chat.id,
      chatName: chat.name
    })

    if (chat.type === 'private' && chat.other_participant_id) {
      console.log('📞 HandleCall: Запускаем звонок к пользователю:', chat.other_participant_id)

      // Отправляем сигнал incoming_call receiver'у
      try {
        const receiverChannelId = `calls:${chat.other_participant_id}`
        console.log('📞 HandleCall: Отправляем сигнал в канал:', receiverChannelId)

        const result = await supabase.channel(receiverChannelId).send({
          type: 'broadcast',
          event: 'incoming_call',
          payload: {
            caller_id: userId,
            caller_name: chat.name || 'Неизвестный пользователь',
            timestamp: Date.now()
          }
        })

        console.log('📞 HandleCall: Сигнал incoming_call отправлен:', result)

        if (result === 'ok') {
          // Теперь запускаем локальную логику звонка
          startCall(chat.other_participant_id)
        } else {
          console.error('📞 HandleCall: Ошибка отправки сигнала incoming_call:', result)
          onError('Ошибка отправки сигнала звонка')
        }
      } catch (err) {
        console.error('📞 HandleCall: Ошибка при отправке сигнала:', err)
        onError('Ошибка подключения к звонку')
      }
    } else {
      console.warn('📞 HandleCall: Невозможно запустить звонок', {
        reason: chat.type !== 'private' ? 'Не приватный чат' : 'Нет ID собеседника',
        chatType: chat.type,
        hasOtherParticipant: !!chat.other_participant_id
      })
    }
  }, [chat.type, chat.other_participant_id, chat.id, chat.name, userId, startCall, supabase, onError])

  // Обработка отмены звонка
  const handleCancelCall = useCallback(async () => {
    console.log('📞 HandleCancelCall: Отмена звонка к пользователю:', chat.other_participant_id)

    if (chat.type === 'private' && chat.other_participant_id) {
      try {
        // Отправляем сигнал отмены звонка receiver'у
        const receiverChannelId = `calls:${chat.other_participant_id}`
        console.log('📞 HandleCancelCall: Отправляем сигнал отмены в канал:', receiverChannelId)

        const result = await supabase.channel(receiverChannelId).send({
          type: 'broadcast',
          event: 'call_cancelled',
          payload: {
            caller_id: userId,
            timestamp: Date.now()
          }
        })

        console.log('📞 HandleCancelCall: Сигнал call_cancelled отправлен:', result)

        if (result !== 'ok') {
          console.warn('📞 HandleCancelCall: Предупреждение при отправке сигнала отмены:', result)
        }
      } catch (err) {
        console.error('📞 HandleCancelCall: Ошибка при отправке сигнала отмены:', err)
        // Продолжаем отмену звонка даже при ошибке отправки сигнала
      }
    }

    // Завершаем звонок локально
    endCall()
  }, [chat.type, chat.other_participant_id, userId, endCall, supabase])

  return {
    handleCall,
    handleCancelCall
  }
}
