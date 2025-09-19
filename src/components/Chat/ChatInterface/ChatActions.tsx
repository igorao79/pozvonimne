import { useCallback } from 'react'
import useCallStore from '@/store/useCallStore'
import { sendIncomingCallSignal, sendCallCancelledSignal } from '@/utils/callSignaling'
import { Chat } from './types'

interface UseChatActionsProps {
  chat: Chat
  onError: (error: string) => void
}

export const useChatActions = ({ chat, onError }: UseChatActionsProps) => {
  const { userId, startCall, endCall } = useCallStore()

  // Обработка звонка
  const handleCall = useCallback(async () => {
    console.log('📞 HandleCall: Нажата кнопка звонка', {
      chatType: chat.type,
      otherParticipantId: chat.other_participant_id,
      chatId: chat.id,
      chatName: chat.name
    })

    if (chat.type === 'private' && chat.other_participant_id && userId) {
      console.log('📞 HandleCall: Запускаем звонок к пользователю:', chat.other_participant_id)

      try {
        // Используем надежную отправку сигнала входящего звонка
        const signalSent = await sendIncomingCallSignal(
          chat.other_participant_id,
          userId,
          chat.name || 'Неизвестный пользователь'
        )

        if (signalSent) {
          console.log('✅ HandleCall: Сигнал incoming_call отправлен успешно')
          // Запускаем локальную логику звонка
          startCall(chat.other_participant_id)
        } else {
          console.error('❌ HandleCall: Не удалось отправить сигнал звонка')
          onError('Не удалось установить соединение для звонка')
        }
      } catch (err) {
        console.error('💥 HandleCall: Критическая ошибка при отправке сигнала:', err)
        onError('Ошибка подключения к звонку')
      }
    } else {
      console.warn('📞 HandleCall: Невозможно запустить звонок', {
        reason: chat.type !== 'private' ? 'Не приватный чат' : 'Нет ID собеседника',
        chatType: chat.type,
        hasOtherParticipant: !!chat.other_participant_id
      })
    }
  }, [chat.type, chat.other_participant_id, chat.id, chat.name, userId, startCall, onError])

  // Обработка отмены звонка
  const handleCancelCall = useCallback(async () => {
    console.log('📞 HandleCancelCall: Отмена звонка к пользователю:', chat.other_participant_id)

    if (chat.type === 'private' && chat.other_participant_id && userId) {
      try {
        // Используем надежную отправку сигнала отмены звонка
        const signalSent = await sendCallCancelledSignal(
          chat.other_participant_id,
          userId,
          chat.name || 'Неизвестный пользователь'
        )

        if (signalSent) {
          console.log('✅ HandleCancelCall: Сигнал call_cancelled отправлен успешно')
        } else {
          console.warn('⚠️ HandleCancelCall: Не удалось отправить сигнал отмены')
        }
      } catch (err) {
        console.error('💥 HandleCancelCall: Ошибка при отправке сигнала отмены:', err)
        // Продолжаем отмену звонка даже при ошибке отправки сигнала
      }
    }

    // Завершаем звонок локально
    endCall()
  }, [chat.type, chat.other_participant_id, userId, endCall])

  return {
    handleCall,
    handleCancelCall
  }
}
