/**
 * Русские переводы для ошибок авторизации Supabase
 * 
 * На основе официальной документации Supabase Auth API:
 * https://supabase.com/docs/reference/javascript/auth-api
 */

export interface AuthError {
  message: string
  status?: number
  name?: string
}

// Переводы основных ошибок авторизации
export const authErrorTranslations: Record<string, string> = {
  // === САМЫЕ ЧАСТЫЕ ОШИБКИ (точные совпадения) ===
  'Invalid login credentials': 'Неверный email или пароль. Проверьте правильность введенных данных',
  'invalid login credentials': 'Неверный email или пароль. Проверьте правильность введенных данных',
  'Invalid email or password': 'Неверный email или пароль. Проверьте правильность введенных данных',
  'Email or password is incorrect': 'Неверный email или пароль. Проверьте правильность введенных данных',
  'Authentication failed': 'Неверный email или пароль. Проверьте правильность введенных данных',
  'Login failed': 'Неверный email или пароль. Проверьте правильность введенных данных',
  
  // === ОБЩИЕ ОШИБКИ ===
  'Email not confirmed': 'Email не подтвержден. Проверьте почту и перейдите по ссылке подтверждения',
  'User not found': 'Пользователь с таким email не найден. Возможно, нужно зарегистрироваться?',
  'Invalid email': 'Неверный формат email адреса',
  'Invalid password': 'Неверный пароль. Попробуйте еще раз или восстановите пароль',
  'User already registered': 'Этот email уже зарегистрирован. Попробуйте войти в аккаунт',
  'Email already registered': 'Этот email уже зарегистрирован. Попробуйте войти в аккаунт',
  'Phone already registered': 'Этот номер телефона уже зарегистрирован',
  'Signup disabled': 'Регистрация временно отключена',
  'Invalid phone number': 'Неверный формат номера телефона',
  'Phone not confirmed': 'Номер телефона не подтвержден',
  
  // === ОШИБКИ ПАРОЛЕЙ ===
  'Password is too short': 'Пароль слишком короткий',
  'Password should be at least 6 characters': 'Пароль должен содержать не менее 6 символов',
  'Password should contain at least one uppercase letter': 'Пароль должен содержать хотя бы одну заглавную букву',
  'Password should contain at least one lowercase letter': 'Пароль должен содержать хотя бы одну строчную букву',
  'Password should contain at least one number': 'Пароль должен содержать хотя бы одну цифру',
  'Password should contain at least one special character': 'Пароль должен содержать хотя бы один специальный символ',
  'New password should be different from the old password': 'Новый пароль должен отличаться от старого',
  
  // === ОШИБКИ OTP (Одноразовые коды) ===
  'Invalid OTP': 'Неверный одноразовый код',
  'Invalid OTP token': 'Неверный одноразовый код',
  'Token expired': 'Код истек',
  'Token has expired': 'Код истек',
  'Invalid token': 'Неверный код',
  'OTP expired': 'Одноразовый код истек',
  'Invalid mobile OTP': 'Неверный код для мобильного телефона',
  'Invalid email OTP': 'Неверный код для email',
  'Too many requests': 'Слишком много запросов',
  'Rate limit exceeded': 'Превышен лимит запросов',
  
  // === ОШИБКИ СЕССИЙ ===
  'Invalid session': 'Недействительная сессия',
  'Session expired': 'Сессия истекла',
  'Session not found': 'Сессия не найдена',
  'Invalid refresh token': 'Недействительный токен обновления',
  'Refresh token expired': 'Токен обновления истек',
  'Invalid access token': 'Недействительный токен доступа',
  'Access token expired': 'Токен доступа истек',
  'Token revoked': 'Токен отозван',
  'Invalid JWT': 'Недействительный JWT токен',
  'JWT expired': 'JWT токен истек',
  
  // === ОШИБКИ ПОДТВЕРЖДЕНИЯ ===
  'Confirmation token expired': 'Токен подтверждения истек',
  'Invalid confirmation token': 'Неверный токен подтверждения',
  'Email confirmation required': 'Требуется подтверждение email',
  'Phone confirmation required': 'Требуется подтверждение телефона',
  'Account not verified': 'Аккаунт не подтвержден',
  'Verification link expired': 'Ссылка для подтверждения истекла',
  'Invalid verification link': 'Неверная ссылка для подтверждения',
  
  // === ОШИБКИ ПРОВАЙДЕРОВ (OAuth) ===
  'Provider not supported': 'Провайдер не поддерживается',
  'OAuth error': 'Ошибка OAuth авторизации',
  'Invalid provider': 'Неверный провайдер',
  'Provider email not verified': 'Email провайдера не подтвержден',
  'OAuth state mismatch': 'Несоответствие состояния OAuth',
  'OAuth code exchange failed': 'Ошибка обмена OAuth кода',
  'Provider account already linked': 'Аккаунт провайдера уже привязан',
  'Provider account not found': 'Аккаунт провайдера не найден',
  
  // === ОШИБКИ ПРИГЛАШЕНИЙ ===
  'Invitation expired': 'Приглашение истекло',
  'Invalid invitation': 'Неверное приглашение',
  'Invitation already used': 'Приглашение уже использовано',
  'User already invited': 'Пользователь уже приглашен',
  'Invitation not found': 'Приглашение не найдено',
  
  // === ОШИБКИ СБРОСА ПАРОЛЯ ===
  'Password recovery not available': 'Восстановление пароля недоступно',
  'Invalid recovery token': 'Неверный токен восстановления',
  'Recovery token expired': 'Токен восстановления истек',
  'Recovery link expired': 'Ссылка для восстановления истекла',
  'Invalid recovery link': 'Неверная ссылка для восстановления',
  
  // === АДМИНИСТРАТИВНЫЕ ОШИБКИ ===
  'Unauthorized': 'Нет авторизации',
  'Forbidden': 'Доступ запрещен',
  'Access denied': 'Доступ запрещен',
  'Insufficient permissions': 'Недостаточно прав',
  'Admin access required': 'Требуются права администратора',
  'Service role required': 'Требуется роль сервиса',
  
  // === ОШИБКИ КАПЧИ ===
  'Captcha required': 'Требуется проверка CAPTCHA',
  'Invalid captcha': 'Неверная CAPTCHA',
  'Captcha verification failed': 'Проверка CAPTCHA не пройдена',
  'Captcha expired': 'CAPTCHA истекла',
  
  // === ОШИБКИ АККАУНТА ===
  'Account locked': 'Аккаунт заблокирован',
  'Account suspended': 'Аккаунт приостановлен',
  'Account disabled': 'Аккаунт отключен',
  'Account deleted': 'Аккаунт удален',
  'Account not active': 'Аккаунт неактивен',
  'User banned': 'Пользователь заблокирован',
  
  // === ОШИБКИ СМЕНЫ EMAIL/ТЕЛЕФОНА ===
  'Email change required': 'Требуется смена email',
  'Phone change required': 'Требуется смена телефона',
  'Invalid email change token': 'Неверный токен смены email',
  'Invalid phone change token': 'Неверный токен смены телефона',
  'Email change token expired': 'Токен смены email истек',
  'Phone change token expired': 'Токен смены телефона истек',
  'Same email': 'Новый email совпадает с текущим',
  'Same phone': 'Новый телефон совпадает с текущим',
  
  // === ТЕХНИЧЕСКИЕ ОШИБКИ ===
  'Database error': 'Ошибка базы данных',
  'Internal server error': 'Внутренняя ошибка сервера',
  'Service unavailable': 'Сервис недоступен',
  'Network error': 'Ошибка сети',
  'Connection timeout': 'Таймаут соединения',
  'Request timeout': 'Таймаут запроса',
  'Invalid request': 'Неверный запрос',
  'Bad request': 'Неверный запрос',
  'Server error': 'Ошибка сервера',
  'Gateway timeout': 'Таймаут шлюза',
  
  // === ОШИБКИ ВАЛИДАЦИИ ===
  'Invalid input': 'Неверный ввод',
  'Required field missing': 'Обязательное поле не заполнено',
  'Invalid format': 'Неверный формат',
  'Value too long': 'Значение слишком длинное',
  'Value too short': 'Значение слишком короткое',
  'Invalid characters': 'Недопустимые символы',
  'Field required': 'Поле обязательно для заполнения',
  
  // === FALLBACK СООБЩЕНИЯ ===
  'Registration failed': 'Ошибка регистрации',
  'An error occurred': 'Произошла ошибка',
  'Something went wrong': 'Что-то пошло не так',
  'Unknown error': 'Неизвестная ошибка',
  'Request failed': 'Запрос не выполнен'
}

