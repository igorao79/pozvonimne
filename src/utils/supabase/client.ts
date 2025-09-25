import { createBrowserClient } from '@supabase/ssr'

// Функция для получения правильного redirect URL
export function getRedirectUrl(path: string = '/auth/callback') {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${path}`
  }
  
  // Fallback для server-side
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pozvonimne.vercel.app'
  return `${baseUrl}${path}`
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      },
      realtime: {
        // Оптимизированные настройки для стабильного WebSocket соединения
        params: {
          eventsPerSecond: 2, // Снижаем до 2 событий в секунду для стабильности
        },
        heartbeatIntervalMs: 15000, // 🔥 ИСПРАВЛЕНИЕ: 15 секунд - компромисс между 5 и 30
        reconnectAfterMs: function (tries: number) {
          // 🔥 ИСПРАВЛЕНИЕ: Умеренное переподключение
          return Math.min(tries * 1000, 10000) // До 10 секунд - компромисс
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
