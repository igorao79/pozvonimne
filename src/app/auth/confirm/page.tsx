'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { CheckCircle, XCircle, Loader2, Home, LogIn } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import useThemeStore from '@/store/useThemeStore'
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler'
import { getAssetPath } from '@/lib/utils'
import ExternalLinkProvider from '@/components/Providers/ExternalLinkProvider'

type ConfirmationState = 'loading' | 'success' | 'error' | 'expired'

const EmailConfirmationContent = () => {
  const [state, setState] = useState<ConfirmationState>('loading')
  const [message, setMessage] = useState('')
  const [countdown, setCountdown] = useState(5)
  const { theme } = useThemeStore()
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const confirmEmail = async () => {
      try {
        // Получаем токены из URL
        const token_hash = searchParams.get('token_hash')
        const type = searchParams.get('type')
        
        if (!token_hash || type !== 'signup') {
          setState('error')
          setMessage('Неверная ссылка подтверждения. Проверьте правильность ссылки.')
          return
        }

        // Подтверждаем email через Supabase
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash,
          type: 'signup'
        })

        if (error) {
          console.error('Email confirmation error:', error)
          
          if (error.message.includes('expired')) {
            setState('expired')
            setMessage('Ссылка подтверждения истекла. Пожалуйста, зарегистрируйтесь заново.')
          } else {
            setState('error')
            setMessage('Ошибка подтверждения: ' + error.message)
          }
          return
        }

        if (data.user) {
          setState('success')
          setMessage('Email успешно подтвержден! Теперь вы можете войти в свой аккаунт.')
          
          // Запускаем обратный отсчет для редиректа
          const timer = setInterval(() => {
            setCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(timer)
                router.push('/')
                return 0
              }
              return prev - 1
            })
          }, 1000)

          return () => clearInterval(timer)
        } else {
          setState('error')
          setMessage('Не удалось подтвердить email. Попробуйте еще раз.')
        }
      } catch (err) {
        console.error('Confirmation error:', err)
        setState('error')
        setMessage('Произошла неожиданная ошибка при подтверждении.')
      }
    }

    confirmEmail()
  }, [searchParams, router, supabase.auth])

  const handleGoHome = () => {
    router.push('/')
  }

  const getStatusIcon = () => {
    switch (state) {
      case 'loading':
        return <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
      case 'success':
        return (
          <div className="relative">
            <CheckCircle className="w-16 h-16 text-green-500 animate-bounce" />
            <div className="absolute inset-0 w-16 h-16 border-4 border-green-500 rounded-full animate-ping opacity-20"></div>
          </div>
        )
      case 'expired':
      case 'error':
        return <XCircle className="w-16 h-16 text-red-500 animate-pulse" />
      default:
        return null
    }
  }

  const getStatusTitle = () => {
    switch (state) {
      case 'loading':
        return 'Подтверждаем ваш email...'
      case 'success':
        return 'Добро пожаловать!'
      case 'expired':
        return 'Ссылка истекла'
      case 'error':
        return 'Ошибка подтверждения'
      default:
        return ''
    }
  }

  const getStatusColor = () => {
    switch (state) {
      case 'loading':
        return 'text-blue-600 dark:text-blue-400'
      case 'success':
        return 'text-green-600 dark:text-green-400'
      case 'expired':
      case 'error':
        return 'text-red-600 dark:text-red-400'
      default:
        return ''
    }
  }

  return (
    <ExternalLinkProvider>
      <div className="min-h-screen flex flex-col bg-background">
        {/* Header */}
        <header className="bg-card shadow-sm border-b border-border flex-shrink-0 transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-3">
              <div className="flex items-center space-x-3">
                <Image
                  src={getAssetPath('/logo.ico')}
                  alt="Позвони.мне"
                  width={32}
                  height={32}
                  className="rounded-full"
                />
                <h1 className="text-xl font-bold text-foreground">
                  Позвони.мне
                </h1>
              </div>
              <AnimatedThemeToggler />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className={`
              bg-card border border-border rounded-xl shadow-xl p-8 text-center
              transition-all duration-500 transform
              ${state === 'success' ? 'scale-105' : ''}
            `}>
              {/* Status Icon */}
              <div className="mb-6 flex justify-center">
                {getStatusIcon()}
              </div>

              {/* Title */}
              <h1 className={`text-2xl font-bold mb-4 ${getStatusColor()}`}>
                {getStatusTitle()}
              </h1>

              {/* Message */}
              <p className={`text-muted-foreground mb-6 leading-relaxed ${
                state === 'success' ? 'text-green-700 dark:text-green-300' : ''
              }`}>
                {message}
              </p>

              {/* Success Animation and Countdown */}
              {state === 'success' && (
                <div className="mb-6">
                  <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground mb-4">
                    <span>Автоматический переход через</span>
                    <span className="font-bold text-blue-500">{countdown}</span>
                    <span>сек.</span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-full bg-secondary rounded-full h-2 mb-4">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-1000 ease-linear"
                      style={{ width: `${((5 - countdown) / 5) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                {state === 'success' && (
                  <button
                    onClick={handleGoHome}
                    className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Войти в аккаунт</span>
                  </button>
                )}

                <button
                  onClick={handleGoHome}
                  className={`w-full flex items-center justify-center space-x-2 font-medium py-3 px-4 rounded-lg transition-colors duration-200 ${
                    state === 'success'
                      ? 'border border-border text-muted-foreground hover:bg-secondary'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  <Home className="w-4 h-4" />
                  <span>На главную</span>
                </button>

                {(state === 'expired' || state === 'error') && (
                  <p className="text-xs text-muted-foreground mt-4">
                    {state === 'expired' 
                      ? 'Вы можете зарегистрироваться заново на главной странице'
                      : 'Если проблема повторяется, обратитесь в поддержку'
                    }
                  </p>
                )}
              </div>
            </div>

            {/* Additional Info */}
            {state === 'success' && (
              <div className={`
                mt-6 p-4 rounded-lg border-l-4 border-green-500
                ${theme === 'dark' ? 'bg-green-600/10' : 'bg-green-50'}
                animate-fade-in-up
              `}>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-green-800 dark:text-green-200 mb-1">
                      Регистрация завершена!
                    </h3>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Теперь вы можете пользоваться всеми возможностями Позвони.мне: 
                      совершать звонки, отправлять сообщения и делиться экраном.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-card border-t border-border py-6 text-center">
          <p className="text-sm text-muted-foreground">
            © 2024 Позвони.мне - Простые и безопасные голосовые звонки
          </p>
        </footer>
      </div>
    </ExternalLinkProvider>
  )
}

const EmailConfirmationPage = () => {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    }>
      <EmailConfirmationContent />
    </Suspense>
  )
}

export default EmailConfirmationPage
