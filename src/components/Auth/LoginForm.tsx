'use client'

  import { useState, useRef, useEffect } from 'react'

interface LoginFormProps {
  onLogin: (email: string, password: string, rememberMe: boolean) => void
  isLoading: boolean
}

const LoginForm = ({ onLogin, isLoading }: LoginFormProps) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailTouched, setEmailTouched] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  // Автоматически восстанавливаем настройку rememberMe при загрузке формы
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedRememberMe = localStorage.getItem('rememberMe') === 'true'
      const lastLoginTime = localStorage.getItem('lastLoginTime')

      // Проверяем, не истек ли срок (90 дней)
      if (savedRememberMe && lastLoginTime) {
        const daysSinceLogin = (Date.now() - parseInt(lastLoginTime)) / (1000 * 60 * 60 * 24)
        if (daysSinceLogin <= 90) {
          setRememberMe(true)
        } else {
          // Очищаем устаревшие настройки
          localStorage.removeItem('rememberMe')
          localStorage.removeItem('lastLoginTime')
        }
      }
    }
  }, [])

  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  const validateEmail = (emailValue: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(emailValue)
  }

  const validatePassword = (passwordValue: string): boolean => {
    return passwordValue.length >= 6
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
  }

  const handleEmailBlur = () => {
    setEmailTouched(true)
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
  }

  const handlePasswordBlur = () => {
    setPasswordTouched(true)
  }

  // Фокус на email при монтировании компонента
  useEffect(() => {
    if (emailRef.current) {
      emailRef.current.focus()
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onLogin(email, password, rememberMe)
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
            value={email}
            onChange={handleEmailChange}
            onBlur={handleEmailBlur}
            className={`appearance-none block w-full px-3 py-2 border-4 rounded-md bg-background text-foreground transition-all duration-200 focus:outline-none placeholder:text-muted-foreground ${
              emailTouched && email !== '' && !validateEmail(email)
                ? '!border-red-600'
                : emailTouched && email !== '' && validateEmail(email)
                ? '!border-green-600'
                : '!border-gray-300'
            }`}
            placeholder="Введите ваш email"
          />
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
            autoComplete="current-password"
            value={password}
            onChange={handlePasswordChange}
            onBlur={handlePasswordBlur}
            className={`appearance-none block w-full px-3 py-2 border-4 rounded-md bg-background text-foreground transition-all duration-200 focus:outline-none placeholder:text-muted-foreground ${
              passwordTouched && password !== '' && !validatePassword(password)
                ? '!border-red-600'
                : passwordTouched && password !== '' && validatePassword(password)
                ? '!border-green-600'
                : '!border-gray-300'
            }`}
            placeholder="Введите пароль"
          />
        </div>
      </div>

      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            id="remember-me"
            name="remember-me"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
          />
        </div>
        <div className="ml-3">
          <label htmlFor="remember-me" className="text-sm text-foreground font-medium cursor-pointer">
            Запомнить меня
          </label>
          <p className="text-xs text-muted-foreground mt-1">
            Автоматический вход в приложение на 90 дней без запроса логина и пароля
          </p>
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={isLoading || !email || !password || (emailTouched && email !== '' && !validateEmail(email)) || (passwordTouched && password !== '' && !validatePassword(password))}
          className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Вход...
            </div>
          ) : (
            'Войти'
          )}
        </button>
      </div>
    </form>
  )
}

export default LoginForm
