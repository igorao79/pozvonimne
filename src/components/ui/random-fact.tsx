'use client'

import { useState, useEffect } from 'react'
import useCallStore from '@/store/useCallStore'

interface Fact {
  id: number
  text: string
}

export const RandomFact = () => {
  const [fact, setFact] = useState<Fact | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const { userId } = useCallStore()

  const fetchRandomFact = async () => {
    if (!userId) {
      setError('Пользователь не авторизован')
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`https://factsapi-9q9q.onrender.com/random-fact?user_id=${userId}`)

      if (!response.ok) {
        throw new Error(`HTTP ошибка: ${response.status}`)
      }

      const factData = await response.json()
      setFact(factData)
    } catch (err) {
      console.error('Ошибка загрузки факта:', err)
      setError('Не удалось загрузить факт')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRandomFact()
  }, [userId])

  // Эффект начальной загрузки с блюром
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoad(false)
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="mt-6 bg-card/80 backdrop-blur-sm rounded-lg border border-border/50 w-full min-h-[200px] max-w-md mx-auto
                    p-4 sm:p-6 md:p-4 lg:p-4">
      <div className="flex flex-col items-center text-center space-y-3 h-full min-h-[180px]">
        <div className="flex-shrink-0">
          <div className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center">
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-primary"></div>
            ) : error ? (
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center w-full">
          <h4 className={`text-xs sm:text-sm font-medium text-foreground mb-2 transition-all duration-1000 ${
            isInitialLoad ? 'blur-sm' : 'blur-none'
          }`}>
            Интересный факт
          </h4>

          <div className="flex items-center justify-center px-2 min-h-[60px] max-h-[120px] overflow-hidden">
            <div className={`w-full transition-all duration-1000 ${
              isInitialLoad ? 'blur-md opacity-60' : 'blur-none opacity-100'
            }`}>
              {isLoading ? (
                <span className="text-xs sm:text-sm text-muted-foreground text-center block">Загружаем интересный факт...</span>
              ) : error ? (
                <div className="text-center">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">{error}</p>
                  <button
                    onClick={fetchRandomFact}
                    className="text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    Попробовать снова
                  </button>
                </div>
              ) : fact ? (
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed text-center line-clamp-4 px-1 sm:px-2">
                  {fact.text}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
