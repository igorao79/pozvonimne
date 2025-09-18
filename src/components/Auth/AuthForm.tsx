'use client'

import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/utils/supabase/client'
import useCallStore from '@/store/useCallStore'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'
import { ThemeToggler } from '@/components/ui/theme-toggler'
import { getAssetPath } from '@/lib/utils'

const AuthForm = () => {
  const [isLogin, setIsLogin] = useState(true)
  const { setUser, setUserId, setAuthenticated, setError, setIsLoading, error, isLoading } = useCallStore()
  
  const supabase = createClient()

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError('Ошибка входа: ' + error.message)
        return
      }

      if (data.user) {
        setUser(data.user)
        setUserId(data.user.id)
        setAuthenticated(true)
      }
    } catch (err) {
      setError('Произошла ошибка при входе')
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
          }
        }
      })

      if (error) {
        setError('Ошибка регистрации: ' + error.message)
        return
      }

      if (data.user) {
        setUser(data.user)
        setUserId(data.user.id)
        setAuthenticated(true)
        setError('Регистрация успешна! Проверьте email для подтверждения.')
      }
    } catch (err) {
      setError('Произошла ошибка при регистрации')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border flex-shrink-0 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-2">
            <div className="flex items-center">
              <img
                src={getAssetPath("/logo.webp")}
                alt="Позвони.мне логотип"
                width={32}
                height={32}
                className="mr-2"
              />
              <h1 className="text-lg font-semibold text-foreground">
                Позвони.мне
              </h1>
            </div>
            <div className="flex items-center">
              <ThemeToggler />
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
    </div>
  )
}

export default AuthForm
