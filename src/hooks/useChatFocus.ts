import { useRef, useCallback, useEffect } from 'react'
import { MessageInputRef } from '@/components/Chat/ChatInterface/MessageInput'

export const useChatFocus = () => {
  const messageInputRef = useRef<MessageInputRef>(null)

  // Функция для фокуса на input поле
  const focusInput = useCallback(() => {
    if (messageInputRef.current) {
      messageInputRef.current.focus()
    }
  }, [])

  // Автофокус на input при монтировании компонента
  useEffect(() => {
    const timer = setTimeout(() => {
      focusInput()
    }, 100) // Небольшая задержка для корректного монтирования DOM
    return () => clearTimeout(timer)
  }, [focusInput])

  // Автофокус после отправки сообщения
  const focusAfterSend = useCallback(() => {
    setTimeout(() => focusInput(), 50)
  }, [focusInput])

  return {
    messageInputRef,
    focusInput,
    focusAfterSend
  }
}
