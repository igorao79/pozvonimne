'use client'

import { useState, useEffect } from 'react'
import useSupabaseStore from '@/store/useSupabaseStore'
import useCallStore from '@/store/useCallStore'

export function useUserStatus() {
  const [isBanned, setIsBanned] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const { supabase } = useSupabaseStore()
  const { isAuthenticated, user } = useCallStore()

  // Проверяем статус бана и права администратора при аутентификации
  useEffect(() => {
    const checkStatus = async () => {
      if (!isAuthenticated || !user?.id) {
        setIsBanned(false)
        setIsAdmin(false)
        return
      }

      try {
        // Проверяем статус бана
        const { data: banData, error: banError } = await supabase.rpc('check_user_ban_status')
        if (!banError && banData?.[0]) {
          setIsBanned(banData[0].is_banned)
        }

        // Проверяем права администратора
        const { data: adminData, error: adminError } = await supabase.rpc('is_admin')
        if (!adminError) {
          setIsAdmin(adminData)
        }
      } catch (err) {
        console.error('Error checking ban status and admin rights:', err)
        // При ошибке сбрасываем статусы
        setIsBanned(false)
        setIsAdmin(false)
      }
    }

    checkStatus()
  }, [isAuthenticated, user?.id, supabase])

  return {
    isBanned,
    isAdmin,
    setIsBanned
  }
}
