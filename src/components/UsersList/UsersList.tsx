'use client'

import { useState } from 'react'
import useUsers from '@/hooks/useUsers'
import useCallStore from '@/store/useCallStore'
import { createClient } from '@/utils/supabase/client'
import { sendIncomingCallSignal } from '@/utils/callSignaling'
import { default as UserProfile } from '../Profile/UserProfile'
import LoadingState from './LoadingState'
import ErrorState from './ErrorState'
import EmptyState from './EmptyState'
import CurrentUserCard from './CurrentUserCard'
import UserCard from './UserCard'
import { unlockAudio, setupMobileAudio, isMobileDevice } from '@/utils/mobileAudioFix'

interface BroadcastPayload {
  payload: any
  event: string
}

const UsersList = () => {
  const { users, loading, error, refreshUsers } = useUsers()
  const [callingUserId, setCallingUserId] = useState<string | null>(null)
  const [selectedUserProfile, setSelectedUserProfile] = useState<string | null>(null)

  // Функция для форматирования статуса последнего входа
  const formatLastSeen = (lastSignInAt: string | null | undefined, status?: string): string | null => {
    console.log('🔍 formatLastSeen:', { lastSignInAt, status })

    // Вместо "Неизвестно" показываем null - будет показан лоадер
    if (!lastSignInAt) return null

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

    if (!userId) {
      setError('Ошибка: пользователь не авторизован')
      return
    }

    // КРИТИЧНО: Разблокируем аудио контекст при пользовательском взаимодействии (нажатии кнопки звонка)
    if (isMobileDevice()) {
      console.log('📱 Mobile device detected, unlocking audio context before call...')
      try {
        setupMobileAudio()
        await unlockAudio()
        console.log('✅ Audio context unlocked successfully')
      } catch (audioErr) {
        console.error('❌ Failed to unlock audio context:', audioErr)
        // Продолжаем даже при ошибке разблокировки
      }
    }

    setCallingUserId(targetUserId)
    setIsLoading(true)
    setError(null)

    try {
      console.log('📞 UsersList: Starting call to user:', targetUserId)

      // Используем надежную отправку сигнала входящего звонка
      const signalSent = await sendIncomingCallSignal(
        targetUserId,
        userId,
        displayName || targetUsername
      )

      if (signalSent) {
        console.log('✅ UsersList: Call signal sent successfully')
        // Запускаем локальную логику звонка
        startCall(targetUserId)
        console.log('✅ UsersList: Call initiated successfully')
      } else {
        throw new Error('Failed to send call signal')
      }

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
            onClick={() => refreshUsers()}
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
