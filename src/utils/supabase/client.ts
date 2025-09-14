import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      realtime: {
        // Основные настройки для стабильного WebSocket соединения
        params: {
          eventsPerSecond: 10,
        },
        heartbeatIntervalMs: 30000, // 30 секунд
        reconnectAfterMs: function (tries: number) {
          return Math.min(tries * 1000, 10000) // Экспоненциальный backoff до 10 сек
        },
        logger: (level: string, message: string, details?: any) => {
          if (level === 'error') {
            console.error('Supabase Realtime Error:', message, details)
          } else if (level === 'warn') {
            console.warn('Supabase Realtime Warning:', message, details)
          } else {
            console.log(`Supabase Realtime [${level}]:`, message, details)
          }
        },
        timeout: 30000
      }
    }
  )
}
