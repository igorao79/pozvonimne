import { useCallback } from 'react'
import useCallStore from '@/store/useCallStore'
import { sendIncomingCallSignal, sendCallCancelledSignal } from '@/utils/callSignaling'
import { Chat } from './types'

interface UseChatActionsProps {
  chat: Chat
  onError: (error: string) => void
}

export const useChatActions = ({ chat, onError }: UseChatActionsProps) => {
  const { userId, startCall, endCall, canInitiateCall, isCallInitiating } = useCallStore()

  // Обработка звонка
  const handleCall = useCallback(async () => {
    console.log('📞 HandleCall: Нажата кнопка звонка', {
      chatType: chat.type,
      otherParticipantId: chat.other_participant_id,
      chatId: chat.id,
      chatName: chat.name
    })

    // Проверяем возможность инициации звонка
    if (!canInitiateCall()) {
      console.log('❌ HandleCall: Звонок заблокирован защитой')
      onError('Подождите перед повторным звонком')
      return
    }

    if (isCallInitiating) {
      console.log('❌ HandleCall: Звонок уже инициируется')
      return
    }

    if (chat.type === 'private' && chat.other_participant_id && userId) {
      console.log('📞 HandleCall: Запускаем звонок к пользователю:', chat.other_participant_id)

      try {
        // Сначала устанавливаем локальное состояние звонка с защитой
        const callStarted = startCall(chat.other_participant_id) as boolean
        if (callStarted === false) {
          console.log('❌ HandleCall: Не удалось запустить звонок - заблокировано')
          onError('Не удалось инициировать звонок')
          return
        }

        // Теперь отправляем сигнал
        console.log('📞 HandleCall: Отправляем сигнал входящего звонка...')
        const signalSent = await sendIncomingCallSignal(
          chat.other_participant_id,
          userId,
          chat.name || 'Неизвестный пользователь'
        )

        if (signalSent) {
          console.log('✅ HandleCall: Сигнал incoming_call отправлен успешно')
        } else {
          console.error('❌ HandleCall: Не удалось отправить сигнал звонка')
          endCall() // Отменяем локальный звонок если сигнал не отправился
          onError('Не удалось установить соединение для звонка')
        }
      } catch (err) {
        console.error('💥 HandleCall: Критическая ошибка при отправке сигнала:', err)
        endCall() // Отменяем локальный звонок при ошибке
        onError('Ошибка подключения к звонку')
      }
    } else {
      console.warn('📞 HandleCall: Невозможно запустить звонок', {
        reason: chat.type !== 'private' ? 'Не приватный чат' : 'Нет ID собеседника',
        chatType: chat.type,
        hasOtherParticipant: !!chat.other_participant_id
      })
    }
  }, [chat.type, chat.other_participant_id, chat.id, chat.name, userId, startCall, endCall, onError, canInitiateCall, isCallInitiating])

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
