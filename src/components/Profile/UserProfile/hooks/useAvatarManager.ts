import { useRef } from 'react'
import { createClient } from '@/utils/supabase/client'

export const useAvatarManager = (
  userId: string | null,
  avatarUrl: string,
  setAvatarUrl: (url: string) => void,
  setLoading: (loading: boolean) => void,
  setError: (error: string | null) => void,
  setSuccess: (success: string | null) => void
) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

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

  return {
    fileInputRef,
    handleAvatarUpload,
    handleRemoveAvatar
  }
}




