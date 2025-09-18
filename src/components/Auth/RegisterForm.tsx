'use client'

import { useState, useEffect, useRef } from 'react'
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
  const [emailError, setEmailError] = useState(false)
  const [emailValid, setEmailValid] = useState(false)
  const [passwordError, setPasswordError] = useState(false)
  const [passwordValid, setPasswordValid] = useState(false)
  const [confirmPasswordError, setConfirmPasswordError] = useState(false)
  const [confirmPasswordValid, setConfirmPasswordValid] = useState(false)
  const [displayNameError, setDisplayNameError] = useState(false)
  const [displayNameValid, setDisplayNameValid] = useState(false)
  const [displayNameAvailable, setDisplayNameAvailable] = useState<boolean | null>(null)
  const [checkingDisplayName, setCheckingDisplayName] = useState(false)

  const emailRef = useRef<HTMLInputElement>(null)
  const displayNameRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const confirmPasswordRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()

  const validateEmail = (emailValue: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(emailValue)
  }

  const validatePassword = (pass: string): boolean => {
    return pass.length >= 6
  }

  const validateConfirmPassword = (confirmPass: string, originalPass: string): boolean => {
    return confirmPass === originalPass && originalPass.length >= 6
  }

  const validateDisplayName = (name: string): boolean => {
    return name.length >= 3
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEmail(value)
    // Сбрасываем состояния валидации при вводе, покажем их только после blur
    setEmailError(false)
    setEmailValid(false)
  }

  const handleEmailBlur = () => {
    if (email) {
      const isValid = validateEmail(email)
      setEmailError(!isValid)
      setEmailValid(isValid)
    } else {
      setEmailError(false)
      setEmailValid(false)
    }
  }

  const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setDisplayName(value)
    // Сбрасываем состояния валидации при вводе, покажем их только после blur
    setDisplayNameError(false)
    setDisplayNameValid(false)
  }

  const handleDisplayNameBlur = () => {
    if (displayName) {
      const isValid = validateDisplayName(displayName)
      setDisplayNameError(!isValid)
      setDisplayNameValid(isValid)
    } else {
      setDisplayNameError(false)
      setDisplayNameValid(false)
    }
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setPassword(value)
    // Сбрасываем состояния валидации при вводе, покажем их только после blur
    setPasswordError(false)
    setPasswordValid(false)

    // Также сбрасываем валидность подтверждения пароля если оно было введено
    if (confirmPassword) {
      setConfirmPasswordError(false)
      setConfirmPasswordValid(false)
    }
  }

  const handlePasswordBlur = () => {
    if (password) {
      const isValid = validatePassword(password)
      setPasswordError(!isValid)
      setPasswordValid(isValid)
      // Также проверим подтверждение пароля
      if (confirmPassword) {
        const confirmIsValid = validateConfirmPassword(confirmPassword, password)
        setConfirmPasswordError(!confirmIsValid)
        setConfirmPasswordValid(confirmIsValid)
      }
    } else {
      setPasswordError(false)
      setPasswordValid(false)
    }
  }

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setConfirmPassword(value)
    // Сбрасываем состояния валидации при вводе, покажем их только после blur
    setConfirmPasswordError(false)
    setConfirmPasswordValid(false)
  }

  const handleConfirmPasswordBlur = () => {
    if (confirmPassword) {
      const isValid = validateConfirmPassword(confirmPassword, password)
      setConfirmPasswordError(!isValid)
      setConfirmPasswordValid(isValid)
    } else {
      setConfirmPasswordError(false)
      setConfirmPasswordValid(false)
    }
  }

  // Фокус на email при монтировании компонента
  useEffect(() => {
    if (emailRef.current) {
      emailRef.current.focus()
    }
  }, [])

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

    // Финальная проверка всех полей перед отправкой
    const emailValid = validateEmail(email)
    const passwordValid = validatePassword(password)
    const confirmPasswordValid = validateConfirmPassword(confirmPassword, password)
    const displayNameValid = validateDisplayName(displayName)

    setEmailError(!emailValid)
    setPasswordError(!passwordValid)
    setConfirmPasswordError(!confirmPasswordValid)
    setDisplayNameError(!displayNameValid)

    // Проверяем доступность display_name
    if (displayNameValid && displayNameAvailable === false) {
      return
    }

    if (displayNameValid && displayNameAvailable === null) {
      return
    }

    // Если все проверки пройдены
    if (emailValid && passwordValid && confirmPasswordValid && displayNameValid && displayNameAvailable === true) {
      onRegister(email, password, displayName)
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-foreground">
          Email адрес
        </label>
        <div className="mt-1">
          <input
            ref={emailRef}
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={handleEmailChange}
            onBlur={handleEmailBlur}
            className={`appearance-none block w-full px-3 py-2 border-4 rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none sm:text-sm transition-all duration-200 ${
              emailError ? '!border-red-600' :
              emailValid ? '!border-green-600' : '!border-gray-300'
            }`}
            placeholder="Введите ваш email"
          />
        </div>
      </div>

      <div>
        <label htmlFor="displayName" className="block text-sm font-medium text-foreground">
          Отображаемое имя
        </label>
        <div className="mt-1 relative">
          <input
            ref={displayNameRef}
            id="displayName"
            name="displayName"
            type="text"
            autoComplete="name"
            required
            value={displayName}
            onChange={handleDisplayNameChange}
            onBlur={handleDisplayNameBlur}
            className={`appearance-none block w-full px-3 py-2 pr-20 border-4 rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none sm:text-sm transition-all duration-200 ${
              displayNameError || (displayName.length >= 3 && displayNameAvailable === false) ? '!border-red-600' :
              displayNameValid && displayNameAvailable === true ? '!border-green-600' : '!border-gray-300'
            }`}
            placeholder="Как вас будут видеть другие пользователи"
          />
          {displayName && displayName.length >= 3 && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs flex items-center">
              {checkingDisplayName ? (
                <div className="flex items-center text-muted-foreground">
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-current mr-1"></div>
                  Проверка...
                </div>
              ) : displayNameAvailable === true ? (
                <div className="flex items-center text-green-600 dark:text-green-400">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Свободно
                </div>
              ) : displayNameAvailable === false ? (
                <div className="flex items-center text-destructive">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Занято
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-foreground">
          Пароль
        </label>
        <div className="mt-1">
          <input
            ref={passwordRef}
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={handlePasswordChange}
            onBlur={handlePasswordBlur}
            className={`appearance-none block w-full px-3 py-2 border-4 rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none sm:text-sm transition-all duration-200 ${
              passwordError ? '!border-red-600' :
              passwordValid ? '!border-green-600' : '!border-gray-300'
            }`}
            placeholder="Минимум 6 символов"
          />
        </div>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">
          Подтверждение пароля
        </label>
        <div className="mt-1">
          <input
            ref={confirmPasswordRef}
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={handleConfirmPasswordChange}
            onBlur={handleConfirmPasswordBlur}
            className={`appearance-none block w-full px-3 py-2 border-4 rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none sm:text-sm transition-all duration-200 ${
              confirmPasswordError ? '!border-red-600' :
              confirmPasswordValid ? '!border-green-600' : '!border-gray-300'
            }`}
            placeholder="Повторите пароль"
          />
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={isLoading || !email || !displayName || !password || !confirmPassword || emailError || passwordError || confirmPasswordError || displayNameError || displayNameAvailable === false || (displayName.length >= 3 && displayNameAvailable === null)}
          className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
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
