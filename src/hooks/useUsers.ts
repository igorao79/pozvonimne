'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { User } from '@supabase/supabase-js'

interface UserProfile {
  id: string
  username: string
  display_name: string
  avatar_url?: string
  last_seen: string | null
  status?: string
}

export const useUsers = () => {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  // Получаем текущего пользователя
  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id
  }

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('🔄 Начинаем загрузку пользователей...')

      // Получаем текущего пользователя
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      console.log('👤 Текущий пользователь:', currentUser?.id)

      // Пробуем получить реальных пользователей через RPC функцию
      const { data, error } = await supabase.rpc('get_users_with_profiles')

      if (error) {
        console.warn('RPC функция get_users_with_profiles не найдена:', error.message)

        // Fallback: пробуем базовую функцию get_users_list
        const { data: basicData, error: basicError } = await supabase.rpc('get_users_list')

        if (basicError) {
          console.warn('RPC функция get_users_list не найдена:', basicError.message)
          throw new Error('Функции получения пользователей не настроены. Выполните SQL скрипт из файла supabase_setup.sql')
        }

        console.log('📊 Получены базовые данные пользователей:', basicData?.length || 0)
        console.log('👥 Детали базовых пользователей:', basicData?.map((u: any) => ({
          id: u.id?.substring(0, 8),
          email: u.email,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at
        })))
        setUsers(basicData || [])
      } else {
        console.log('📊 Получены данные пользователей с профилями:', data?.length || 0)
        console.log('👥 Сырые данные пользователей:')
        data?.forEach((u: any, index: number) => {
          console.log(`   Пользователь ${index + 1}:`, {
            id: u.id?.substring(0, 8),
            username: u.username,
            display_name: u.display_name,
            avatar_url: u.avatar_url,
            status: u.status,
            last_seen: u.last_seen,
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at
          })
        })

        // Преобразуем данные с профилями в базовый формат
        const usersData: UserProfile[] = (data || []).map((user: any) => ({
          id: user.id,
          username: user.username,
          display_name: user.display_name,
          avatar_url: user.avatar_url,
          last_seen: user.last_seen,
          status: user.status
        }))

        console.log('🔄 Преобразованные данные пользователей:', usersData.length)
        console.log('👥 Детали преобразованных пользователей:')
        usersData.forEach((u, index) => {
          console.log(`   Преобразованный пользователь ${index + 1}:`, {
            id: u.id.substring(0, 8),
            username: u.username,
            display_name: u.display_name,
            avatar_url: u.avatar_url,
            status: u.status,
            last_seen: u.last_seen
          })
        })
        setUsers(usersData)
      }

    } catch (err: any) {
      console.error('❌ Ошибка загрузки пользователей:', err)
      setError(err.message)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchUsers()

    // Обновляем статус активности текущего пользователя
    const updateLastSeen = async () => {
      try {
        console.log('🟢 Вызываем update_user_last_seen')
        const result = await supabase.rpc('update_user_last_seen')
        console.log('✅ update_user_last_seen выполнен:', result)
      } catch (err) {
        console.error('❌ Ошибка update_user_last_seen:', err)
      }
    }

    // Функция для установки статуса оффлайн
    const setOffline = async () => {
      try {
        console.log('🔴 Вызываем set_user_offline')
        const result = await supabase.rpc('set_user_offline')
        console.log('✅ set_user_offline выполнен:', result)
      } catch (err) {
        console.error('❌ Ошибка set_user_offline:', err)
      }
    }

    updateLastSeen()

    // Обновляем каждые 2 минуты для более точного онлайн статуса
    const interval = setInterval(updateLastSeen, 2 * 60 * 1000)

    // Обработчик изменения видимости страницы
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('👁️ Вкладка стала неактивной, document.hidden =', document.hidden)
        // Устанавливаем таймер для автоматического оффлайн через 3 минуты неактивности
        setTimeout(() => {
          if (document.hidden) {
            console.log('⏰ Вкладка неактивна более 3 минут, вызываем setOffline')
            setOffline()
          } else {
            console.log('✅ Вкладка снова активна, отменяем setOffline')
          }
        }, 3 * 60 * 1000)
      } else {
        console.log('👁️ Вкладка стала активной, document.hidden =', document.hidden)
        updateLastSeen() // Обновляем статус при возвращении
      }
    }

    // Обработчик закрытия вкладки
    const handleBeforeUnload = () => {
      console.log('🚪 Вкладка закрывается, вызываем setOffline')
      // Синхронный вызов для надежности
      try {
        supabase.rpc('set_user_offline').then(() => {
          console.log('✅ Офлайн статус установлен при закрытии вкладки')
        })
      } catch (err) {
        console.error('❌ Ошибка установки офлайн при закрытии:', err)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      // Устанавливаем оффлайн при размонтировании компонента
      setOffline()
    }
  }, [fetchUsers])

  const refreshUsers = () => {
    fetchUsers()
  }

  return { users, loading, error, refreshUsers }
}

export default useUsers
