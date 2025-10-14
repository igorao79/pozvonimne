'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import useCallStore from '@/store/useCallStore'
import useSupabaseStore from '@/store/useSupabaseStore'

interface PinnedChatRecord {
  chat_id: string
  "position": number
  pinned_at: string
}

interface UsePinnedChatsReturn {
  pinnedChats: string[] // Массив ID чатов в порядке отображения
  isPinned: (chatId: string) => boolean
  pinChat: (chatId: string) => Promise<boolean>
  unpinChat: (chatId: string) => Promise<boolean>
  reorderPinnedChats: (oldIndex: number, newIndex: number) => Promise<boolean>
  getPinnedChatsCount: () => number
  isLoading: boolean
}

export const usePinnedChats = (): UsePinnedChatsReturn => {
  const { userId } = useCallStore()
  const { supabase } = useSupabaseStore()
  const [pinnedChats, setPinnedChats] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const realtimeChannelRef = useRef<any>(null)

  // Загружаем закрепленные чаты из базы данных
  const loadPinnedChats = useCallback(async () => {
    if (!userId || !supabase) {
      setPinnedChats([])
      return
    }

    try {
      setIsLoading(true)
      console.log('📌 Загружаем закрепленные чаты из БД для пользователя:', userId.slice(0, 8))

      const { data, error } = await supabase.rpc('get_pinned_chats')

      if (error) {
        console.error('📌 Ошибка загрузки закрепленных чатов:', error)
        // Fallback к localStorage если есть проблемы с БД
        const fallbackKey = `pinnedChats_${userId}`
        const fallbackData = localStorage.getItem(fallbackKey)
        if (fallbackData) {
          try {
            const parsedData = JSON.parse(fallbackData)
            const sortedIds = parsedData
              .sort((a: any, b: any) => a.position - b.position)
              .map((item: any) => item.id)
            setPinnedChats(sortedIds)
          } catch (e) {
            setPinnedChats([])
          }
        } else {
          setPinnedChats([])
        }
        return
      }

      const sortedIds = (data as PinnedChatRecord[] || [])
        .sort((a, b) => a.position - b.position)
        .map(item => item.chat_id)
      
      setPinnedChats(sortedIds)
      console.log('📌 Загружено закрепленных чатов из БД:', sortedIds.length, 'для пользователя:', userId.slice(0, 8))
      
      // Синхронизируем с localStorage как резервная копия
      const fallbackKey = `pinnedChats_${userId}`
      localStorage.setItem(fallbackKey, JSON.stringify(
        sortedIds.map((id, index) => ({ id, position: index, pinnedAt: Date.now() }))
      ))

    } catch (error) {
      console.error('📌 Критическая ошибка загрузки закрепленных чатов:', error)
      setPinnedChats([])
    } finally {
      setIsLoading(false)
    }
  }, [userId, supabase])

  // Настройка realtime подписки
  useEffect(() => {
    if (!userId || !supabase) {
      return
    }

    // Проверяем, есть ли уже активная подписка
    if (realtimeChannelRef.current) {
      console.log('📌 REALTIME: Подписка уже существует, пропускаем создание новой')
      return
    }

    console.log('📌 Настраиваем realtime подписку для закрепленных чатов:', userId.slice(0, 8))

    // Создаем новую подписку на изменения в таблице pinned_chats
    const channel = supabase
      .channel(`pinned_chats_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Слушаем все события: INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'pinned_chats',
          filter: `user_id=eq.${userId}` // Только для текущего пользователя
        },
        (payload) => {
          const newRecord = payload.new as PinnedChatRecord | null
          const oldRecord = payload.old as PinnedChatRecord | null

          console.log('📌 REALTIME: Изменение в закрепленных чатах:', {
            event: payload.eventType,
            chatId: newRecord?.chat_id || oldRecord?.chat_id || 'unknown',
            position: newRecord?.position,
            timestamp: new Date().toLocaleTimeString()
          })

          // Перезагружаем данные при любом изменении
          loadPinnedChats()
        }
      )
      .subscribe((status) => {
        console.log('📌 REALTIME: Статус подписки на закрепленные чаты:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ REALTIME: Подписка на закрепленные чаты активна')
        }
      })

    realtimeChannelRef.current = channel

    // Очистка только при размонтировании компонента (не при каждом обновлении)
    return () => {
      // Не отключаем подписку автоматически - пусть живет между рендерами
      console.log('📌 REALTIME: Компонент размонтируется, но подписка остается активной')
    }
  }, [userId, supabase]) // Убрали loadPinnedChats из зависимостей

  // Отдельный эффект для очистки при выходе пользователя
  useEffect(() => {
    if (!userId && realtimeChannelRef.current) {
      console.log('📌 REALTIME: Пользователь вышел, отключаем подписку')
      supabase.removeChannel(realtimeChannelRef.current)
      realtimeChannelRef.current = null
    }
  }, [userId, supabase])

  // Загружаем данные при инициализации
  useEffect(() => {
    loadPinnedChats()
  }, [loadPinnedChats])

  // Проверяем, закреплен ли чат
  const isPinned = useCallback((chatId: string) => {
    return pinnedChats.includes(chatId)
  }, [pinnedChats])

  // Закрепляем чат через Supabase RPC
  const pinChat = useCallback(async (chatId: string): Promise<boolean> => {
    if (!userId || !supabase) {
      console.error('📌 Невозможно закрепить чат: нет пользователя или подключения к Supabase')
      return false
    }

    if (isPinned(chatId)) {
      console.log('📌 Чат уже закреплен:', chatId.slice(0, 8))
      return true
    }

    try {
      console.log('📌 ЗАКРЕПЛЯЕМ ЧАТ через БД:', {
        chatId: chatId.slice(0, 8),
        userId: userId.slice(0, 8),
        currentCount: pinnedChats.length
      })

      const { data, error } = await supabase.rpc('pin_chat', { 
        p_chat_id: chatId 
      })

      if (error) {
        console.error('📌 Ошибка закрепления чата:', error)
        return false
      }

      console.log('✅ Чат успешно закреплен в БД:', chatId.slice(0, 8))
      // Данные обновятся автоматически через realtime подписку
      return data === true

    } catch (error) {
      console.error('📌 Критическая ошибка при закреплении чата:', error)
      return false
    }
  }, [userId, supabase, isPinned, pinnedChats.length])

  // Открепляем чат через Supabase RPC
  const unpinChat = useCallback(async (chatId: string): Promise<boolean> => {
    if (!userId || !supabase) {
      console.error('📌 Невозможно открепить чат: нет пользователя или подключения к Supabase')
      return false
    }

    if (!isPinned(chatId)) {
      console.log('📌 Чат не закреплен:', chatId.slice(0, 8))
      return true
    }

    try {
      console.log('📌 ОТКРЕПЛЯЕМ ЧАТ через БД:', {
        chatId: chatId.slice(0, 8),
        userId: userId.slice(0, 8),
        currentCount: pinnedChats.length
      })

      const { data, error } = await supabase.rpc('unpin_chat', { 
        p_chat_id: chatId 
      })

      if (error) {
        console.error('📌 Ошибка открепления чата:', error)
        return false
      }

      console.log('✅ Чат успешно откреплен в БД:', chatId.slice(0, 8))
      // Данные обновятся автоматически через realtime подписку
      return data === true

    } catch (error) {
      console.error('📌 Критическая ошибка при откреплении чата:', error)
      return false
    }
  }, [userId, supabase, isPinned, pinnedChats.length])

  // Изменяем порядок закрепленных чатов через Supabase RPC
  const reorderPinnedChats = useCallback(async (oldIndex: number, newIndex: number): Promise<boolean> => {
    if (!userId || !supabase) {
      console.error('📌 Невозможно изменить порядок: нет пользователя или подключения к Supabase')
      return false
    }

    if (oldIndex === newIndex || oldIndex < 0 || newIndex < 0 || 
        oldIndex >= pinnedChats.length || newIndex >= pinnedChats.length) {
      console.log('📌 Некорректные индексы для перестановки:', oldIndex, newIndex)
      return false
    }

    const chatId = pinnedChats[oldIndex]
    if (!chatId) {
      console.error('📌 Чат не найден по индексу:', oldIndex)
      return false
    }

    try {
      console.log('📌 МЕНЯЕМ ПОРЯДОК чатов через БД:', {
        chatId: chatId.slice(0, 8),
        oldIndex,
        newIndex,
        userId: userId.slice(0, 8)
      })

      const { data, error } = await supabase.rpc('reorder_pinned_chats', {
        p_chat_id: chatId,
        p_new_position: newIndex
      })

      if (error) {
        console.error('📌 Ошибка изменения порядка чатов:', error)
        return false
      }

      console.log('✅ Порядок чатов успешно изменен в БД')
      // Данные обновятся автоматически через realtime подписку
      return data === true

    } catch (error) {
      console.error('📌 Критическая ошибка при изменении порядка чатов:', error)
      return false
    }
  }, [userId, supabase, pinnedChats])

  // Получаем количество закрепленных чатов
  const getPinnedChatsCount = useCallback(() => {
    return pinnedChats.length
  }, [pinnedChats])

  return {
    pinnedChats,
    isPinned,
    pinChat,
    unpinChat,
    reorderPinnedChats,
    getPinnedChatsCount,
    isLoading
  }
}

export default usePinnedChats
