'use client'

import { useState } from 'react'
import useUsers from '@/hooks/useUsers'
import useCallStore from '@/store/useCallStore'
import { createClient } from '@/utils/supabase/client'
import { default as UserProfile } from '../Profile/UserProfile'
import LoadingState from './LoadingState'
import ErrorState from './ErrorState'
import EmptyState from './EmptyState'
import CurrentUserCard from './CurrentUserCard'
import UserCard from './UserCard'

interface BroadcastPayload {
  payload: any
  event: string
}

const UsersList = () => {
  const { users, loading, error, refreshUsers } = useUsers()
  const [callingUserId, setCallingUserId] = useState<string | null>(null)
  const [selectedUserProfile, setSelectedUserProfile] = useState<string | null>(null)

  // Функция для форматирования статуса последнего входа
  const formatLastSeen = (lastSignInAt: string | null | undefined, status?: string) => {
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
    return <LoadingState title="Пользователи онлайн" />
  }

  if (error) {
    return <ErrorState title="Пользователи приложения" error={error} onRetry={refreshUsers} />
  }

  // Показываем всех пользователей, включая текущего для диагностики
  const allUsers = users
  const currentUser = users.find(user => user.id === userId)
  const otherUsers = users.filter(user => user.id !== userId)

  return (
    <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-foreground">
            Пользователи приложения ({allUsers.length})
          </h2>
          <button
            onClick={refreshUsers}
            className="text-primary hover:text-primary/80 text-sm transition-colors"
          >
            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Обновить
          </button>
        </div>

      {allUsers.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {/* Текущий пользователь */}
          {currentUser && <CurrentUserCard user={currentUser} />}

          {otherUsers.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              isInCall={isInCall}
              callingUserId={callingUserId}
              formatLastSeen={formatLastSeen}
              onCallUser={handleCallUser}
              onShowProfile={setSelectedUserProfile}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default UsersList
