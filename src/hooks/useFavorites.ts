import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import useCallStore from '@/store/useCallStore'
import useChatSyncStore from '@/store/useChatSyncStore'

// Тип для избранного сообщения (похож на обычное сообщение)
export interface FavoriteMessage {
  id: string
  message: string
  created_at: string
  updated_at: string
  // Добавляем поля для совместимости с интерфейсом сообщений
  sender_id: string // Всегда равен user_id
  content: string   // Дублирует message для совместимости
  type: 'text'      // Всегда текст
  read_at: string   // Всегда прочитано (текущее время)
}

interface UseFavoritesProps {
  userId?: string
  isActive: boolean
}

export const useFavorites = ({ userId, isActive }: UseFavoritesProps) => {
  const [messages, setMessages] = useState<FavoriteMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient()
  const { refreshChatList } = useChatSyncStore()
  const messagesRef = useRef<FavoriteMessage[]>([])

  // Обновляем ref при изменении messages
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  // Загрузка избранных сообщений
  const loadMessages = useCallback(async () => {
    if (!userId || !isActive) {
      setMessages([])
      setLoading(false)
      return
    }

    console.log('⭐ Загрузка избранных сообщений для пользователя:', userId.slice(0, 8))
    
    try {
      setLoading(true)
      setError(null)

      const { data, error: loadError } = await supabase.rpc('get_user_favorites', {
        user_uuid: userId,
        limit_count: 100
      })

      if (loadError) {
        console.error('❌ Ошибка загрузки избранных:', loadError)
        setError('Не удалось загрузить избранные сообщения')
        return
      }

      // Преобразуем данные в формат, совместимый с интерфейсом сообщений
      const formattedMessages: FavoriteMessage[] = (data || []).map(item => ({
        id: item.id.toString(),
        message: item.message,
        content: item.message, // Дублируем для совместимости
        sender_id: userId,      // Всегда текущий пользователь
        type: 'text' as const,
        created_at: item.created_at,
        updated_at: item.updated_at,
        read_at: item.created_at // Всегда прочитано сразу
      }))

      console.log('✅ Загружено избранных сообщений:', formattedMessages.length)
      setMessages(formattedMessages)
    } catch (err) {
      console.error('💥 Критическая ошибка загрузки избранных:', err)
      setError('Ошибка подключения')
    } finally {
      setLoading(false)
    }
  }, [userId, isActive, supabase])

  // Отправка нового избранного сообщения
  const sendMessage = useCallback(async (messageText: string) => {
    if (!userId || !messageText.trim() || sending) {
      return { success: false, text: messageText }
    }

    console.log('⭐ Отправка избранного сообщения:', messageText.slice(0, 50))
    
    try {
      setSending(true)
      setError(null)

      const { data: favoriteId, error: sendError } = await supabase.rpc('send_favorite_message', {
        message_content: messageText.trim(),
        user_uuid: userId
      })

      if (sendError) {
        console.error('❌ Ошибка отправки избранного:', sendError)
        setError('Не удалось сохранить сообщение')
        return { success: false, text: messageText }
      }

      console.log('✅ Избранное сообщение сохранено с ID:', favoriteId)
      
      // Обновляем список сразу (оптимистичное обновление)
      const now = new Date().toISOString()
      const newMessage: FavoriteMessage = {
        id: favoriteId.toString(),
        message: messageText.trim(),
        content: messageText.trim(),
        sender_id: userId,
        type: 'text',
        created_at: now,
        updated_at: now,
        read_at: now
      }

      setMessages(prev => [newMessage, ...prev])

      return { success: true }
    } catch (err) {
      console.error('💥 Критическая ошибка отправки избранного:', err)
      setError('Ошибка подключения')
      return { success: false, text: messageText }
    } finally {
      setSending(false)
    }
  }, [userId, sending, supabase])

  // Редактирование избранного сообщения
  const editMessage = useCallback(async (messageId: string, newContent: string) => {
    if (!userId || !newContent.trim()) return false

    console.log('✏️ Редактирование избранного сообщения:', messageId)
    
    try {
      const { data: success, error: editError } = await supabase.rpc('edit_favorite_message', {
        favorite_id: parseInt(messageId),
        new_message: newContent.trim(),
        user_uuid: userId
      })

      if (editError || !success) {
        console.error('❌ Ошибка редактирования избранного:', editError)
        setError('Не удалось отредактировать сообщение')
        return false
      }

      console.log('✅ Избранное сообщение отредактировано')
      
      // Обновляем сообщение в локальном состоянии
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, message: newContent.trim(), content: newContent.trim(), updated_at: new Date().toISOString() }
          : msg
      ))

      return true
    } catch (err) {
      console.error('💥 Критическая ошибка редактирования избранного:', err)
      setError('Ошибка подключения')
      return false
    }
  }, [userId, supabase])

  // Удаление избранного сообщения
  const deleteMessage = useCallback(async (messageId: string) => {
    if (!userId) return false

    console.log('🗑️ Удаление избранного сообщения:', messageId)
    
    try {
      const { data: success, error: deleteError } = await supabase.rpc('delete_favorite_message', {
        favorite_id: parseInt(messageId),
        user_uuid: userId
      })

      if (deleteError || !success) {
        console.error('❌ Ошибка удаления избранного:', deleteError)
        setError('Не удалось удалить сообщение')
        return false
      }

      console.log('✅ Избранное сообщение удалено')
      
      // Удаляем сообщение из локального состояния
      setMessages(prev => prev.filter(msg => msg.id !== messageId))

      return true
    } catch (err) {
      console.error('💥 Критическая ошибка удаления избранного:', err)
      setError('Ошибка подключения')
      return false
    }
  }, [userId, supabase])

  // Обработчик нового сообщения (для realtime, но в избранном не нужен)
  const handleNewMessage = useCallback(() => {
    // В избранном нет realtime обновлений от других пользователей
    // Все сообщения создает только сам пользователь
  }, [])

  // Загружаем сообщения при изменении userId или активности
  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  // Realtime подписка на изменения избранного (опционально)
  useEffect(() => {
    if (!userId || !isActive) return

    console.log('⭐ Подписка на изменения избранного для пользователя:', userId.slice(0, 8))

    const favoritesChannel = supabase
      .channel(`favorites_${userId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'favorites',
          filter: `user_id=eq.${userId}`
        }, 
        (payload) => {
          console.log('⭐ Изменение в избранном:', payload)
          
          if (payload.eventType === 'INSERT') {
            const newFavorite = payload.new as any
            const newMessage: FavoriteMessage = {
              id: newFavorite.id.toString(),
              message: newFavorite.message,
              content: newFavorite.message,
              sender_id: userId,
              type: 'text',
              created_at: newFavorite.created_at,
              updated_at: newFavorite.updated_at,
              read_at: newFavorite.created_at
            }
            
            setMessages(prev => {
              // Проверяем, есть ли уже такое сообщение (избегаем дублей)
              if (prev.some(msg => msg.id === newMessage.id)) {
                return prev
              }
              return [newMessage, ...prev]
            })
          } else if (payload.eventType === 'UPDATE') {
            const updatedFavorite = payload.new as any
            setMessages(prev => prev.map(msg =>
              msg.id === updatedFavorite.id.toString()
                ? { ...msg, message: updatedFavorite.message, content: updatedFavorite.message, updated_at: updatedFavorite.updated_at }
                : msg
            ))
          } else if (payload.eventType === 'DELETE') {
            const deletedFavorite = payload.old as any
            setMessages(prev => prev.filter(msg => msg.id !== deletedFavorite.id.toString()))
          }
        }
      )
      .subscribe()

    return () => {
      console.log('⭐ Отписка от изменений избранного')
      supabase.removeChannel(favoritesChannel)
    }
  }, [userId, isActive, supabase])

  return {
    messages,
    loading,
    sending,
    error,
    loadingMore: false, // В избранном нет пагинации пока
    hasMoreMessages: false,
    loadMessages,
    loadMoreMessages: async () => {}, // Заглушка
    sendMessage,
    editMessage,
    deleteMessage,
    handleNewMessage
  }
}
