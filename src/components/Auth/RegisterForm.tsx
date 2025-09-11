'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

interface RegisterFormProps {
  onRegister: (email: string, password: string, displayName: string) => void
  isLoading: boolean
}

const RegisterForm = ({ onRegister, isLoading }: RegisterFormProps) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [displayNameAvailable, setDisplayNameAvailable] = useState<boolean | null>(null)
  const [checkingDisplayName, setCheckingDisplayName] = useState(false)

  const supabase = createClient()

  const validatePassword = (pass: string) => {
    if (pass.length < 6) {
      return 'Пароль должен содержать минимум 6 символов'
    }
    return ''
  }

  // Проверка уникальности display_name
  useEffect(() => {
    if (!displayName || displayName.length < 3) {
      setDisplayNameAvailable(null)
      return
    }

    const checkDisplayName = async () => {
      try {
        setCheckingDisplayName(true)
        const { data, error } = await supabase.rpc('is_display_name_available', {
          check_display_name: displayName
        })

        if (error) throw error
        setDisplayNameAvailable(data)
      } catch (err) {
        console.error('Error checking display name:', err)
        setDisplayNameAvailable(false)
      } finally {
        setCheckingDisplayName(false)
      }
    }

    const timeoutId = setTimeout(checkDisplayName, 500)
    return () => clearTimeout(timeoutId)
  }, [displayName, supabase])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const passError = validatePassword(password)
    if (passError) {
      setPasswordError(passError)
      return
    }

    if (password !== confirmPassword) {
      setPasswordError('Пароли не совпадают')
      return
    }

    // Проверяем доступность display_name
    if (displayNameAvailable === false) {
      setPasswordError('Это имя уже занято. Выберите другое.')
      return
    }

    if (displayNameAvailable === null && displayName.length >= 3) {
      setPasswordError('Проверяем доступность имени...')
      return
    }

    setPasswordError('')
    onRegister(email, password, displayName)
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email адрес
        </label>
        <div className="mt-1">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Введите ваш email"
          />
        </div>
      </div>

      <div>
        <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
          Отображаемое имя
        </label>
        <div className="mt-1">
          <input
            id="displayName"
            name="displayName"
            type="text"
            autoComplete="name"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Как вас будут видеть другие пользователи"
          />
        </div>
        {displayName && displayName.length >= 3 && (
          <p className={`text-sm mt-1 flex items-center ${
            checkingDisplayName ? 'text-gray-500' :
            displayNameAvailable === true ? 'text-green-600' :
            displayNameAvailable === false ? 'text-red-600' : 'text-gray-500'
          }`}>
            {checkingDisplayName ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b border-current mr-2"></div>
                Проверяем...
              </>
            ) : displayNameAvailable === true ? (
              <>
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Имя доступно
              </>
            ) : displayNameAvailable === false ? (
              <>
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Имя занято
              </>
            ) : null}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Пароль
        </label>
        <div className="mt-1">
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (passwordError) setPasswordError('')
            }}
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Минимум 6 символов"
          />
        </div>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
          Подтверждение пароля
        </label>
        <div className="mt-1">
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value)
              if (passwordError) setPasswordError('')
            }}
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Повторите пароль"
          />
        </div>
      </div>

      {passwordError && (
        <div className="text-red-600 text-sm">{passwordError}</div>
      )}

      <div>
        <button
          type="submit"
          disabled={isLoading || !email || !displayName || !password || !confirmPassword || displayNameAvailable === false || (displayName.length >= 3 && displayNameAvailable === null)}
          className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Регистрация...
            </div>
          ) : (
            'Зарегистрироваться'
          )}
        </button>
      </div>
    </form>
  )
}

export default RegisterForm
