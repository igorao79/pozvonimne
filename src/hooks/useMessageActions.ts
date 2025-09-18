import { useCallback } from 'react'
import useSupabaseStore from '@/store/useSupabaseStore'

export const useMessageActions = () => {
  const { supabase } = useSupabaseStore()

  // Функция редактирования сообщения
  const editMessage = useCallback(async (messageId: string, newContent: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .rpc('edit_message', {
          message_uuid: messageId,
          new_content: newContent
        })

      if (error) {
        console.error('Ошибка при редактировании сообщения:', error)
        throw error
      }

      return data as boolean
    } catch (error) {
      console.error('Ошибка при редактировании сообщения:', error)
      throw error
    }
  }, [supabase])

  // Функция удаления сообщения
  const deleteMessage = useCallback(async (messageId: string): Promise<boolean> => {
    try {
      // Показываем подтверждение перед удалением
      const confirmed = window.confirm('Вы действительно хотите удалить это сообщение?')
      if (!confirmed) return false

      const { data, error } = await supabase
        .rpc('delete_message', {
          message_uuid: messageId
        })

      if (error) {
        console.error('Ошибка при удалении сообщения:', error)
        throw error
      }

      return data as boolean
    } catch (error) {
      console.error('Ошибка при удалении сообщения:', error)
      throw error
    }
  }, [supabase])

  return {
    editMessage,
    deleteMessage
  }
}
