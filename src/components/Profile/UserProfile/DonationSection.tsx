import React, { useState } from 'react'
import { Gift, Crown } from 'lucide-react'
import PremiumModal from '@/components/ui/PremiumModal'
import { DonationSectionProps } from './types'
import useCallStore from '@/store/useCallStore'

const DonationSection = ({ userId, isPremium }: DonationSectionProps) => {
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false)
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)
  const { user } = useCallStore()

  // Если у пользователя уже есть премиум, не показываем эту секцию
  if (isPremium) {
    return null
  }

  const handleDonateClick = () => {
    setIsPremiumModalOpen(true)
  }

  const handlePremiumModalClose = () => {
    setIsPremiumModalOpen(false)
  }

  const handlePurchase = async () => {
    // Получаем переменные окружения для DonationAlerts
    const clientId = process.env.NEXT_PUBLIC_DA_ID || '16200'
    const redirectUri = encodeURIComponent(window.location.origin + '/oauth/callback')

    // Формируем URL для OAuth авторизации DonationAlerts
    const donationAlertsUrl = `https://www.donationalerts.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=oauth-user-show%20oauth-donation-subscribe%20oauth-donation-index%20oauth-custom_alert-store`

    console.log('🔗 Начинаем процесс покупки премиума:', {
      clientId,
      redirectUri,
      timestamp: new Date().toISOString()
    })

    // Сохраняем информацию о том, что пользователь пытается купить премиум
    // Это поможет связать донат с конкретным пользователем даже при анонимной авторизации
    localStorage.setItem('pending_premium_purchase', JSON.stringify({
      userId,
      userEmail: user?.email,
      timestamp: Date.now(),
      redirectUri,
      clientId,
      sessionToken: Date.now().toString() // Уникальный токен сессии для связи
    }))

    // Также сохраняем в базе данных информацию о начале процесса
    // Это позволит webhook найти пользователя даже если localStorage не доступен
    try {
      await fetch('/api/donation/start-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          sessionToken: Date.now().toString(),
          timestamp: Date.now()
        })
      })
    } catch (error) {
      console.warn('Не удалось сохранить информацию о процессе в БД:', error)
      // Продолжаем, так как это не критично
    }

    // Перенаправляем на DonationAlerts
    window.location.href = donationAlertsUrl
  }

  const handleCheckStatus = async () => {
    try {
      setIsCheckingStatus(true)

      const response = await fetch('/api/donation/check-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      const data = await response.json()

      if (data.premium_activated) {
        alert('🎉 Премиум статус активирован! Страница будет обновлена.')
        window.location.reload()
      } else {
        alert(`❌ Премиум статус еще не активирован.\n\n${data.message || 'Если вы уже сделали донат с сообщением "премиум", подождите несколько минут или проверьте настройки webhook.'}`)
      }
    } catch (error) {
      console.error('Ошибка проверки статуса:', error)
      alert('❌ Ошибка при проверке статуса премиума')
    } finally {
      setIsCheckingStatus(false)
    }
  }

  return (
    <>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Gift className="w-5 h-5 text-yellow-500" />
          Поддержать проект
        </h3>
        
        <div className="flex items-start space-x-3">
            <div className="flex-1 min-w-0">
              <div className="space-y-3">
                <button
                  onClick={handleDonateClick}
                  className="w-full px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500
                           hover:from-yellow-600 hover:to-orange-600
                           text-white text-sm font-medium rounded-lg
                           transition-all duration-200 hover:scale-105 hover:shadow-lg
                           focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2
                           dark:focus:ring-offset-gray-800 flex items-center justify-center gap-2"
                >
                  <Crown className="w-4 h-4" />
                  Купить премиум
                </button>

                <button
                  onClick={handleCheckStatus}
                  disabled={isCheckingStatus}
                  className="w-full px-4 py-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400
                           text-white text-sm font-medium rounded-lg
                           transition-all duration-200 hover:scale-105 hover:shadow-lg
                           focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
                           dark:focus:ring-offset-gray-800 flex items-center justify-center gap-2
                           disabled:cursor-not-allowed"
                >
                  {isCheckingStatus ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Проверка...
                    </>
                  ) : (
                    <>
                      <Gift className="w-4 h-4" />
                      Проверить статус
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
      </div>

      <PremiumModal
        isOpen={isPremiumModalOpen}
        onClose={handlePremiumModalClose}
        onPurchase={handlePurchase}
      />
    </>
  )
}

export default DonationSection
