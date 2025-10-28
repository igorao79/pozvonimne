import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import useCallStore from '@/store/useCallStore'

export const useChatActions = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  const { userId } = useCallStore()

  /**
   * Архивировать/разархивировать чат
   */
  const archiveChat = async (chatId: string, archive: boolean = true): Promise<boolean> => {
    setIsLoading(true)
    setError(null)
    
    try {
      console.log(`📦 ${archive ? 'Архивирование' : 'Разархивирование'} чата:`, chatId.slice(0, 8))
      
      const { data, error: rpcError } = await supabase.rpc('archive_chat', {
        p_chat_id: chatId,
        p_archive: archive
      })

      if (rpcError) {
        console.error('❌ Ошибка архивирования:', rpcError)
        setError(rpcError.message)
        return false
      }

      console.log(`✅ Чат успешно ${archive ? 'архивирован' : 'разархивирован'}`)

      // Событие будет отправлено автоматически через realtime подписку в useChatArchive
      return data === true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка'
      console.error('❌ Критическая ошибка архивирования:', errorMessage)
      setError(errorMessage)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Удалить чат для себя (скрыть)
   */
  const deleteChatForSelf = async (chatId: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)
    
    try {
      console.log('🗑️ Удаление чата для себя:', chatId.slice(0, 8))
      
      const { data, error: rpcError } = await supabase.rpc('delete_chat_for_self', {
        p_chat_id: chatId
      })

      if (rpcError) {
        console.error('❌ Ошибка удаления для себя:', rpcError)
        setError(rpcError.message)
        return false
      }

      console.log('✅ Чат успешно удален для себя')

      // Событие будет отправлено автоматически через realtime подписку в useChatArchive
      return data === true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка'
      console.error('❌ Критическая ошибка удаления для себя:', errorMessage)
      setError(errorMessage)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Удалить чат для всех участников
   */
  const deleteChatForAll = async (chatId: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)
    
    try {
      console.log('💣 Удаление чата для всех участников:', chatId.slice(0, 8))
      
      const { data, error: rpcError } = await supabase.rpc('delete_chat_for_all', {
        p_chat_id: chatId
      })

      if (rpcError) {
        console.error('❌ Ошибка удаления для всех:', rpcError)
        setError(rpcError.message)
        return false
      }

      console.log('✅ Чат успешно удален для всех участников')

      // 🗂️ Отправляем событие обновления для realtime синхронизации
      window.dispatchEvent(new CustomEvent('chatArchiveChanged', {
        detail: { userId, timestamp: Date.now(), action: 'delete_all' }
      }))

      return data === true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка'
      console.error('❌ Критическая ошибка удаления для всех:', errorMessage)
      setError(errorMessage)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  return {
    archiveChat,
    deleteChatForSelf,
    deleteChatForAll,
    isLoading,
    error
  }
}

export default useChatActions

