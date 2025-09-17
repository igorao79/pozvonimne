import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

export const useProfileData = (userId: string | null) => {
  const [loading, setLoading] = useState(false)
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [newDisplayName, setNewDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const supabase = createClient()

  // Загружаем профиль пользователя
  useEffect(() => {
    const loadProfile = async () => {
      if (!userId) return

      try {
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
          return
        }

        // Используем display_name из user_profiles, если он есть, иначе из user metadata
        const finalDisplayName = profileData.display_name || currentDisplayName

        setUsername(finalDisplayName)
        setDisplayName(finalDisplayName)
        setAvatarUrl(profileData.avatar_url || '')
        setNewDisplayName(finalDisplayName)
      } catch (err: any) {
        console.error('Error loading profile:', err)
        setError('Ошибка загрузки профиля')
      }
    }

    loadProfile()
  }, [userId])

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
    supabase
  }
}
