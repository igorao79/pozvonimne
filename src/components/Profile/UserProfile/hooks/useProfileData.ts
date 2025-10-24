import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'

// Кэш для данных профиля
const profileCache = new Map<string, {
  username: string
  displayName: string
  avatarUrl: string
  timestamp: number
}>()

const CACHE_DURATION = 5 * 60 * 1000 // 5 минут

// Функция для получения данных пользователя из кэша
export const getUserInfoFromCache = async (userId: string) => {
  // Проверяем кэш
  const cached = profileCache.get(userId)
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    console.log('🔄 Используем кэшированные данные пользователя:', userId)
    return {
      displayName: cached.displayName,
      avatarUrl: cached.avatarUrl,
      fromCache: true
    }
  }

  // Если нет в кэше, загружаем из базы
  try {
    const { createClient } = await import('@/utils/supabase/client')
    const supabase = createClient()
    const { data: displayName, error: rpcError } = await supabase.rpc('get_user_display_name', {
      user_id: userId
    })

    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('avatar_url')
      .eq('id', userId)
      .single()

    const finalDisplayName = displayName || `Пользователь ${userId?.slice(0, 8)}...`
    const avatarUrl = profileData?.avatar_url || ''

    // Сохраняем в кэш
    profileCache.set(userId, {
      username: finalDisplayName,
      displayName: finalDisplayName,
      avatarUrl: avatarUrl,
      timestamp: Date.now()
    })

    console.log('✅ Данные пользователя загружены и закэшированы:', userId)
    return {
      displayName: finalDisplayName,
      avatarUrl: avatarUrl,
      fromCache: false
    }
  } catch (err) {
    console.error('Error loading user info:', err)
    return {
      displayName: `Пользователь ${userId?.slice(0, 8)}...`,
      avatarUrl: '',
      fromCache: false
    }
  }
}

export const useProfileData = (userId: string | null) => {
  const [loading, setLoading] = useState(true) // Начинаем с loading=true
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [newDisplayName, setNewDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const supabase = createClient()

  // Загружаем профиль пользователя с кэшированием
  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const loadProfile = async () => {
      try {
        // Проверяем кэш
        const cached = profileCache.get(userId)
        if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
          console.log('🔄 Используем кэшированные данные профиля')
          setUsername(cached.username)
          setDisplayName(cached.displayName)
          setAvatarUrl(cached.avatarUrl)
          setNewDisplayName(cached.displayName)
          setLoading(false)
          return
        }

        setLoading(true)
        setError(null)

        // Таймаут для предотвращения слишком долгой загрузки
        loadingTimeoutRef.current = setTimeout(() => {
          if (loading) {
            console.warn('⚠️ Загрузка профиля занимает слишком долго')
            setLoading(false)
          }
        }, 10000)

        // Сначала убеждаемся, что профиль существует
        const { error: ensureError } = await supabase.rpc('ensure_user_profile')
        if (ensureError) {
          console.warn('Warning: Could not ensure profile exists:', ensureError)
        }

        // Получаем данные пользователя из auth.users для актуального display_name
        const { data: userData, error: userError } = await supabase.auth.getUser()
        const currentDisplayName = userData?.user?.user_metadata?.display_name || ''

        // Получаем данные профиля из user_profiles
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('username, display_name, avatar_url')
          .eq('id', userId)
          .single()

        if (profileError) {
          console.error('Profile error:', profileError)
          // Если профиля нет, используем данные из user metadata
          setDisplayName(currentDisplayName)
          setNewDisplayName(currentDisplayName)
          setUsername(currentDisplayName)
          setAvatarUrl('')

          // Сохраняем в кэш
          profileCache.set(userId, {
            username: currentDisplayName,
            displayName: currentDisplayName,
            avatarUrl: '',
            timestamp: Date.now()
          })
          return
        }

        // ИСПРАВЛЕНИЕ: Приоритизируем user_metadata как источник истины!
        // user_metadata содержит то что пользователь ввел при регистрации
        const finalDisplayName = currentDisplayName || profileData.display_name

        setUsername(finalDisplayName)
        setDisplayName(finalDisplayName)
        setAvatarUrl(profileData.avatar_url || '')
        setNewDisplayName(finalDisplayName)

        // Сохраняем в кэш
        profileCache.set(userId, {
          username: finalDisplayName,
          displayName: finalDisplayName,
          avatarUrl: profileData.avatar_url || '',
          timestamp: Date.now()
        })

        console.log('✅ Данные профиля загружены и закэшированы')

      } catch (err: any) {
        console.error('Error loading profile:', err)
        setError('Ошибка загрузки профиля')
      } finally {
        setLoading(false)
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current)
        }
      }
    }

    loadProfile()

    // Очистка таймаута при размонтировании
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
      }
    }
  }, [userId])

  // Функция для инвалидации кэша (при обновлении данных)
  const invalidateCache = (userId: string) => {
    profileCache.delete(userId)
    console.log('🗑️ Кэш профиля инвалидирован для пользователя:', userId)
  }

  return {
    loading,
    username,
    displayName,
    avatarUrl,
    newDisplayName,
    error,
    success,
    setLoading,
    setUsername,
    setDisplayName,
    setAvatarUrl,
    setNewDisplayName,
    setError,
    setSuccess,
    invalidateCache,
    supabase
  }
}
