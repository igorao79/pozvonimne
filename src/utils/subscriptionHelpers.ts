/**
 * Утилиты для безопасной работы с подписками Supabase Realtime
 */

export interface SubscriptionStatus {
  status: string
  error?: any
}

/**
 * Безопасно логирует ошибки подписки, обрабатывая undefined значения
 */
export function logSubscriptionError(context: string, error: any): string {
  if (error === undefined || error === null) {
    return `No error details provided (context: ${context})`
  }
  
  if (typeof error === 'string') {
    return error
  }
  
  // Более детальное логирование ошибок
  if (error?.message) {
    const additional = []
    if (error.code) additional.push(`code: ${error.code}`)
    if (error.status) additional.push(`status: ${error.status}`)
    if (error.type) additional.push(`type: ${error.type}`)
    if (error.reason) additional.push(`reason: ${error.reason}`)
    
    const details = additional.length > 0 ? ` (${additional.join(', ')})` : ''
    return `${error.message}${details}`
  }
  
  // Если это объект ошибки без message
  if (typeof error === 'object') {
    const errorInfo = []
    if (error.code !== undefined) errorInfo.push(`code: ${error.code}`)
    if (error.status !== undefined) errorInfo.push(`status: ${error.status}`)
    if (error.type !== undefined) errorInfo.push(`type: ${error.type}`)
    if (error.reason !== undefined) errorInfo.push(`reason: ${error.reason}`)
    if (error.name !== undefined) errorInfo.push(`name: ${error.name}`)
    
    if (errorInfo.length > 0) {
      return `Error details: ${errorInfo.join(', ')}`
    }
  }
  
  try {
    return JSON.stringify(error)
  } catch {
    return `Unknown error (could not serialize, type: ${typeof error})`
  }
}

/**
 * Создает стандартный обработчик статуса подписки с безопасным логированием
 */
export function createSubscriptionHandler(
  context: string,
  options: {
    onSubscribed?: () => void
    onError?: (error: string) => void
    onTimeout?: (error: string) => void
    onClosed?: () => void
    suppressExpectedErrors?: boolean // Новый флаг для подавления ожидаемых ошибок
  } = {}
) {
  const { suppressExpectedErrors = false } = options
  
  return (status: string, err?: any) => {
    // Более тихое логирование для нормальных операций
    const shouldLogError = !suppressExpectedErrors || status !== 'CHANNEL_ERROR'
    const shouldLogVerbose = !context.includes('calls:') && !context.includes('webrtc:')

    if (shouldLogVerbose) {
      console.log(`📡 [${context}] Subscription status:`, status, err ? logSubscriptionError(context, err) : 'No error')
    }

    switch (status) {
      case 'SUBSCRIBED':
        console.log(`📡 [${context}] Successfully subscribed`)
        options.onSubscribed?.()
        break
        
      case 'CHANNEL_ERROR':
        const errorMessage = logSubscriptionError(context, err)
        
        // Проверяем, является ли это ожидаемой ошибкой при закрытии
        const isExpectedCloseError = (
          errorMessage.includes('User-Initiated Abort') ||
          errorMessage.includes('Close called') ||
          errorMessage.includes('connection closed') ||
          errorMessage.includes('No error details provided')
        )
        
        if (shouldLogError && !isExpectedCloseError) {
          console.error(`📡 [${context}] Channel error:`, errorMessage)
        } else if (isExpectedCloseError && shouldLogVerbose) {
          console.log(`📡 [${context}] Expected close:`, errorMessage)
        }
        
        // Все равно вызываем callback, но только для неожиданных ошибок
        if (!isExpectedCloseError) {
          options.onError?.(errorMessage)
        }
        break
        
      case 'TIMED_OUT':
        const timeoutMessage = logSubscriptionError(context, err)
        console.warn(`📡 [${context}] Subscription timeout:`, timeoutMessage)
        options.onTimeout?.(timeoutMessage)
        break
        
      case 'CLOSED':
        if (shouldLogVerbose) {
          console.log(`📡 [${context}] Subscription closed`)
        }
        options.onClosed?.()
        break
        
      default:
        if (shouldLogVerbose) {
          console.log(`📡 [${context}] Unknown status:`, status)
        }
    }
  }
}

/**
 * Утилита для безопасной очистки каналов
 */
export function safeRemoveChannel(supabase: any, channel: any, context: string = 'Unknown') {
  try {
    if (channel) {
      console.log(`🧹 [${context}] Removing channel:`, channel.topic)
      supabase.removeChannel(channel)
    }
  } catch (error) {
    console.warn(`🧹 [${context}] Error removing channel:`, logSubscriptionError(context, error))
  }
}

/**
 * Безопасно отписывается от канала
 */
export function safeUnsubscribe(channel: any, context: string = 'Unknown') {
  try {
    if (channel) {
      console.log(`🧹 [${context}] Unsubscribing from channel:`, channel.topic)
      channel.unsubscribe()
    }
  } catch (error) {
    console.warn(`🧹 [${context}] Error unsubscribing:`, logSubscriptionError(context, error))
  }
}

/**
 * Проверяет состояние канала и логирует информацию
 */
export function checkChannelHealth(channel: any, context: string = 'Unknown') {
  if (!channel) {
    console.warn(`🔍 [${context}] Channel is null/undefined`)
    return false
  }
  
  console.log(`🔍 [${context}] Channel health:`, {
    topic: channel.topic,
    state: channel.state,
    hasSocketConnection: !!channel.socket,
    socketState: channel.socket?.readyState
  })
  
  return channel.state === 'joined' || channel.state === 'joining'
}

/**
 * Создает переподключение с экспоненциальной задержкой
 */
export function createReconnectionManager(
  reconnectFn: () => void,
  maxAttempts: number = 3,
  baseDelay: number = 1000
) {
  let attempts = 0
  let timeoutId: NodeJS.Timeout | null = null

  const reconnect = () => {
    if (attempts >= maxAttempts) {
      console.error(`🔄 Max reconnection attempts (${maxAttempts}) reached`)
      return false
    }

    attempts++
    const delay = baseDelay * Math.pow(2, attempts - 1) // Экспоненциальная задержка
    
    console.log(`🔄 Reconnection attempt ${attempts}/${maxAttempts} in ${delay}ms`)
    
    timeoutId = setTimeout(() => {
      try {
        reconnectFn()
      } catch (error) {
        console.error('🔄 Reconnection failed:', error)
      }
    }, delay)

    return true
  }

  const reset = () => {
    attempts = 0
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  return { reconnect, reset, cancel, getAttempts: () => attempts }
}
