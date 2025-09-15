'use client'

import { useState } from 'react'
import useUsers from '@/hooks/useUsers'
import useCallStore from '@/store/useCallStore'
import { createClient } from '@/utils/supabase/client'
import { default as UserProfile } from '../Profile/UserProfile'

interface BroadcastPayload {
  payload: any
  event: string
}

const UsersList = () => {
  const { users, loading, error, refreshUsers } = useUsers()
  const [callingUserId, setCallingUserId] = useState<string | null>(null)
  const [selectedUserProfile, setSelectedUserProfile] = useState<string | null>(null)

  // Функция для форматирования статуса последнего входа
  const formatLastSeen = (lastSignInAt: string | null, status?: string) => {
    console.log('🔍 formatLastSeen:', { lastSignInAt, status })

    if (!lastSignInAt) return 'Неизвестно'

    const lastSignIn = new Date(lastSignInAt)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - lastSignIn.getTime()) / (1000 * 60))

    console.log('⏰ Время:', { lastSignIn, now, diffInMinutes, status })

    // Онлайн: активность в последние 5 минут (независимо от статуса в БД)
    if (diffInMinutes <= 5) {
      console.log('✅ Онлайн! (активность в последние 5 минут)')
      return 'онлайн'
    }

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const lastSignInDate = new Date(lastSignIn.getFullYear(), lastSignIn.getMonth(), lastSignIn.getDate())

    if (lastSignInDate.getTime() === today.getTime()) {
      // Сегодня - показываем время
      const timeString = lastSignIn.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      })
      return `сегодня, ${timeString}`
    } else {
      // Не сегодня - показываем дату
      return lastSignIn.toLocaleDateString('ru-RU')
    }
  }
  
  const {
    userId,
    startCall,
    isInCall,
    setError,
    setIsLoading,
    endCall
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

    let callChannel: any = null

    try {
      console.log('🔄 Starting call to user:', targetUserId)

      // Используем стандартный канал получателя для отправки сигнала
      const receiverChannelId = `calls:${targetUserId}`
      
      // Быстрая проверка и переиспользование существующих каналов
      let needsNewChannel = true
      try {
        const existingChannel = supabase.getChannels().find(ch => ch.topic === receiverChannelId)
        
        if (existingChannel && existingChannel.state !== 'closed') {
          console.log('🔄 Reusing existing channel:', receiverChannelId, 'State:', existingChannel.state)
          callChannel = existingChannel
          needsNewChannel = false
        } else if (existingChannel) {
          console.log('🧹 Removing closed channel before creating new one')
          try {
            existingChannel.unsubscribe()
            supabase.removeChannel(existingChannel)
          } catch (err) {
            console.warn('Error removing closed channel:', err)
          }
        }
      } catch (err) {
        console.warn('Error checking existing channels:', err)
      }

      // Создаём канал только если нужен новый
      if (needsNewChannel) {
        callChannel = supabase.channel(receiverChannelId)
        console.log('📡 Created new call channel:', receiverChannelId)
      }

      // Добавляем обработчики ответов на звонок для дополнительной надежности
      if (needsNewChannel) {
        callChannel
          .on('broadcast', { event: 'call_accepted' }, (payload: BroadcastPayload) => {
            console.log('📞 Call accepted by receiver:', payload)
            // Обработка принятия звонка уже есть в CallInterface
          })
          .on('broadcast', { event: 'call_rejected' }, (payload: BroadcastPayload) => {
            console.log('📞 Call rejected by receiver:', payload)
            const currentState = useCallStore.getState()
            if (currentState.isCalling && currentState.targetUserId === targetUserId) {
              console.log('📞 Our call was rejected - ending call from UsersList')
              setError('Звонок отклонен')
              endCall()
            }
          })
          .on('broadcast', { event: 'call_ended' }, (payload: BroadcastPayload) => {
            console.log('📞 Call ended by receiver:', payload)
            const currentState = useCallStore.getState()
            if (currentState.isInCall) {
              console.log('📞 Call ended by other user from UsersList')
              endCall()
            }
          })
      }

      // Быстрая оптимизированная подписка
      if (needsNewChannel) {
        console.log('📡 Subscribing to new channel...')

        // Моментальная подписка без задержек
        const subscriptionPromise = new Promise((resolve) => {
          const timeout = setTimeout(() => {
            console.warn('📡 New channel subscription timeout, continuing anyway')
            resolve('timeout')
          }, 200) // Минимум для надежности

          callChannel?.subscribe((status: string) => {
            clearTimeout(timeout)
            console.log('📡 New channel subscription status:', status)

            if (status === 'SUBSCRIBED') {
              console.log('✅ New channel subscribed successfully')
            } else {
              console.warn('⚠️ New channel subscription issue, continuing:', status)
            }
            resolve(status)
          })
        })

        await subscriptionPromise
      } else {
        console.log('📡 Using existing channel, checking state...')
        
          // Для переиспользуемых каналов моментальная проверка
        if (callChannel?.state !== 'joined' && callChannel?.state !== 'joining') {
          console.log('🔄 Existing channel not ready, instant resubscribe')
          callChannel?.subscribe(() => {})
        }
      }

      console.log('✅ Proceeding with call immediately')

      // Убираем ненужные задержки для ускорения

      // Send call signal with improved retry logic
      let callSent = false
      let attempts = 0
      const maxAttempts = 3

      while (!callSent && attempts < maxAttempts) {
        attempts++
        console.log(`📞 Attempting to send call signal (attempt ${attempts}/${maxAttempts})`)
        console.log(`📞 Channel state before send:`, callChannel?.state)

        try {
          // Проверяем состояние канала перед отправкой
          if (callChannel?.state === 'closed') {
            console.warn('📞 Channel is closed, recreating...')
            callChannel = supabase.channel(receiverChannelId)
            // Мгновенная попытка подписки без ожидания
            callChannel.subscribe(() => {})
            // Убираем задержку для ускорения
          }

          const result = await callChannel?.send({
            type: 'broadcast',
            event: 'incoming_call',
            payload: {
              caller_id: userId,
              caller_name: displayName || targetUsername,
              timestamp: Date.now()
            }
          })

          console.log('📞 Call signal send result:', result)

          if (result === 'ok') {
            callSent = true
            console.log('✅ Call signal sent successfully to user:', targetUserId)
          } else {
            throw new Error(`Send failed with result: ${result}`)
          }
        } catch (sendErr) {
          console.warn(`❌ Call signal send attempt ${attempts} failed:`, sendErr)

          if (attempts < maxAttempts) {
            console.log('🔄 Retrying call signal instantly...')
            // Убираем задержку между попытками для максимальной скорости
          }
        }
      }

      if (!callSent) {
        throw new Error('Failed to send call signal after all attempts')
      }

      // Start the call locally
      startCall(targetUserId)

      // Не закрываем канал сразу - он нужен для получения ответа
      console.log('✅ Call initiated successfully, keeping channel open for response')

    } catch (err) {
      console.error('❌ Call error:', err)

      let errorMessage = 'Ошибка при совершении звонка'
      if (err instanceof Error) {
        if (err.message.includes('Subscription timeout') || err.message.includes('TIMED_OUT')) {
          errorMessage = 'Проблема с соединением. Проверьте интернет.'
        } else if (err.message.includes('Failed to send call signal')) {
          errorMessage = 'Не удалось связаться с пользователем. Попробуйте позже.'
        } else if (err.message.includes('Subscription failed')) {
          errorMessage = 'Ошибка подключения. Попробуйте еще раз.'
        }
      }

      setError(errorMessage)

      // Очистка канала только в случае ошибки
      if (callChannel) {
        try {
          console.log('🧹 Cleaning up call channel due to error')
          callChannel.unsubscribe()
        } catch (cleanupErr) {
          console.warn('Error cleaning up call channel:', cleanupErr)
        }
      }
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

  // Показываем всех пользователей, включая текущего для диагностики
  const allUsers = users
  const currentUser = users.find(user => user.id === userId)
  const otherUsers = users.filter(user => user.id !== userId)

  return (
    <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Пользователи приложения ({allUsers.length})
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

      {allUsers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p>Загрузка пользователей...</p>
          <p className="text-sm text-gray-400 mt-1">
            Если список пустой - зарегистрируйте новых пользователей
          </p>
          <p className="text-xs text-red-400 mt-2">
            ⚠️ Решение: выполните ТОЛЬКО supabase_updates.sql в SQL Editor Supabase
          </p>
          <p className="text-xs text-orange-400 mt-1">
            ❌ НЕ выполняйте supabase_setup.sql - он удалит все данные!
          </p>
          <p className="text-xs text-blue-600 mt-1">
            📋 supabase_updates.sql содержит: колонки status/last_seen, функцию set_user_offline, исправленную get_users_with_profiles
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {/* Текущий пользователь */}
          {currentUser && (
            <div
              className="flex items-center justify-between p-3 bg-blue-50 border-2 border-blue-200 rounded-lg"
            >
              <div className="flex items-center space-x-3 flex-1">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                  {currentUser.avatar_url ? (
                    <img
                      src={currentUser.avatar_url}
                      alt={currentUser.display_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <span className="text-white font-medium text-sm">
                        {currentUser.display_name?.charAt(0)?.toUpperCase() || currentUser.username?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-blue-900 truncate">
                    {currentUser.display_name || currentUser.username} <span className="text-sm font-normal">(Вы)</span>
                  </p>
                  <p className="text-xs text-blue-700">
                    ● онлайн
                  </p>
                </div>
              </div>

              <div className="text-sm text-blue-600 font-medium">
                Это вы
              </div>
            </div>
          )}

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
                    {user.last_seen && (
                      <p className={`text-xs ${
                        formatLastSeen(user.last_seen, user.status) === 'онлайн'
                          ? 'text-green-500 font-medium'
                          : 'text-gray-500'
                      }`}>
                        ● {formatLastSeen(user.last_seen, user.status) === 'онлайн'
                          ? 'онлайн'
                          : `Был в сети: ${formatLastSeen(user.last_seen, user.status)}`}
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
