'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import useCallStore from '@/store/useCallStore'

interface UserProfileProps {
  onClose: () => void
}

const UserProfile = ({ onClose }: UserProfileProps) => {
  const [loading, setLoading] = useState(false)
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [newDisplayName, setNewDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [displayNameAvailable, setDisplayNameAvailable] = useState<boolean | null>(null)
  const [checkingDisplayName, setCheckingDisplayName] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const { user, userId } = useCallStore()

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
  }, [userId, supabase])

  // Проверка уникальности display_name
  useEffect(() => {
    if (!newDisplayName || newDisplayName.length < 3) {
      setDisplayNameAvailable(null)
      return
    }

    // Если имя не изменилось по сравнению с текущим, считаем его доступным
    if (newDisplayName === displayName) {
      setDisplayNameAvailable(true)
      return
    }

    const checkDisplayName = async () => {
      try {
        setCheckingDisplayName(true)
        const { data, error } = await supabase.rpc('is_display_name_available', {
          check_display_name: newDisplayName
        })

        if (error) throw error
        setDisplayNameAvailable(data)
      } catch (err) {
        console.error('Error checking display name:', err)
        setDisplayNameAvailable(false)
      } finally {
        setCheckingDisplayName(false)
      }
    }

    const timeoutId = setTimeout(checkDisplayName, 500)
    return () => clearTimeout(timeoutId)
  }, [newDisplayName, displayName, supabase])


  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !userId) return

    try {
      setLoading(true)
      setError(null)

      // Проверяем тип файла
      if (!file.type.startsWith('image/')) {
        throw new Error('Можно загружать только изображения')
      }

      // Проверяем размер файла (максимум 2MB)
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('Размер файла не должен превышать 2MB')
      }

      // Удаляем старую аватарку если есть
      if (avatarUrl) {
        const oldPath = avatarUrl.split('/').pop()
        if (oldPath) {
          await supabase.storage
            .from('pfps')
            .remove([`${userId}/${oldPath}`])
        }
      }

      // Загружаем новую аватарку
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `${userId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('pfps')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Получаем публичный URL
      const { data: { publicUrl } } = supabase.storage
        .from('pfps')
        .getPublicUrl(filePath)

      // Обновляем профиль в базе данных
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId)

      if (updateError) throw updateError

      setAvatarUrl(publicUrl)
      setSuccess('Аватарка обновлена!')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }


  const handleDisplayNameUpdate = async () => {
    if (!newDisplayName || newDisplayName === displayName) return

    // Проверяем формат display name (он же будет username)
    if (newDisplayName.length < 3 || newDisplayName.length > 20) {
      setError('Имя должно содержать от 3 до 20 символов')
      return
    }

    if (!/^[a-zA-Z0-9_]+$/.test(newDisplayName)) {
      setError('Имя может содержать только буквы, цифры и подчеркивание')
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Обновляем display_name в auth.users И user_profiles одновременно
      const { data, error } = await supabase.rpc('update_display_name_everywhere', {
        new_display_name: newDisplayName
      })

      if (error) throw error

      if (data) {
        setDisplayName(newDisplayName)
        setUsername(newDisplayName) // Синхронизируем username с display name
        setSuccess('Имя и никнейм обновлены!')
      } else {
        throw new Error('Это имя уже занято. Выберите другое.')
      }
    } catch (err: any) {
      console.error('Error updating display name:', err)

      // Если ошибка связана с уникальностью, показываем соответствующее сообщение
      if (err.message && err.message.includes('already exists')) {
        setError('Это имя уже занято. Выберите другое.')
      } else {
        setError(err.message || 'Не удалось обновить имя')
      }
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordReset = async () => {
    if (!user?.email) return

    try {
      setLoading(true)
      setError(null)

      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: window.location.origin + '/reset-password'
      })

      if (error) throw error

      setSuccess('Письмо для сброса пароля отправлено на вашу почту!')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveAvatar = async () => {
    if (!avatarUrl || !userId) return

    try {
      setLoading(true)
      setError(null)

      // Удаляем файл из storage
      const oldPath = avatarUrl.split('/').pop()
      if (oldPath) {
        await supabase.storage
          .from('pfps')
          .remove([`${userId}/${oldPath}`])
      }

      // Обновляем профиль в базе данных
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ avatar_url: null })
        .eq('id', userId)

      if (updateError) throw updateError

      setAvatarUrl('')
      setSuccess('Аватарка удалена!')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto border border-border"></div>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">Профиль</h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-4 bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 bg-green-500/10 border border-green-500 text-green-700 dark:text-green-400 px-4 py-3 rounded">
              {success}
            </div>
          )}

          {/* Avatar Section */}
          <div className="text-center mb-6">
            <div className="relative inline-block">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-muted mx-auto mb-4">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary">
                    <span className="text-2xl font-bold text-primary-foreground">
                      {username?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  </div>
                )}
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>

            <div className="flex justify-center space-x-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 text-sm transition-colors"
              >
                {avatarUrl ? 'Изменить' : 'Загрузить'}
              </button>
              {avatarUrl && (
                <button
                  onClick={handleRemoveAvatar}
                  disabled={loading}
                  className="px-4 py-2 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 disabled:opacity-50 text-sm transition-colors"
                >
                  Удалить
                </button>
              )}
            </div>
          </div>

          {/* Display Name Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Имя и никнейм для звонков
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={newDisplayName}
                onChange={(e) => {
                  setNewDisplayName(e.target.value)
                  setError(null) // Сбрасываем ошибку при изменении
                }}
                placeholder="Ваше имя (никнейм для звонков)"
                className="flex-1 px-3 py-2 border border-border bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                disabled={loading}
              />
              <button
                onClick={handleDisplayNameUpdate}
                disabled={loading || !newDisplayName || newDisplayName === displayName || displayNameAvailable === false || (newDisplayName.length >= 3 && displayNameAvailable === null)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                Сохранить
              </button>
            </div>
            {newDisplayName && newDisplayName.length >= 3 && (
              <div className={`text-sm mt-2 flex items-center ${
                checkingDisplayName ? 'text-muted-foreground' :
                displayNameAvailable === true ? 'text-green-600 dark:text-green-400' :
                displayNameAvailable === false ? 'text-destructive' : 'text-muted-foreground'
              }`}>
                {checkingDisplayName ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-current mr-2"></div>
                    Проверяем...
                  </>
                ) : displayNameAvailable === true ? (
                  <>
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Имя доступно
                  </>
                ) : displayNameAvailable === false ? (
                  <>
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Имя занято
                  </>
                ) : null}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Это имя будет видно другим пользователям и использоваться как никнейм для звонков
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              3-20 символов, только буквы, цифры и подчеркивание
            </p>
          </div>

          {/* Email Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Email
            </label>
            <p className="text-muted-foreground bg-muted px-3 py-2 rounded border border-border">
              {user?.email}
            </p>
          </div>

          {/* Password Reset */}
          <div className="mb-6">
            <button
              onClick={handlePasswordReset}
              disabled={loading}
              className="w-full px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50 dark:bg-yellow-500 dark:hover:bg-yellow-600 transition-colors"
            >
              {loading ? 'Отправка...' : 'Сбросить пароль'}
            </button>
            <p className="text-xs text-muted-foreground mt-1">
              Новый пароль будет отправлен на вашу почту
            </p>
          </div>
        </div>
      </div>
  )
}

export default UserProfile
