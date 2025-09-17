import { useRef, useCallback, useEffect } from 'react'

interface UseChatScrollProps {
  messagesLength: number
  loading: boolean
}

export const useChatScroll = ({ messagesLength, loading }: UseChatScrollProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Скролл к последнему сообщению
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      // Используем requestAnimationFrame для лучшей синхронизации
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
          inline: 'nearest'
        })
      })
    }
  }, [])

  // Автоматическая прокрутка при загрузке сообщений
  useEffect(() => {
    if (!loading && messagesLength > 0) {
      console.log('📜 Автоматическая прокрутка к низу после загрузки, сообщений:', messagesLength)
      // Небольшая задержка для того, чтобы DOM полностью обновился
      const timeoutId = setTimeout(() => {
        scrollToBottom()
      }, 100)
      return () => clearTimeout(timeoutId)
    }
  }, [messagesLength, loading, scrollToBottom])

  // Прокрутка при получении новых сообщений
  useEffect(() => {
    if (messagesLength > 0) {
      const lastMessage = messagesLength
      // Прокручиваем вниз для всех новых сообщений
      console.log('📜 Прокрутка к новому сообщению')
      const timeoutId = setTimeout(() => {
        scrollToBottom()
      }, 50)
      return () => clearTimeout(timeoutId)
    }
  }, [messagesLength, scrollToBottom])

  // Прокрутка к низу при первом входе в чат (даже если сообщений нет)
  useEffect(() => {
    if (!loading) {
      console.log('📜 Прокрутка к низу при входе в чат')
      const timeoutId = setTimeout(() => {
        scrollToBottom()
      }, 50)
      return () => clearTimeout(timeoutId)
    }
  }, [loading, scrollToBottom])

  return {
    messagesEndRef,
    scrollToBottom
  }
}