// Переводы по HTTP статус кодам
export const statusCodeTranslations: Record<number, string> = {
  400: 'Неверный запрос',
  401: 'Нет авторизации',
  403: 'Доступ запрещен',
  404: 'Не найдено',
  409: 'Конфликт данных',
  422: 'Ошибка валидации',
  429: 'Слишком много запросов',
  500: 'Внутренняя ошибка сервера',
  502: 'Ошибка шлюза',
  503: 'Сервис недоступен',
  504: 'Таймаут шлюза'
}

/**
 * Переводит ошибку авторизации Supabase на русский язык
 * @param error - Объект ошибки от Supabase
 * @returns Переведенное сообщение об ошибке
 */
export function translateAuthError(error: AuthError | string | null | undefined): string {
  if (!error) {
    return 'Произошла неизвестная ошибка'
  }

  let message: string
  let status: number | undefined

  if (typeof error === 'string') {
    message = error
  } else {
    message = error.message || 'Произошла неизвестная ошибка'
    status = error.status
  }

  // Проверяем точное совпадение сообщения
  if (authErrorTranslations[message]) {
    return authErrorTranslations[message]
  }

  // Проверяем частичные совпадения (case-insensitive)
  const lowerMessage = message.toLowerCase()
  for (const [key, translation] of Object.entries(authErrorTranslations)) {
    if (lowerMessage.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerMessage)) {
      return translation
    }
  }

  // Специальная обработка для наиболее частых ошибок
  if (lowerMessage.includes('invalid') && lowerMessage.includes('credentials')) {
    return 'Неверный email или пароль. Проверьте правильность введенных данных'
  }
  
  if (lowerMessage.includes('invalid') && lowerMessage.includes('login')) {
    return 'Неверный email или пароль. Убедитесь, что данные введены правильно'
  }

  if (lowerMessage.includes('wrong') && (lowerMessage.includes('password') || lowerMessage.includes('credentials'))) {
    return 'Неверный пароль. Попробуйте еще раз или восстановите пароль'
  }

  // Проверяем перевод по статус коду с более понятными сообщениями
  if (status === 400 && lowerMessage.includes('credentials')) {
    return 'Неверный email или пароль. Проверьте правильность введенных данных'
  }
  
  if (status && statusCodeTranslations[status]) {
    return statusCodeTranslations[status]
  }

  // Улучшенные сообщения для поиска ключевых слов
  if (lowerMessage.includes('password') && lowerMessage.includes('weak')) {
    return 'Пароль слишком простой. Используйте более сложный пароль'
  }
  if (lowerMessage.includes('password')) {
    return 'Проблема с паролем. Проверьте правильность ввода'
  }
  if (lowerMessage.includes('email') && lowerMessage.includes('invalid')) {
    return 'Неверный формат email адреса'
  }
  if (lowerMessage.includes('email')) {
    return 'Проблема с email адресом'
  }
  if (lowerMessage.includes('phone')) {
    return 'Проблема с номером телефона'
  }
  if (lowerMessage.includes('token') || lowerMessage.includes('otp')) {
    return 'Неверный или истекший код подтверждения'
  }
  if (lowerMessage.includes('session')) {
    return 'Сессия истекла. Войдите в аккаунт заново'
  }
  if (lowerMessage.includes('network') || lowerMessage.includes('timeout')) {
    return 'Проблема с подключением к серверу. Попробуйте еще раз'
  }
  if (lowerMessage.includes('rate') && lowerMessage.includes('limit')) {
    return 'Слишком много попыток. Подождите немного и попробуйте снова'
  }

  // Fallback - возвращаем оригинальное сообщение, если перевод не найден
  return message || 'Произошла неизвестная ошибка'
}

