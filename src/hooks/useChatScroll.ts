import { useRef, useCallback, useEffect } from 'react'

interface UseChatScrollProps {
  messagesLength: number
  loading: boolean
  loadingMore?: boolean
}

export const useChatScroll = ({ messagesLength, loading, loadingMore = false }: UseChatScrollProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const hasInitialScrolled = useRef(false)

  // Скролл к последнему сообщению
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
          inline: 'nearest'
        })
      })
    }
  }, [])

  // Прокрутка только при первом входе в чат
  useEffect(() => {
    if (!loading && !loadingMore && messagesLength > 0 && !hasInitialScrolled.current) {
      console.log('📜 Первоначальная прокрутка к низу при входе в чат')
      const timeoutId = setTimeout(() => {
        scrollToBottom()
        hasInitialScrolled.current = true // Отмечаем, что первоначальная прокрутка выполнена
      }, 100)
      return () => clearTimeout(timeoutId)
    }
  }, [loading, loadingMore, messagesLength, scrollToBottom])

  return {
    messagesEndRef,
    scrollToBottom,
    hasInitialScrolled: hasInitialScrolled.current
  }
}
