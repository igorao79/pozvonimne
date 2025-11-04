import { useState, useEffect, useMemo, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { PremiumUser } from '@/utils/premiumDisplay'

interface PremiumDataMap {
  [userId: string]: PremiumUser
}

export const usePremiumData = (userIds: string[]) => {
  const [premiumData, setPremiumData] = useState<PremiumDataMap>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Refs для контроля запросов
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isActiveRef = useRef(true) // Флаг активности компонента

  // Мемоизируем массив userIds для стабильности
  const stableUserIds = useMemo(() => {
    return userIds.slice().sort() // Создаем копию и сортируем для стабильного порядка
  }, [userIds])

  useEffect(() => {
    // Отменяем предыдущий timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    // Сбрасываем флаг активности для отмены предыдущих запросов
    isActiveRef.current = false
    // Сразу устанавливаем новый флаг активности
    isActiveRef.current = true

    const supabase = createClient()
    
    const fetchPremiumData = async () => {
      if (stableUserIds.length === 0) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const { data, error } = await supabase
          .from('user_profiles')
          .select('id, is_premium, premium_color, premium_icon, premium_icon_color_match')
          .in('id', stableUserIds)

        if (error) throw error
        
        // Проверяем, что компонент еще активен перед обновлением состояния
        if (!isActiveRef.current) return

        const dataMap: PremiumDataMap = {}
        
        // Инициализируем всех пользователей как не премиум
        stableUserIds.forEach(userId => {
          dataMap[userId] = {
            isPremium: false,
            premiumColor: '#FFFFFF',
            premiumIcon: '',
            premiumIconColorMatch: false
          }
        })

        // Обновляем данными из базы
        if (data) {
          data.forEach(profile => {
            dataMap[profile.id] = {
              isPremium: profile.is_premium || false,
              premiumColor: profile.premium_color || '#FFFFFF',
              premiumIcon: profile.premium_icon || '',
              premiumIconColorMatch: profile.premium_icon_color_match || false
            }
          })
        }

        // Проверяем активность компонента перед обновлением состояния
        if (isActiveRef.current) {
          setPremiumData(dataMap)
        }
      } catch (error: unknown) {
        // Проверяем активность компонента перед обработкой ошибок
        if (!isActiveRef.current) {
          console.log('Компонент неактивен - игнорируем ошибку')
          return
        }
        
        console.error('Ошибка получения премиум данных:', error)
        if (isActiveRef.current) {
          setError('Не удалось загрузить премиум данные')
        }
      } finally {
        // Обновляем loading только если компонент активен
        if (isActiveRef.current) {
          setLoading(false)
        }
      }
    }

    // Добавляем debounce для запросов
    timeoutRef.current = setTimeout(() => {
      fetchPremiumData()
    }, 300)

    // Подписываемся на изменения в реальном времени
    const subscription = supabase
      .channel('premium_data_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_profiles',
        },
        (payload) => {
          if (payload.new && typeof payload.new === 'object') {
            const newData = payload.new as { id: string; is_premium?: boolean; premium_until?: string; premium_color?: string; premium_icon?: string; premium_icon_color_match?: boolean }
            console.log('usePremiumData: realtime update received:', newData)
            if (stableUserIds.includes(newData.id)) {
              console.log('usePremiumData: updating premium data for user:', newData.id)
              setPremiumData(prev => ({
                ...prev,
                [newData.id]: {
                  isPremium: newData.is_premium || false,
                  premiumColor: newData.premium_color || '#FFFFFF',
                  premiumIcon: newData.premium_icon || '',
                  premiumIconColorMatch: newData.premium_icon_color_match || false
                }
              }))
            }
          }
        }
      )
      .subscribe()

    return () => {
      // Помечаем компонент как неактивный для отмены обновлений состояния
      isActiveRef.current = false
      
      // Отменяем timeout при размонтировании
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      subscription.unsubscribe()
    }
  }, [stableUserIds]) // Используем стабильный массив

  const getPremiumDataForUser = (userId: string): PremiumUser => {
    return premiumData[userId] || {
      isPremium: false,
      premiumColor: '#FFFFFF',
      premiumIcon: '',
      premiumIconColorMatch: false
    }
  }

  // Функция принудительного обновления данных
  const refreshPremiumData = async () => {
    console.log('usePremiumData: force refresh requested')
    if (stableUserIds.length === 0) return

    try {
      const supabase = createClient() // Создаем клиент внутри функции
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, is_premium, premium_color, premium_icon, premium_icon_color_match')
        .in('id', stableUserIds)

      if (error) throw error

      const dataMap: PremiumDataMap = {}

      // Инициализируем всех пользователей как не премиум
      stableUserIds.forEach(userId => {
        dataMap[userId] = {
          isPremium: false,
          premiumColor: '#FFFFFF',
          premiumIcon: '',
          premiumIconColorMatch: false
        }
      })

      // Обновляем данными из базы
      if (data) {
        data.forEach(profile => {
          console.log('usePremiumData: force refresh profile data:', profile)
          dataMap[profile.id] = {
            isPremium: profile.is_premium || false,
            premiumColor: profile.premium_color || '#FFFFFF',
            premiumIcon: profile.premium_icon || '',
            premiumIconColorMatch: profile.premium_icon_color_match || false
          }
        })
      }

      setPremiumData(dataMap)
    } catch (error) {
      console.error('Ошибка принудительного обновления премиум данных:', error)
    }
  }

  return {
    premiumData,
    loading,
    error,
    getPremiumDataForUser,
    refreshPremiumData
  }
}

// Хук для получения премиум данных одного пользователя
export const useSinglePremiumData = (userId: string | null) => {
  // Мемоизируем массив для предотвращения лишних вызовов
  const userIdArray = useMemo(() => {
    return userId ? [userId] : []
  }, [userId])
  
  const { loading, error, getPremiumDataForUser } = usePremiumData(userIdArray)

  return {
    premiumData: userId ? getPremiumDataForUser(userId) : null,
    loading,
    error
  }
}
