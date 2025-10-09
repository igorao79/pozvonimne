'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Eye, EyeOff, Lock, CheckCircle, XCircle, Loader2, Home, ArrowLeft } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import useThemeStore from '@/store/useThemeStore'
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler'
import { getAssetPath } from '@/lib/utils'
import ExternalLinkProvider from '@/components/Providers/ExternalLinkProvider'

type ResetState = 'form' | 'loading' | 'success' | 'error'

const ResetPasswordContent = () => {
  const [state, setState] = useState<ResetState>('form')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [countdown, setCountdown] = useState(5)
  const { theme } = useThemeStore()
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Проверяем наличие токена в URL
    const accessToken = searchParams.get('access_token')
    const refreshToken = searchParams.get('refresh_token')
    const type = searchParams.get('type')

    if (!accessToken || !refreshToken || type !== 'recovery') {
      setState('error')
      setMessage('Неверная ссылка сброса пароля. Пожалуйста, запросите новый сброс пароля.')
      return
    }

    // Устанавливаем сессию с токенами
    supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    }).catch(() => {
      setState('error')
      setMessage('Ошибка авторизации. Пожалуйста, запросите новый сброс пароля.')
    })
  }, [searchParams, supabase.auth])

  const validatePassword = (password: string): string | null => {
    if (password.length < 6) {
      return 'Пароль должен содержать минимум 6 символов'
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return 'Пароль должен содержать хотя бы одну строчную букву'
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return 'Пароль должен содержать хотя бы одну заглавную букву'
    }
    if (!/(?=.*\d)/.test(password)) {
      return 'Пароль должен содержать хотя бы одну цифру'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Валидация пароля
    const passwordError = validatePassword(password)
    if (passwordError) {
      setState('error')
      setMessage(passwordError)
      return
    }

    if (password !== confirmPassword) {
      setState('error')
      setMessage('Пароли не совпадают')
      return
    }

    setState('loading')

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) {
        console.error('Password reset error:', error)
        setState('error')
        setMessage('Ошибка сброса пароля: ' + error.message)
        return
      }

      setState('success')
      setMessage('Пароль успешно изменен! Теперь вы можете войти в свой аккаунт.')

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
    } catch (err) {
      console.error('Reset password error:', err)
      setState('error')
      setMessage('Произошла неожиданная ошибка при сбросе пароля.')
    }
  }

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
      case 'error':
        return <XCircle className="w-16 h-16 text-red-500 animate-pulse" />
      default:
        return <Lock className="w-16 h-16 text-blue-500" />
    }
  }

  const getStatusTitle = () => {
    switch (state) {
      case 'loading':
        return 'Сбрасываем пароль...'
      case 'success':
        return 'Пароль изменен!'
      case 'error':
        return 'Ошибка сброса пароля'
      default:
        return 'Сброс пароля'
    }
  }

  const getStatusColor = () => {
    switch (state) {
      case 'loading':
        return 'text-blue-600 dark:text-blue-400'
      case 'success':
        return 'text-green-600 dark:text-green-400'
      case 'error':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-blue-600 dark:text-blue-400'
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
              bg-card border border-border rounded-xl shadow-xl p-8
              transition-all duration-500 transform
              ${state === 'success' ? 'scale-105' : ''}
            `}>
              {/* Status Icon */}
              <div className="mb-6 flex justify-center">
                {getStatusIcon()}
              </div>

              {/* Title */}
              <h1 className={`text-2xl font-bold mb-4 text-center ${getStatusColor()}`}>
                {getStatusTitle()}
              </h1>

              {/* Success Message */}
              {state === 'success' && (
                <>
                  <p className="text-muted-foreground mb-6 leading-relaxed text-center text-green-700 dark:text-green-300">
                    {message}
                  </p>

                  {/* Success Animation and Countdown */}
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
                </>
              )}

              {/* Error Message */}
              {state === 'error' && (
                <p className="text-muted-foreground mb-6 leading-relaxed text-center text-red-700 dark:text-red-300">
                  {message}
                </p>
              )}

              {/* Password Reset Form */}
              {state === 'form' && (
                <>
                  <p className="text-muted-foreground mb-6 leading-relaxed text-center">
                    Введите новый пароль для вашего аккаунта. Пароль должен содержать минимум 6 символов,
                    включая заглавные и строчные буквы, а также цифры.
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* New Password */}
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                        Новый пароль
                      </label>
                      <div className="relative">
                        <input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full px-4 py-3 pr-12 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                          placeholder="Введите новый пароль"
                          required
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">
                        Подтвердите пароль
                      </label>
                      <div className="relative">
                        <input
                          id="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-4 py-3 pr-12 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors"
                          placeholder="Повторите новый пароль"
                          required
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Password Requirements */}
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>Требования к паролю:</p>
                      <ul className="list-disc list-inside space-y-0.5 ml-2">
                        <li className={password.length >= 6 ? 'text-green-600 dark:text-green-400' : ''}>
                          Минимум 6 символов
                        </li>
                        <li className={/(?=.*[a-z])/.test(password) ? 'text-green-600 dark:text-green-400' : ''}>
                          Одна строчная буква
                        </li>
                        <li className={/(?=.*[A-Z])/.test(password) ? 'text-green-600 dark:text-green-400' : ''}>
                          Одна заглавная буква
                        </li>
                        <li className={/(?=.*\d)/.test(password) ? 'text-green-600 dark:text-green-400' : ''}>
                          Одна цифра
                        </li>
                      </ul>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      Сбросить пароль
                    </button>
                  </form>
                </>
              )}

              {/* Action Buttons */}
              <div className="space-y-3 mt-6">
                {state === 'success' && (
                  <button
                    onClick={handleGoHome}
                    className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Войти в аккаунт</span>
                  </button>
                )}

                <button
                  onClick={handleGoHome}
                  className={`w-full flex items-center justify-center space-x-2 font-medium py-3 px-4 rounded-lg transition-colors duration-200 ${
                    state === 'success'
                      ? 'border border-border text-muted-foreground hover:bg-secondary'
                      : 'bg-gray-600 hover:bg-gray-700 text-white'
                  }`}
                >
                  <Home className="w-4 h-4" />
                  <span>На главную</span>
                </button>

                {state === 'error' && (
                  <p className="text-xs text-muted-foreground mt-4 text-center">
                    Если проблема повторяется, обратитесь в поддержку или запросите новый сброс пароля
                  </p>
                )}
              </div>
            </div>

            {/* Additional Info for Success */}
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
                      Пароль успешно изменен!
                    </h3>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Теперь вы можете безопасно входить в свой аккаунт с новым паролем.
                      Рекомендуем использовать надежный пароль и включить двухфакторную аутентификацию.
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

const ResetPasswordPage = () => {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}

export default ResetPasswordPage
