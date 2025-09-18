'use client'

import { useEffect, useMemo } from 'react'
import useCallStore from '@/store/useCallStore'
import { createClient } from '@/utils/supabase/client'

export const useConnectionHandler = () => {
  const { isInCall, userId, targetUserId, endCall } = useCallStore()
  
  // Мемоизируем клиент Supabase чтобы избежать постоянного пересоздания useEffect
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    if (!isInCall || !userId) return

    // Handle page visibility change (tab switch, minimize)
    const handleVisibilityChange = () => {
      if (document.hidden && isInCall) {
        console.log('Page hidden during call - maintaining connection')
      }
    }

    // Handle page unload (close tab, refresh, etc.)
    const handleBeforeUnload = async () => {
      if (isInCall && targetUserId) {
        // Send disconnect signal
        try {
          const channel = supabase.channel(`calls:${targetUserId}`)
          await channel.subscribe()
          await channel.send({
            type: 'broadcast',
            event: 'call_ended',
            payload: {
              ended_by: userId,
              reason: 'page_unload'
            }
          })
        } catch (err) {
          console.error('Error sending disconnect signal:', err)
        }
      }
    }

    // Handle network disconnection
    const handleOnline = () => {
      console.log('Network reconnected')
    }

    const handleOffline = () => {
      console.log('Network disconnected')
      if (isInCall) {
        endCall()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [isInCall, userId, targetUserId, endCall]) // Убираем supabase из зависимостей
}

export default useConnectionHandler
