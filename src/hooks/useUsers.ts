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

  const fetchUsers = useCallback(async (forceRefresh: boolean = false) => {
    try {
      setLoading(true)
      setError(null)

      // Получаем текущего пользователя
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()

      if (authError) {
        setError('Ошибка аутентификации')
        return
      }

      if (!currentUser) {
        setUsers([])
        return
      }

      // Пробуем получить реальных пользователей через RPC функцию
      const { data, error } = await supabase.rpc('get_users_with_profiles')

      if (error) {
        // Fallback: пробуем базовую функцию get_users_list
        const { data: basicData, error: basicError } = await supabase.rpc('get_users_list')

        if (basicError) {
          throw new Error('Функции получения пользователей не настроены. Выполните SQL скрипт из файла supabase_setup.sql')
        }

        setUsers(basicData || [])
      } else {

        // Преобразуем данные с профилями в базовый формат
        const usersData: UserProfile[] = (data || []).map((user: any) => ({
          id: user.id,
          username: user.username,
          display_name: user.display_name,
          avatar_url: user.avatar_url,
          last_seen: user.last_seen,
          status: user.status
        }))

        setUsers(usersData)
      }

    } catch (err: any) {
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
        const result = await supabase.rpc('update_user_last_seen')

        // После обновления статуса, перезагружаем список пользователей
        setTimeout(() => {
          fetchUsers()
        }, 1000)

      } catch (err) {
        // Обработка ошибки обновления статуса
      }
    }

    // Heartbeat механизм для отслеживания активности
    const heartbeat = async () => {
      try {
        // Получаем текущего пользователя
        const currentUserId = await getCurrentUser()

        if (!currentUserId) {
          return
        }

        // Проверяем, нужно ли обновлять статус
        const { data: userData } = await supabase
          .from('user_profiles')
          .select('last_seen, status')
          .eq('id', currentUserId)
          .single()

        if (userData) {
          const timeSinceLastSeen = Date.now() - new Date(userData.last_seen).getTime()

          // Если прошло более 25 секунд, обновляем статус
          if (timeSinceLastSeen > 25000) {
            await updateLastSeen()
          }
        } else {
          await updateLastSeen()
        }
      } catch (err) {
        // Обработка ошибки heartbeat
      }
    }

    // Функция для установки статуса оффлайн
    const setOffline = async () => {
      try {
        const result = await supabase.rpc('set_user_offline')
      } catch (err) {
        // Обработка ошибки установки оффлайн
      }
    }


    updateLastSeen()

    // Heartbeat каждые 30 секунд для поддержания статуса онлайн
    const heartbeatInterval = setInterval(heartbeat, 30 * 1000)

    // Обновление списка пользователей каждые 15 секунд
    const fetchInterval = setInterval(() => {
      fetchUsers()
    }, 15 * 1000)

    // Переменные для хранения таймеров
    let inactivityTimer: NodeJS.Timeout | null = null
    let currentHeartbeatInterval: NodeJS.Timeout | null = null

    // Функции для управления heartbeat
    const startHeartbeat = () => {
      if (currentHeartbeatInterval) clearInterval(currentHeartbeatInterval)
      currentHeartbeatInterval = setInterval(heartbeat, 30 * 1000)
    }

    const stopHeartbeat = () => {
      if (currentHeartbeatInterval) {
        clearInterval(currentHeartbeatInterval)
        currentHeartbeatInterval = null
      }
    }

    // Запускаем heartbeat
    startHeartbeat()

    // Обработчик изменения видимости страницы
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        // Останавливаем heartbeat при неактивности
        stopHeartbeat()

        // Устанавливаем таймер для автоматического оффлайн через 30 секунд неактивности
        inactivityTimer = setTimeout(() => {
          if (document.hidden) {
            setOffline()
          }
        }, 30 * 1000) // 30 секунд для быстрого перехода в оффлайн
      } else {
        // Очищаем таймер неактивности
        if (inactivityTimer) {
          clearTimeout(inactivityTimer)
          inactivityTimer = null
        }

        // Запускаем heartbeat заново
        startHeartbeat()

        // Немедленно перезагружаем пользователей при возвращении активности
        setTimeout(() => {
          fetchUsers()
        }, 200)
      }
    }

    // Обработчик закрытия вкладки
    const handleBeforeUnload = () => {
      // Синхронный вызов для надежности
      try {
        supabase.rpc('set_user_offline')
      } catch (err) {
        // Обработка ошибки
      }
    }

    // Отслеживание активности пользователя (движение мыши, клики, клавиатура)
    let lastActivity = Date.now()
    const updateActivity = () => {
      lastActivity = Date.now()
    }

    // Добавляем обработчики активности
    document.addEventListener('mousedown', updateActivity)
    document.addEventListener('keydown', updateActivity)
    document.addEventListener('scroll', updateActivity)

    // Проверка активности каждые 10 секунд
    const activityCheckInterval = setInterval(() => {
      const now = Date.now()
      const inactiveTime = now - lastActivity

      // Если неактивен более 2 минут, переходим в оффлайн
      if (inactiveTime > 2 * 60 * 1000) {
        setOffline()
      }
    }, 10 * 1000)

    // Слушатель для принудительной перезагрузки пользователей
    const handleForceRefresh = () => {
      fetchUsers(true)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('force-refresh-users', handleForceRefresh)

    return () => {
      clearInterval(heartbeatInterval)
      clearInterval(fetchInterval)
      clearInterval(activityCheckInterval)
      if (inactivityTimer) {
        clearTimeout(inactivityTimer)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('force-refresh-users', handleForceRefresh)
      document.removeEventListener('mousedown', updateActivity)
      document.removeEventListener('keydown', updateActivity)
      document.removeEventListener('scroll', updateActivity)
      // Устанавливаем оффлайн при размонтировании компонента
      setOffline()
    }
  }, [fetchUsers])

  const refreshUsers = (forceRefresh: boolean = false) => {
    fetchUsers(forceRefresh)
  }

  // Функция для принудительного обновления всех неактивных пользователей
  const forceUpdateInactiveUsers = async () => {
    try {
      const result = await supabase.rpc('force_update_inactive_users')

      // Перезагружаем список пользователей
      setTimeout(() => {
        fetchUsers()
      }, 500)

      return result
    } catch (err) {
      return null
    }
  }

  // Оптимизированная подписка на изменения статусов пользователей
  useEffect(() => {
    let updateTimeout: NodeJS.Timeout

    const channel = supabase
      .channel('user_profiles_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE', // Только обновления статуса
          schema: 'public',
          table: 'user_profiles'
        },
        (payload) => {
          // Дебаунсинг обновлений - избегаем частых запросов к БД
          clearTimeout(updateTimeout)
          updateTimeout = setTimeout(() => {
            fetchUsers()
          }, 1000) // Обновляем через 1 секунду после последнего изменения
        }
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR') {
          const errorMessage = err || 'Unknown subscription error'
          console.warn('Ошибка realtime подписки пользователей, продолжаем с polling:', errorMessage)
          // При ошибке realtime продолжаем работать с обычным polling
        }
      })

    return () => {
      clearTimeout(updateTimeout)
      supabase.removeChannel(channel)
    }
  }, []) // Убрали fetchUsers из зависимостей

  return { users, loading, error, refreshUsers, forceUpdateInactiveUsers }
}

export default useUsers
