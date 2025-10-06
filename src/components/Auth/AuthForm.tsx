'use client'

import { useState } from 'react'
import Image from 'next/image'
import { createClient, getRedirectUrl } from '@/utils/supabase/client'
import useCallStore from '@/store/useCallStore'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'
import EmailVerificationModal from './EmailVerificationModal'
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler'
import { getAssetPath } from '@/lib/utils'
import OptimizedImage from '@/components/ui/OptimizedImage'
import { translateAuthError, getDisplayErrorMessage } from '@/utils/authErrorTranslations'

const AuthForm = () => {
  const [isLogin, setIsLogin] = useState(true)
  const [showEmailVerification, setShowEmailVerification] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [isResendingEmail, setIsResendingEmail] = useState(false)
  const { setUser, setUserId, setAuthenticated, setError, setIsLoading, error, isLoading } = useCallStore()
  
  const supabase = createClient()

  const handleLogin = async (email: string, password: string, rememberMe: boolean = false) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        const translatedError = getDisplayErrorMessage(error)
        setError('Ошибка входа: ' + translatedError)
        return
      }

      if (data.user) {
        // Проверяем, подтвержден ли email при входе
        const isEmailConfirmed = data.user.email_confirmed_at !== null
        
        if (isEmailConfirmed) {
          setUser(data.user)
          setUserId(data.user.id)
          setAuthenticated(true)

          // Сохраняем информацию о rememberMe в localStorage для Electron
          if (typeof window !== 'undefined' && rememberMe) {
            localStorage.setItem('rememberMe', 'true')
            localStorage.setItem('lastLoginTime', Date.now().toString())
            console.log('💾 Сохранена настройка "Запомнить меня"')
          }
          
          console.log('✅ User logged in with verified email:', data.user.email)
        } else {
          // Email не подтвержден - не авторизуем пользователя
          setUser(data.user)
          setUserId(data.user.id)
          setAuthenticated(false)
          console.log('📧 User tried to login but email not verified:', data.user.email)
        }
      }
    } catch (err) {
      const translatedError = getDisplayErrorMessage(err as any)
      setError('Произошла ошибка при входе: ' + translatedError)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (email: string, password: string, displayName: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName
          },
          emailRedirectTo: getRedirectUrl('/auth/callback')
        }
      })

      if (error) {
        const translatedError = getDisplayErrorMessage(error)
        setError('Ошибка регистрации: ' + translatedError)
        return
      }

      if (data.user) {
        // Детальное логирование для отладки
        console.log('🔍 [REGISTRATION DEBUG] User data:', {
          id: data.user.id,
          email: data.user.email,
          email_confirmed_at: data.user.email_confirmed_at,
          confirmed_at: data.user.confirmed_at,
          email_confirmed: data.user.email_confirmed_at !== null,
          user_metadata: data.user.user_metadata,
          app_metadata: data.user.app_metadata
        })
        
        // Проверяем, подтвержден ли email (покрываем null и undefined)
        const isEmailConfirmed = !!data.user.email_confirmed_at
        
        if (isEmailConfirmed) {
          // Email уже подтвержден (автоподтверждение в Supabase)
          setUser(data.user)
          setUserId(data.user.id)
          setAuthenticated(true)
          console.log('🎉 Email автоматически подтвержден, пользователь авторизован')
        } else {
          // Email требует подтверждения - показываем модальное окно
          setRegisteredEmail(email)
          setShowEmailVerification(true)
          setError(null) // Очищаем ошибки
          console.log('📧 Email требует подтверждения, показываем модальное окно')
          // НЕ устанавливаем пользователя в store, чтобы он остался на странице авторизации
        }
      }
    } catch (err) {
      const translatedError = getDisplayErrorMessage(err as any)
      setError('Произошла ошибка при регистрации: ' + translatedError)
    } finally {
      setIsLoading(false)
    }
  }

  // Функция для повторной отправки email подтверждения
  const handleResendEmail = async () => {
    if (!registeredEmail) return
    
    setIsResendingEmail(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: registeredEmail,
        options: {
          emailRedirectTo: getRedirectUrl('/auth/callback')
        }
      })
      
      if (error) {
        setError('Ошибка при отправке письма: ' + getDisplayErrorMessage(error))
      } else {
        setError('Письмо отправлено повторно! Проверьте почту.')
      }
    } catch (err) {
      setError('Произошла ошибка при отправке письма')
    } finally {
      setIsResendingEmail(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border flex-shrink-0 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-2">
            <div className="flex items-center">
              <OptimizedImage
                src="/logo.webp"
                alt="Позвони.мне логотип"
                width={32}
                height={32}
                className="mr-2 select-none"
                priority
                quality={95}
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
              />
              <h1 className="text-lg font-semibold text-foreground">
                Позвони.мне
              </h1>
            </div>
            <div className="flex items-center">
              <AnimatedThemeToggler />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-foreground">
            {isLogin ? 'Войти в аккаунт' : 'Создать аккаунт'}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {isLogin ? 'Войдите, чтобы начать аудио звонки' : 'Зарегистрируйтесь для получения ID'}
          </p>
        </div>
        
        <div className="bg-card py-8 px-4 shadow-xl rounded-lg sm:px-10 border border-border">
          {error && (
            <div className="mb-4 bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded relative">
              {error}
            </div>
          )}
          
          {isLogin ? (
            <LoginForm onLogin={handleLogin} isLoading={isLoading} />
          ) : (
            <RegisterForm onRegister={handleRegister} isLoading={isLoading} />
          )}
          
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-card text-muted-foreground">
                  {isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}
                </span>
              </div>
            </div>
            
            <div className="mt-6">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="w-full flex justify-center py-2 px-4 border border-border rounded-md shadow-sm text-sm font-medium text-primary bg-card hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
              >
                {isLogin ? 'Зарегистрироваться' : 'Войти'}
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>
      
      {/* Модальное окно подтверждения email */}
      {showEmailVerification && (
        <EmailVerificationModal
          isOpen={showEmailVerification}
          email={registeredEmail}
          onClose={() => setShowEmailVerification(false)}
          onResendEmail={handleResendEmail}
          isResending={isResendingEmail}
        />
      )}

    </div>
  )
}

export default AuthForm
