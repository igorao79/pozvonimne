'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, CheckCircle, XCircle, Crown } from 'lucide-react'

function OAuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const processCallback = async () => {
      try {
        const code = searchParams.get('code')
        const error = searchParams.get('error')

        if (error) {
          setStatus('error')
          setMessage('Авторизация была отменена пользователем.')
          return
        }

        if (!code) {
          setStatus('error')
          setMessage('Не получен код авторизации')
          return
        }

        // Отправляем код на наш API endpoint для обмена на токен доступа
        const response = await fetch('/api/donation/process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        })

        const data = await response.json()

        if (response.ok && data.success) {
          if (data.donate_url) {
            // Сохраняем информацию о том, что пользователь начал процесс доната
            localStorage.setItem('premium_donation_started', JSON.stringify({
              timestamp: Date.now(),
              donate_url: data.donate_url
            }))

            // Перенаправляем на страницу доната
            setStatus('success')
            setMessage('Авторизация успешна! Сейчас вы будете перенаправлены на страницу доната DonationAlerts.')

            setTimeout(() => {
              window.location.href = data.donate_url
            }, 3000)
          } else {
            // Премиум уже активирован
            setStatus('success')
            setMessage('🎉 Премиум привилегии успешно активированы! Добро пожаловать в элиту!')

            // Очищаем localStorage
            localStorage.removeItem('pending_premium_purchase')
            localStorage.removeItem('premium_donation_started')

            // Перенаправляем через 4 секунды
            setTimeout(() => {
              router.push('/')
            }, 4000)
          }
        } else {
          setStatus('error')
          setMessage(data.error || 'Произошла ошибка при обработке платежа')
        }
      } catch (error) {
        console.error('Ошибка при обработке коллбэка:', error)
        setStatus('error')
        setMessage('Произошла ошибка при обработке запроса')
      }
    }

    processCallback()
  }, [searchParams, router])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4 shadow-lg">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Обработка платежа...
              </h2>
              <p className="text-muted-foreground">
                Пожалуйста, подождите, мы активируем ваши премиум привилегии
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2 flex items-center justify-center gap-2">
                <Crown className="w-5 h-5 text-yellow-500" />
                Успешно!
              </h2>
              <p className="text-muted-foreground mb-4">
                {message}
              </p>
              <p className="text-sm text-muted-foreground">
                Перенаправление на главную страницу...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Ошибка
              </h2>
              <p className="text-muted-foreground mb-4">
                {message}
              </p>
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Вернуться на главную
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4 shadow-lg">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Загрузка...
          </h2>
        </div>
      </div>
    </div>
  )
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <OAuthCallbackContent />
    </Suspense>
  )
}
