import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      realtime: {
        // Оптимизированные настройки для стабильного WebSocket соединения
        params: {
          eventsPerSecond: 2, // Снижаем до 2 событий в секунду для стабильности
        },
        heartbeatIntervalMs: 30000, // 30 секунд
        reconnectAfterMs: function (tries: number) {
          // Более агрессивный backoff для стабильности
          return Math.min(tries * 2000, 30000) // До 30 секунд
        },
        logger: (level: string, message: string, details?: any) => {
          // Тихий лог, только ошибки и важные события
          if (level === 'error') {
            console.error('🔌 Supabase Realtime Error:', message, details?.error || details)
          }
          // Убираем verbose логи для стабильности
        },
        timeout: 20000 // Снижаем таймаут до 20 секунд
      }
    }
  )
}
