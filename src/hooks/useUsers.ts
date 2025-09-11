'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { User } from '@supabase/supabase-js'

interface UserProfile {
  id: string
  username: string
  display_name: string
  avatar_url?: string
  last_sign_in_at: string | null
}

export const useUsers = () => {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true)
        
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
          
          setUsers(basicData || [])
        } else {
          // Преобразуем данные с профилями в базовый формат
          const usersData: UserProfile[] = (data || []).map((user: any) => ({
            id: user.id,
            username: user.username,
            display_name: user.display_name,
            avatar_url: user.avatar_url,
            last_sign_in_at: user.last_sign_in_at
          }))
          
          setUsers(usersData)
        }
        
        setError(null)
        
      } catch (err: any) {
        console.error('Error fetching users:', err)
        setError(err.message)
        
        // В случае ошибки показываем инструкцию
        setUsers([])
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
    
    // Обновляем статус активности текущего пользователя
    const updateLastSeen = async () => {
      try {
        await supabase.rpc('update_user_last_seen')
      } catch (err) {
        console.log('Функция update_user_last_seen не настроена')
      }
    }
    
    updateLastSeen()
    
    // Обновляем каждые 5 минут
    const interval = setInterval(updateLastSeen, 5 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [supabase])

  const refreshUsers = () => {
    setLoading(true)
    // Trigger re-fetch
    setUsers([])
  }

  return { users, loading, error, refreshUsers }
}

export default useUsers
