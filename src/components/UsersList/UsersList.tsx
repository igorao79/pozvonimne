'use client'

import { useState } from 'react'
import useUsers from '@/hooks/useUsers'
import useCallStore from '@/store/useCallStore'
import { createClient } from '@/utils/supabase/client'
import { default as UserProfile } from '../Profile/UserProfile'

const UsersList = () => {
  const { users, loading, error, refreshUsers } = useUsers()
  const [callingUserId, setCallingUserId] = useState<string | null>(null)
  const [selectedUserProfile, setSelectedUserProfile] = useState<string | null>(null)
  
  const {
    userId,
    startCall,
    isInCall,
    setError,
    setIsLoading
  } = useCallStore()

  const supabase = createClient()

  const handleCallUser = async (targetUserId: string, targetUsername: string, displayName: string) => {
    if (targetUserId === userId) {
      setError('Нельзя позвонить самому себе')
      return
    }

    setCallingUserId(targetUserId)
    setIsLoading(true)
    setError(null)

    try {
      // Send call signal to the target user
      const callChannel = supabase.channel(`calls:${targetUserId}`)
      
      // Subscribe to channel first
      await callChannel.subscribe()
      
      // Wait a bit for subscription to be ready
      await new Promise(resolve => setTimeout(resolve, 100))
      
      await callChannel.send({
        type: 'broadcast',
        event: 'incoming_call',
        payload: {
          caller_id: userId,
          caller_name: displayName || targetUsername
        }
      })

      console.log('Call signal sent to user:', targetUserId)
      startCall(targetUserId)
      
    } catch (err) {
      setError('Ошибка при совершении звонка')
      console.error('Call error:', err)
    } finally {
      setCallingUserId(null)
      setIsLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white shadow-xl rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center">
          Пользователи онлайн
        </h2>
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-2 text-gray-600">Загрузка пользователей...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white shadow-xl rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center">
          Пользователи приложения
        </h2>
        <div className="text-center py-4">
          <p className="text-red-600 mb-2">Ошибка загрузки: {error}</p>
          {error.includes('SQL скрипт') && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-left">
              <p className="text-sm text-yellow-800 mb-2">
                <strong>Требуется настройка базы данных:</strong>
              </p>
              <ol className="text-xs text-yellow-700 space-y-1">
                <li>1. Откройте SQL Editor в Supabase Dashboard</li>
                <li>2. Выполните скрипт из файла <code>supabase_setup.sql</code></li>
                <li>3. Обновите страницу</li>
              </ol>
            </div>
          )}
          <button
            onClick={refreshUsers}
            className="text-indigo-600 hover:text-indigo-500 text-sm"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    )
  }

  const otherUsers = users.filter(user => user.id !== userId)

  return (
    <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Пользователи приложения
          </h2>
          <button
            onClick={refreshUsers}
            className="text-indigo-600 hover:text-indigo-500 text-sm"
          >
            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Обновить
          </button>
        </div>

      {otherUsers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p>Нет других пользователей</p>
          <p className="text-sm text-gray-400 mt-1">
            Зарегистрируйтесь для появления в списке
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {otherUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center space-x-3 flex-1">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.display_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <span className="text-white font-medium text-sm">
                        {user.display_name?.charAt(0)?.toUpperCase() || user.username?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => setSelectedUserProfile(user.id)}
                    className="text-left w-full group"
                  >
                    <p className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                      {user.display_name || user.username}
                    </p>
                    {user.last_sign_in_at && (
                      <p className="text-xs text-green-600">
                        ● Был в сети: {new Date(user.last_sign_in_at).toLocaleDateString('ru-RU')}
                      </p>
                    )}
                  </button>
                </div>
              </div>

              <button
                onClick={() => handleCallUser(user.id, user.username, user.display_name)}
                disabled={isInCall || callingUserId === user.id}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ml-2"
              >
                {callingUserId === user.id ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Вызов...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21L6.16 11.37a11.045 11.045 0 005.516 5.516l1.983-4.064a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Позвонить
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default UsersList
