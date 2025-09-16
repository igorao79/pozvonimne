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
            last_sign_in_at: u.last_sign_in_at,
            last_seen_type: typeof u.last_seen
          })
        })

        // Преобразуем данные с профилями в базовый формат
        const usersData: UserProfile[] = (data || []).map((user: any) => {
          console.log('🔧 Преобразование пользователя:', user.id?.substring(0, 8), {
            last_seen_raw: user.last_seen,
            last_seen_type: typeof user.last_seen,
            status: user.status
          })

          return {
            id: user.id,
            username: user.username,
            display_name: user.display_name,
            avatar_url: user.avatar_url,
            last_seen: user.last_seen,
            status: user.status
          }
        })

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

        // После обновления статуса, перезагружаем список пользователей
        setTimeout(() => {
          console.log('🔄 Перезагружаем список пользователей после обновления статуса')
          fetchUsers()
        }, 1000)

      } catch (err) {
        console.error('❌ Ошибка update_user_last_seen:', err)
      }
    }

    // Heartbeat механизм для отслеживания активности
    const heartbeat = async () => {
      try {
        console.log('💓 Heartbeat: обновляем активность пользователя')

        // Получаем текущего пользователя
        const currentUserId = await getCurrentUser()

        if (!currentUserId) {
          console.log('❌ Текущий пользователь не найден')
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
          console.log(`⏰ Время с последнего посещения: ${Math.round(timeSinceLastSeen / 1000)} сек`)

          // Если прошло более 25 секунд, обновляем статус
          if (timeSinceLastSeen > 25000) {
            console.log('🔄 Время обновлять статус')
            await updateLastSeen()
          } else {
            console.log('✅ Статус еще свежий, пропускаем обновление')
          }
        } else {
          await updateLastSeen()
        }
      } catch (err) {
        console.error('❌ Ошибка heartbeat:', err)
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
      console.log('🚀 Heartbeat запущен')
    }

    const stopHeartbeat = () => {
      if (currentHeartbeatInterval) {
        clearInterval(currentHeartbeatInterval)
        currentHeartbeatInterval = null
        console.log('⏸️ Heartbeat остановлен')
      }
    }

    // Запускаем heartbeat
    startHeartbeat()

    // Обработчик изменения видимости страницы
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        console.log('👁️ Вкладка стала неактивной, document.hidden =', document.hidden)

        // Останавливаем heartbeat при неактивности
        stopHeartbeat()

        // Устанавливаем таймер для автоматического оффлайн через 30 секунд неактивности
        inactivityTimer = setTimeout(() => {
          if (document.hidden) {
            console.log('⏰ Вкладка неактивна более 30 секунд, вызываем setOffline')
            setOffline()
          } else {
            console.log('✅ Вкладка снова активна, отменяем setOffline')
          }
        }, 30 * 1000) // 30 секунд для быстрого перехода в оффлайн
      } else {
        console.log('👁️ Вкладка стала активной, document.hidden =', document.hidden)

        // Очищаем таймер неактивности
        if (inactivityTimer) {
          clearTimeout(inactivityTimer)
          inactivityTimer = null
        }

        // Запускаем heartbeat заново
        startHeartbeat()

        // Немедленно перезагружаем пользователей при возвращении активности
        setTimeout(() => {
          console.log('🔄 Перезагружаем пользователей при возвращении активности')
          fetchUsers()
        }, 200)
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
        console.log('😴 Пользователь неактивен более 2 минут, устанавливаем оффлайн')
        setOffline()
      }
    }, 10 * 1000)

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      clearInterval(heartbeatInterval)
      clearInterval(fetchInterval)
      clearInterval(activityCheckInterval)
      if (inactivityTimer) {
        clearTimeout(inactivityTimer)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('mousedown', updateActivity)
      document.removeEventListener('keydown', updateActivity)
      document.removeEventListener('scroll', updateActivity)
      // Устанавливаем оффлайн при размонтировании компонента
      setOffline()
    }
  }, [fetchUsers])

  const refreshUsers = () => {
    fetchUsers()
  }

  // Функция для принудительного обновления всех неактивных пользователей
  const forceUpdateInactiveUsers = async () => {
    try {
      console.log('🔧 Принудительное обновление неактивных пользователей')
      const result = await supabase.rpc('force_update_inactive_users')
      console.log('✅ force_update_inactive_users выполнен:', result)

      // Перезагружаем список пользователей
      setTimeout(() => {
        fetchUsers()
      }, 500)

      return result
    } catch (err) {
      console.error('❌ Ошибка force_update_inactive_users:', err)
      return null
    }
  }

  // Realtime подписка на изменения статусов пользователей
  useEffect(() => {
    console.log('📡 Настраиваем realtime подписку на изменения пользователей')

    const channel = supabase
      .channel('user_profiles_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_profiles'
        },
        (payload) => {
          console.log('🔄 Изменение в user_profiles:', payload)

          // Обновляем список пользователей при любом изменении
          fetchUsers()
        }
      )
      .subscribe((status) => {
        console.log('📡 Статус подписки user_profiles_changes:', status)
      })

    return () => {
      console.log('🔌 Отписываемся от изменений user_profiles')
      supabase.removeChannel(channel)
    }
  }, [fetchUsers])

  return { users, loading, error, refreshUsers, forceUpdateInactiveUsers }
}

export default useUsers
