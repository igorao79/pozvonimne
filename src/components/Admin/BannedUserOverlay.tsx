'use client'

import { useEffect, useState } from 'react'
import { Ban, Clock, AlertTriangle, RefreshCw } from 'lucide-react'
import useSupabaseStore from '@/store/useSupabaseStore'

interface BanStatus {
  is_banned: boolean
  ban_reason: string | null
  ban_until: string | null
  is_permanent: boolean
}

interface BannedUserOverlayProps {
  onUnbanned?: () => void
}

const BannedUserOverlay = ({ onUnbanned }: BannedUserOverlayProps) => {
  const [banStatus, setBanStatus] = useState<BanStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRemaining, setTimeRemaining] = useState<string>('')
  const [checkingStatus, setCheckingStatus] = useState(false)

  const { supabase } = useSupabaseStore()

  useEffect(() => {
    checkBanStatus()
    
    // Проверяем статус каждые 30 секунд
    const interval = setInterval(() => {
      checkBanStatus(true)
    }, 30000)

    return () => clearInterval(interval)
  }, [checkBanStatus])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (banStatus?.is_banned && banStatus.ban_until && !banStatus.is_permanent) {
      // Обновляем оставшееся время каждую секунду
      interval = setInterval(() => {
        updateTimeRemaining()
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [banStatus, updateTimeRemaining])

  const checkBanStatus = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      if (silent) setCheckingStatus(true)
      
      const { data, error } = await supabase.rpc('check_user_ban_status')
      if (error) throw error

      const newBanStatus = data?.[0] as BanStatus
      setBanStatus(newBanStatus)
      
      // Если пользователь больше не забанен, вызываем колбэк
      if (!newBanStatus?.is_banned && banStatus?.is_banned) {
        onUnbanned?.()
      }
    } catch (err) {
      console.error('Error checking ban status:', err)
    } finally {
      if (!silent) setLoading(false)
      if (silent) setCheckingStatus(false)
    }
  }

  const updateTimeRemaining = () => {
    if (!banStatus?.ban_until) return

    const now = new Date()
    const banEnd = new Date(banStatus.ban_until)
    const diff = banEnd.getTime() - now.getTime()

    if (diff <= 0) {
      setTimeRemaining('Срок истек')
      // Проверяем статус, возможно бан автоматически снят
      checkBanStatus(true)
      return
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)

    let timeString = ''
    
    if (days > 0) {
      timeString = `${days} дн. ${hours} ч. ${minutes} мин.`
    } else if (hours > 0) {
      timeString = `${hours} ч. ${minutes} мин. ${seconds} с.`
    } else if (minutes > 0) {
      timeString = `${minutes} мин. ${seconds} с.`
    } else {
      timeString = `${seconds} с.`
    }

    setTimeRemaining(timeString)
  }

  const formatBanDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Error signing out:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Проверка статуса...</p>
        </div>
      </div>
    )
  }

  if (!banStatus?.is_banned) {
    return null // Пользователь не забанен
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full">
        <div className="bg-card border border-destructive/20 rounded-lg shadow-lg overflow-hidden">
          {/* Header with ban icon */}
          <div className="bg-destructive/10 p-6 text-center border-b border-destructive/20">
            <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Ban className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Аккаунт заблокирован
            </h1>
            <p className="text-muted-foreground">
              Доступ к вашему аккаунту временно ограничен
            </p>
          </div>

          {/* Ban details */}
          <div className="p-6 space-y-6">
            {/* Ban reason */}
            {banStatus.ban_reason && (
              <div>
                <h3 className="font-semibold text-foreground mb-2 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2 text-destructive" />
                  Причина блокировки:
                </h3>
                <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                  <p className="text-sm text-foreground">{banStatus.ban_reason}</p>
                </div>
              </div>
            )}

            {/* Ban duration */}
            <div>
              <h3 className="font-semibold text-foreground mb-2 flex items-center">
                <Clock className="h-4 w-4 mr-2 text-primary" />
                Длительность:
              </h3>
              <div className="bg-secondary/30 rounded-lg p-3">
                {banStatus.is_permanent ? (
                  <div className="text-center">
                    <p className="text-destructive font-medium">Постоянная блокировка</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Обратитесь к администрации для разблокировки
                    </p>
                  </div>
                ) : banStatus.ban_until ? (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">
                      Блокировка до: {formatBanDate(banStatus.ban_until)}
                    </p>
                    <div className="text-primary font-medium text-lg">
                      {timeRemaining}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Осталось до разблокировки
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center">
                    Информация о длительности недоступна
                  </p>
                )}
              </div>
            </div>

            {/* Information */}
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="text-sm space-y-2">
                <p className="text-blue-800 dark:text-blue-200">
                  <strong>Что делать:</strong>
                </p>
                <ul className="text-blue-600 dark:text-blue-300 space-y-1 ml-4">
                  <li>• Дождитесь окончания срока блокировки</li>
                  <li>• Ознакомьтесь с правилами сообщества</li>
                  <li>• При необходимости обратитесь к администрации</li>
                </ul>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => checkBanStatus()}
                disabled={checkingStatus}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md transition-colors flex items-center justify-center text-sm disabled:opacity-50"
              >
                {checkingStatus ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Проверяем...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Проверить статус
                  </>
                )}
              </button>
              
              <button
                onClick={handleSignOut}
                className="flex-1 bg-secondary hover:bg-secondary/80 text-foreground px-4 py-2 rounded-md transition-colors text-sm"
              >
                Выйти из аккаунта
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-muted-foreground">
            Если вы считаете блокировку ошибочной, обратитесь к администрации
          </p>
        </div>
      </div>
    </div>
  )
}

export default BannedUserOverlay
