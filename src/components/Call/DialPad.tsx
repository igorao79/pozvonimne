'use client'

import { useState } from 'react'
import useCallStore from '@/store/useCallStore'
import { createClient } from '@/utils/supabase/client'

const DialPad = () => {
  const [inputUsername, setInputUsername] = useState('')
  const {
    userId,
    startCall,
    isInCall,
    isCalling,
    setError,
    setIsLoading,
    isLoading
  } = useCallStore()

  const supabase = createClient()

  const handleCall = async () => {
    if (!inputUsername.trim()) {
      setError('Введите никнейм пользователя')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Ищем пользователя по username
      const { data: targetUser, error: searchError } = await supabase.rpc('get_user_by_username', {
        target_username: inputUsername.toLowerCase()
      })

      if (searchError) {
        throw searchError
      }

      if (!targetUser || targetUser.length === 0) {
        throw new Error('Пользователь с таким никнеймом не найден')
      }

      const user = targetUser[0]

      if (user.id === userId) {
        setError('Нельзя позвонить самому себе')
        return
      }

      console.log('🎯 Starting call to:', user.id)
      startCall(user.id)
    } catch (err: any) {
      console.error('Call error:', err)
      setError(err.message || 'Ошибка при звонке')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-card shadow-xl rounded-lg p-6 border border-border">
      <h2 className="text-xl font-semibold text-foreground mb-4 text-center">
        Позвонить пользователю
      </h2>

      <div className="space-y-4">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-foreground mb-2">
            Никнейм пользователя
          </label>
          <input
            id="username"
            type="text"
            value={inputUsername}
            onChange={(e) => setInputUsername(e.target.value)}
            className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring placeholder:text-muted-foreground"
            placeholder="Введите никнейм (например: @username)"
            disabled={isInCall}
          />
        </div>

        <button
          onClick={handleCall}
          disabled={isInCall || isLoading || !inputUsername.trim()}
          className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-white font-medium bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Соединение...
            </div>
          ) : isCalling ? (
            <div className="flex items-center">
              <div className="animate-pulse w-3 h-3 bg-card rounded-full mr-2"></div>
              Вызов...
            </div>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21L6.16 11.37a11.045 11.045 0 005.516 5.516l1.983-4.064a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Позвонить
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default DialPad