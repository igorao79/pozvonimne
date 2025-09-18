import { createClient } from '@/utils/supabase/client'
import useCallStore from '@/store/useCallStore'

export const useProfileActions = (
  newDisplayName: string,
  displayName: string,
  setDisplayName: (name: string) => void,
  setUsername: (name: string) => void,
  setLoading: (loading: boolean) => void,
  setError: (error: string | null) => void,
  setSuccess: (success: string | null) => void
) => {
  const supabase = createClient()
  const { user } = useCallStore()

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

  return {
    handleDisplayNameUpdate,
    handlePasswordReset
  }
}




