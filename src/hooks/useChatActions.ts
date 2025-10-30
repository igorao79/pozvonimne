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
      console.log('🗑️ Удаление чата для себя')
      
      const { data, error: rpcError } = await supabase.rpc('delete_chat_for_self', {
        p_chat_id: chatId
      })

      if (rpcError) {
        console.error('❌ Ошибка удаления для себя:', rpcError)
        setError(rpcError.message)
        return false
      }

      console.log('✅ Чат успешно удален для себя')

      // Простое событие для сброса выбранного чата
      console.log('🔔 Отправляем событие chatDeleted для chatId:', chatId.slice(0, 8))
      window.dispatchEvent(new CustomEvent('chatDeleted', {
        detail: { chatId }
      }))

      // Отправляем событие для обновления UI в реальном времени
      window.dispatchEvent(new CustomEvent('chatArchiveChanged', {
        detail: { userId, action: 'delete_for_self', chatId, timestamp: Date.now() }
      }))

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
    console.log('🚀 СТАРТ deleteChatForAll для chatId:', chatId.slice(0, 8))
    console.log('🔍 userId:', userId?.slice(0, 8))
    console.log('🔍 supabase client:', !!supabase)
    
    setIsLoading(true)
    setError(null)
    
    try {
      console.log('💣 Удаление чата для всех участников:', chatId.slice(0, 8))
      
      console.log('📡 Отправляем RPC delete_chat_for_all...')
      const { data, error: rpcError } = await supabase.rpc('delete_chat_for_all', {
        p_chat_id: chatId
      })
      
      console.log('📨 RPC ответ data:', data)
      console.log('📨 RPC ответ error:', rpcError)

      if (rpcError) {
        console.error('❌ Ошибка удаления для всех:', rpcError)
        
        // Специальная обработка для ошибки блокировки
        if (rpcError.message?.includes('блокировку чата') || rpcError.message?.includes('lock_not_available')) {
          setError('Чат сейчас используется. Попробуйте через несколько секунд.')
        } else {
          setError(rpcError.message)
        }
        return false
      }

      console.log('✅ Чат успешно удален для всех участников')

      // 📨 Отправляем событие для перенаправления ТЕКУЩЕГО пользователя на главную
      window.dispatchEvent(new CustomEvent('chatDeleted', {
        detail: { chatId }
      }))

      // 🌐 Отправляем broadcast для уведомления ДРУГИХ пользователей об удалении чата
      const broadcast = supabase.channel('global_chat_notifications')
      try {
        await broadcast.send({
          type: 'broadcast',
          event: 'chat_deleted_for_all',
          payload: {
            chatId,
            deletedBy: userId,
            timestamp: Date.now()
          }
        })
        console.log('📡 Broadcast отправлен: chat_deleted_for_all для chatId:', chatId.slice(0, 8))
      } catch (error) {
        console.error('❌ Ошибка отправки broadcast:', error)
      }

      // 🗂️ Отправляем событие обновления для realtime синхронизации
      window.dispatchEvent(new CustomEvent('chatArchiveChanged', {
        detail: { userId, timestamp: Date.now(), action: 'delete_all', chatId }
      }))

      console.log('🏁 ФИНИШ deleteChatForAll, возвращаем:', data === true)
      return data === true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка'
      console.error('❌ Критическая ошибка удаления для всех:', errorMessage)
      console.error('❌ Полная ошибка:', err)
      setError(errorMessage)
      return false
    } finally {
      console.log('🔚 deleteChatForAll завершается, setIsLoading(false)')
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

