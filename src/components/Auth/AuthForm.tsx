'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import useCallStore from '@/store/useCallStore'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'

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

  const handleRegister = async (email: string, password: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {isLogin ? 'Войти в аккаунт' : 'Создать аккаунт'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isLogin ? 'Войдите, чтобы начать аудио звонки' : 'Зарегистрируйтесь для получения ID'}
          </p>
        </div>
        
        <div className="bg-white py-8 px-4 shadow-xl rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
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
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  {isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}
                </span>
              </div>
            </div>
            
            <div className="mt-6">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-indigo-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {isLogin ? 'Зарегистрироваться' : 'Войти'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthForm
