import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { PremiumUser } from '@/utils/premiumDisplay'

interface PremiumDataMap {
  [userId: string]: PremiumUser
}

export const usePremiumData = (userIds: string[]) => {
  const [premiumData, setPremiumData] = useState<PremiumDataMap>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    const fetchPremiumData = async () => {
      if (userIds.length === 0) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const { data, error } = await supabase
          .from('user_profiles')
          .select('id, is_premium, premium_color, premium_icon, premium_icon_color_match')
          .in('id', userIds)

        if (error) throw error

        const dataMap: PremiumDataMap = {}
        
        // Инициализируем всех пользователей как не премиум
        userIds.forEach(userId => {
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
            console.log('usePremiumData: loading profile data:', profile)
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
        console.error('Ошибка получения премиум данных:', error)
        setError('Не удалось загрузить премиум данные')
      } finally {
        setLoading(false)
      }
    }

    fetchPremiumData()

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
            const newData = payload.new as any
            console.log('usePremiumData: realtime update received:', newData)
            if (userIds.includes(newData.id)) {
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
      subscription.unsubscribe()
    }
  }, [userIds.join(','), supabase])

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
    if (userIds.length === 0) return

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, is_premium, premium_color, premium_icon, premium_icon_color_match')
        .in('id', userIds)

      if (error) throw error

      const dataMap: PremiumDataMap = {}

      // Инициализируем всех пользователей как не премиум
      userIds.forEach(userId => {
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
  const { premiumData, loading, error, getPremiumDataForUser } = usePremiumData(
    userId ? [userId] : []
  )

  return {
    premiumData: userId ? getPremiumDataForUser(userId) : null,
    loading,
    error
  }
}
