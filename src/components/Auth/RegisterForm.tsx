'use client'

import { useState } from 'react'

interface RegisterFormProps {
  onRegister: (email: string, password: string) => void
  isLoading: boolean
}

const RegisterForm = ({ onRegister, isLoading }: RegisterFormProps) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const validatePassword = (pass: string) => {
    if (pass.length < 6) {
      return 'Пароль должен содержать минимум 6 символов'
    }
    return ''
  }

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
    
    setPasswordError('')
    onRegister(email, password)
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
          disabled={isLoading || !email || !password || !confirmPassword}
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
