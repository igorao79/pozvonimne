import { useRef, useCallback, useEffect, useState } from 'react'
import { MessageInputRef } from '@/components/Chat/ChatInterface/MessageInput'

export const useChatFocus = () => {
  const messageInputRef = useRef<MessageInputRef>(null)
  const [isActive, setIsActive] = useState(true)

  // Функция для фокуса на input поле
  const focusInput = useCallback(() => {
    if (messageInputRef.current && isActive) {
      messageInputRef.current.focus()
    }
  }, [isActive])

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

  // Постоянный фокус - восстанавливаем фокус при любых взаимодействиях
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      // Не восстанавливаем фокус если кликнули на input или emoji picker
      const target = e.target as Element
      const isInputClick = target?.closest?.('input[type="text"]')
      const isEmojiPickerClick = target?.closest?.('[data-emoji-picker]')
      const isModalClick = target?.closest?.('[role="dialog"]')
      const isButtonClick = target?.tagName === 'BUTTON' && !target?.closest?.('form')

      // Восстанавливаем фокус если:
      // - Не кликнули на сам input
      // - Не кликнули на emoji picker
      // - Не кликнули на модальные окна
      // - Не кликнули на кнопки вне формы
      if (!isInputClick && !isEmojiPickerClick && !isModalClick && !isButtonClick && isActive) {
        setTimeout(() => focusInput(), 10)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Не перехватываем системные комбинации клавиш
      if (e.ctrlKey || e.altKey || e.metaKey) return

      // Не перехватываем функциональные клавиши
      if (e.key === 'Escape' || e.key === 'Tab' || e.key.startsWith('F')) return

      // Не перехватываем клавиши навигации в других элементах
      const activeElement = document.activeElement
      if (activeElement && activeElement !== document.body &&
          activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA') {
        return
      }

      // Если фокус не на input и пользователь начал набирать текст
      if (activeElement !== messageInputRef.current && isActive) {
        focusInput()
      }
    }

    const handleWindowFocus = () => {
      // Восстанавливаем фокус при возвращении в окно браузера
      if (isActive) {
        setTimeout(() => focusInput(), 100)
      }
    }

    const handleVisibilityChange = () => {
      // Восстанавливаем фокус при возвращении на вкладку
      if (!document.hidden && isActive) {
        setTimeout(() => focusInput(), 100)
      }
    }

    // Добавляем обработчики событий
    document.addEventListener('click', handleGlobalClick)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('focus', handleWindowFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('click', handleGlobalClick)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('focus', handleWindowFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [focusInput, isActive])

  // Функция для временного отключения автофокуса
  const disableAutoFocus = useCallback(() => {
    setIsActive(false)
  }, [])

  // Функция для включения автофокуса
  const enableAutoFocus = useCallback(() => {
    setIsActive(true)
    // Немедленно устанавливаем фокус
    setTimeout(() => focusInput(), 10)
  }, [focusInput])

  return {
    messageInputRef,
    focusInput,
    focusAfterSend,
    disableAutoFocus,
    enableAutoFocus,
    isAutoFocusActive: isActive
  }
}
