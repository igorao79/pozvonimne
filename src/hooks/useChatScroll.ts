import { useRef, useCallback, useEffect } from 'react'

interface UseChatScrollProps {
  messagesLength: number
  loading: boolean
  loadingMore?: boolean
}

export const useChatScroll = ({ messagesLength, loading, loadingMore = false }: UseChatScrollProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const hasInitialScrolled = useRef(false)

  // Скролл к последнему сообщению (резкий, без анимации)
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({
          behavior: 'auto', // Резкая прокрутка без анимации
          block: 'end',
          inline: 'nearest'
        })
      })
    }
  }, [])

  // Резкая прокрутка к элементу (без анимации)
  const scrollToElement = useCallback((element: HTMLElement) => {
    if (element) {
      requestAnimationFrame(() => {
        element.scrollIntoView({
          behavior: 'auto', // Резкая прокрутка без анимации
          block: 'start',
          inline: 'nearest'
        })
      })
    }
  }, [])

  // Прокрутка только при первом входе в чат (убрана, теперь обрабатывается в ChatInterface)
  // useEffect(() => {
  //   if (!loading && !loadingMore && messagesLength > 0 && !hasInitialScrolled.current) {
  //     console.log('📜 Первоначальная прокрутка к низу при входе в чат')
  //     const timeoutId = setTimeout(() => {
  //       scrollToBottom()
  //       hasInitialScrolled.current = true // Отмечаем, что первоначальная прокрутка выполнена
  //     }, 100)
  //     return () => clearTimeout(timeoutId)
  //   }
  // }, [loading, loadingMore, messagesLength, scrollToBottom])

  return {
    messagesEndRef,
    scrollToBottom,
    scrollToElement,
    hasInitialScrolled: hasInitialScrolled.current
  }
}
