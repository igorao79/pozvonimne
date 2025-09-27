import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

interface PremiumData {
  isPremium: boolean
  premiumColor: string
  premiumIcon: string
  premiumIconColorMatch: boolean
  premiumActivatedAt: string | null
}

export const usePremiumStatus = (userId: string | null) => {
  const [premiumData, setPremiumData] = useState<PremiumData>({
    isPremium: false,
    premiumColor: '#FFD700',
    premiumIcon: '',
    premiumIconColorMatch: false,
    premiumActivatedAt: null
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    const fetchPremiumStatus = async () => {
      if (!userId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const { data, error } = await supabase
          .from('user_profiles')
          .select('is_premium, premium_color, premium_icon, premium_icon_color_match, premium_activated_at')
          .eq('id', userId)
          .single()

        if (error) {
          // Если профиль не найден, создаем его
          if (error.code === 'PGRST116') {
            const { error: insertError } = await supabase
              .from('user_profiles')
              .insert({
                id: userId,
                is_premium: false,
                premium_color: '#FFD700',
                premium_icon: '',
                premium_icon_color_match: false
              })

            if (insertError) {
              throw insertError
            }

        setPremiumData({
          isPremium: false,
          premiumColor: '#FFD700',
          premiumIcon: '',
          premiumIconColorMatch: false,
          premiumActivatedAt: null
        })
          } else {
            throw error
          }
        } else {
          setPremiumData({
            isPremium: data.is_premium || false,
            premiumColor: data.premium_color || '#FFD700',
            premiumIcon: data.premium_icon || '',
            premiumIconColorMatch: data.premium_icon_color_match || false,
            premiumActivatedAt: data.premium_activated_at
          })
        }
      } catch (error) {
        console.error('Ошибка получения премиум статуса:', error)
        setError('Не удалось загрузить премиум статус')
      } finally {
        setLoading(false)
      }
    }

    fetchPremiumStatus()

    // Подписываемся на изменения в реальном времени
    const subscription = supabase
      .channel('premium_status_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_profiles',
          filter: `id=eq.${userId}`
        },
        (payload) => {
          if (payload.new && typeof payload.new === 'object') {
            const newData = payload.new as any
            setPremiumData({
              isPremium: newData.is_premium || false,
              premiumColor: newData.premium_color || '#FFD700',
              premiumIcon: newData.premium_icon || '',
              premiumIconColorMatch: newData.premium_icon_color_match || false,
              premiumActivatedAt: newData.premium_activated_at
            })
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [userId, supabase])

  const refreshPremiumStatus = async () => {
    if (!userId) return

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('is_premium, premium_color, premium_icon, premium_icon_color_match, premium_activated_at')
        .eq('id', userId)
        .single()

      if (error) throw error

      if (data) {
          setPremiumData({
            isPremium: data.is_premium || false,
            premiumColor: data.premium_color || '#FFD700',
            premiumIcon: data.premium_icon || '',
            premiumIconColorMatch: data.premium_icon_color_match || false,
            premiumActivatedAt: data.premium_activated_at
          })
      }
    } catch (error) {
      console.error('Ошибка обновления премиум статуса:', error)
    }
  }

  return {
    ...premiumData,
    loading,
    error,
    refreshPremiumStatus
  }
}