/**
 * Helper функция для показа пользователю понятного сообщения об ошибке
 * @param error - Ошибка от Supabase
 * @param showStatusCode - Показывать ли код статуса (по умолчанию false)
 * @returns Переведенное и отформатированное сообщение
 */
export function getDisplayErrorMessage(
  error: AuthError | string | null | undefined, 
  showStatusCode: boolean = false
): string {
  const translatedMessage = translateAuthError(error)
  
  // Добавляем код статуса только если явно запрошено
  if (showStatusCode && typeof error === 'object' && error?.status) {
    return `${translatedMessage} (код: ${error.status})`
  }
  
  return translatedMessage
}

/**
 * Проверяет, является ли ошибка критической (требует перезагрузки/выхода)
 * @param error - Ошибка от Supabase
 * @returns true если ошибка критическая
 */
export function isCriticalAuthError(error: AuthError | string | null | undefined): boolean {
  if (!error) return false
  
  const message = typeof error === 'string' ? error : error.message || ''
  const lowerMessage = message.toLowerCase()
  
  const criticalKeywords = [
    'account locked',
    'account suspended', 
    'account disabled',
    'account deleted',
    'user banned',
    'access denied',
    'forbidden',
    'unauthorized'
  ]
  
  return criticalKeywords.some(keyword => lowerMessage.includes(keyword))
}

/**
 * Определяет, нужно ли показывать кнопку "Попробовать снова"
 * @param error - Ошибка от Supabase  
 * @returns true если можно повторить попытку
 */
export function isRetryableError(error: AuthError | string | null | undefined): boolean {
  if (!error) return true
  
  const message = typeof error === 'string' ? error : error.message || ''
  const status = typeof error === 'object' ? error.status : undefined
  
  // Ошибки сети - можно повторить
  if (status && [500, 502, 503, 504].includes(status)) {
    return true
  }
  
  const lowerMessage = message.toLowerCase()
  
  // Временные ошибки - можно повторить
  const retryableKeywords = [
    'network error',
    'timeout',
    'service unavailable',
    'server error',
    'connection',
    'too many requests'
  ]
  
  // Постоянные ошибки - нельзя повторить
  const nonRetryableKeywords = [
    'invalid credentials',
    'user not found',
    'account locked',
    'account suspended',
    'invalid email',
    'invalid password',
    'already registered'
  ]
  
  if (nonRetryableKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return false
  }
  
  if (retryableKeywords.some(keyword => lowerMessage.includes(keyword))) {
    return true
  }
  
  // По умолчанию можно попробовать снова
  return true
}
