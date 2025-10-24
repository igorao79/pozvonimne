'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import useSupabaseStore from '@/store/useSupabaseStore'
import useCallStore from '@/store/useCallStore'
import useUsers from '@/hooks/useUsers'

// Dynamic import для анимированного компонента (избегаем SSR проблем)
const UserCounterAnimated = dynamic(() => import('./UserCounterAnimated').then(mod => mod.UserCounterAnimated), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center relative z-10">
      <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-green-500 mb-1 sm:mb-2">
        Loading...
      </span>
      <p className="text-xs sm:text-sm text-muted-foreground">
        активных пользователей
      </p>
    </div>
  )
})

export const UserCounter = () => {
  const [userCount, setUserCount] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [shouldStartAnimation, setShouldStartAnimation] = useState(false)
  
  const { supabase } = useSupabaseStore()
  const { userId } = useCallStore()


  const fetchUserCount = async () => {
    if (!userId) {
      setError('Пользователь не авторизован')
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Получаем количество пользователей из таблицы user_profiles
      const { count, error: countError } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })

      if (countError) {
        throw new Error(`Ошибка запроса: ${countError.message}`)
      }

      const finalCount = count || 0
      setUserCount(finalCount)

      // Запускаем анимацию через небольшую задержку для загрузки компонента
      setTimeout(() => setShouldStartAnimation(true), 100)
    } catch (err) {
      console.error('❌ UserCounter: Ошибка загрузки количества пользователей:', err)
      setError('Не удалось загрузить данные')
    } finally {
      setIsLoading(false)
    }
  }


  useEffect(() => {
    fetchUserCount()

    // Обновляем каждые 5 минут
    const interval = setInterval(fetchUserCount, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [userId])

  // Эффект начальной загрузки с блюром
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoad(false)
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="mt-4 sm:mt-6 bg-card/80 backdrop-blur-sm rounded-lg border border-border/50 w-full min-h-[120px] sm:min-h-[160px] md:min-h-[200px] max-w-xs sm:max-w-sm md:max-w-md mx-auto
                    p-2 sm:p-3 md:p-4
                    transition-all duration-300 ease-in-out
                    cursor-default select-none
                    mobile-chatlist-random-fact
                    overflow-hidden">
      
      <div className="flex flex-col h-full">
        <div className="flex-1 flex flex-col justify-center w-full">
          <h4 className={`text-xs sm:text-sm text-center flex items-center justify-center font-medium text-foreground mb-1 sm:mb-2 transition-all duration-1000 ${
            isInitialLoad ? 'blur-sm' : 'blur-none'
          }`}>
            Нашим сервисом пользуется:
          </h4>

          <div className="flex items-center justify-center px-1 sm:px-2 min-h-[60px] sm:min-h-[80px] md:min-h-[100px] relative">
            <div className={`w-full transition-all duration-1000 ${
              isInitialLoad ? 'blur-md opacity-60' : 'blur-none opacity-100'
            }`}>
              {isLoading ? (
                <div className="text-center">
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    Загружаем данные...
                  </span>
                </div>
              ) : error ? (
                <div className="text-center">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">{error}</p>
                  <button
                    onClick={fetchUserCount}
                    className="text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    Попробовать снова
                  </button>
                </div>
              ) : userCount !== null && shouldStartAnimation ? (
                <UserCounterAnimated 
                  userCount={userCount}
                  onAnimationStart={() => {}}
                  onAnimationComplete={() => {}}
                />
              ) : userCount !== null ? (
                <div className="text-center relative">
                  <div className="flex flex-col items-center justify-center relative z-10">
                    <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-green-500 transition-colors duration-500 mb-1 sm:mb-2">
                      {userCount}
                    </span>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      активных пользователей
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
