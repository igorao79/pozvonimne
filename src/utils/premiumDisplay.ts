// Утилиты для отображения премиум пользователей

export interface PremiumUser {
  isPremium: boolean
  premiumColor?: string
  premiumIcon?: string
  premiumIconColorMatch?: boolean
}

// Получить цвет для иконки премиум пользователя
export const getPremiumIconColor = (user: PremiumUser, isDarkTheme: boolean = false): string => {
  if (!user.isPremium || !user.premiumIcon) {
    return 'text-yellow-500' // Цвет по умолчанию
  }

  // Если включена настройка "иконка под цвет ника", используем цвет ника
  if (user.premiumIconColorMatch) {
    const nicknameStyle = getPremiumNicknameStyle(user, isDarkTheme)
    return nicknameStyle.color as string
  }

  // Иначе используем цвет по умолчанию для иконки
  return 'text-yellow-500'
}

// Получить стиль для ника премиум пользователя с авто-контрастом в зависимости от темы
export const getPremiumNicknameStyle = (user: PremiumUser, isDarkTheme: boolean = false): React.CSSProperties => {
  if (!user.isPremium) {
    return {}
  }

  const baseColor = user.premiumColor || '#FFFFFF'

  // Определяем яркость цвета
  const brightness = getBrightness(baseColor)

  // Применяем авто-контраст в зависимости от темы
  let displayColor = baseColor

  // Для светлой темы: если цвет слишком светлый (> 220), применяем темный цвет
  if (!isDarkTheme && brightness > 220) {
    displayColor = '#000000'
  }
  // Для темной темы: если цвет слишком темный (< 35), применяем светлый цвет
  else if (isDarkTheme && brightness < 35) {
    displayColor = '#FFFFFF'
  }

  return {
    color: displayColor,
    fontWeight: '600',
  }
}

// Функция определения яркости цвета (0-255)
const getBrightness = (hexColor: string): number => {
  const hex = hexColor.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000
}

// Функция определения контрастного цвета
const getContrastColor = (hexColor: string): string => {
  const brightness = getBrightness(hexColor)
  // Если цвет слишком светлый (< 128), возвращаем темный цвет
  // Если цвет слишком темный (> 128), возвращаем светлый цвет
  return brightness < 128 ? '#FFFFFF' : '#000000'
}

// Экспортируем функции для использования в других компонентах
export { getBrightness as _getBrightness, getContrastColor as _getContrastColor }

// Получить React компонент иконки по ID
export const getPremiumIconComponent = (iconId?: string): { component: any, color: string } | null => {
  if (!iconId) return null

  const iconMap: Record<string, { component: any, color: string }> = {
    crown: { component: null, color: 'text-yellow-500' }, // Будет импортироваться динамически
    star: { component: null, color: 'text-yellow-400' },
    diamond: { component: null, color: 'text-blue-400' },
    fire: { component: null, color: 'text-red-500' },
    lightning: { component: null, color: 'text-yellow-300' },
    heart: { component: null, color: 'text-red-500' },
    rocket: { component: null, color: 'text-gray-600' },
    trophy: { component: null, color: 'text-yellow-600' },
    magic: { component: null, color: 'text-purple-500' },
    shield: { component: null, color: 'text-blue-500' },
  }

  return iconMap[iconId] || null
}

// Получить эмодзи иконку по ID (для обратной совместимости)
export const getPremiumIconEmoji = (iconId?: string): string => {
  const emojiMap: Record<string, string> = {
    crown: '👑',
    star: '⭐',
    diamond: '💎',
    fire: '🔥',
    lightning: '⚡',
    heart: '❤️',
    rocket: '🚀',
    trophy: '🏆',
    magic: '✨',
    shield: '🛡️',
  }

  return emojiMap[iconId || 'crown'] || '👑'
}

// Проверить, является ли цвет светлым (для автоматической адаптации контраста)
export const isLightColor = (color: string): boolean => {
  // Конвертируем hex в RGB
  const hex = color.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  
  // Используем формулу яркости
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  return brightness > 155
}

// Получить CSS класс для премиум значка
export const getPremiumBadgeClass = (theme: 'light' | 'dark' = 'light'): string => {
  return `inline-flex items-center justify-center w-5 h-5 rounded-full 
          ${theme === 'dark' ? 'bg-yellow-900/30' : 'bg-yellow-100'} 
          border border-yellow-300 dark:border-yellow-700`
}

// Форматировать отображение имени пользователя с премиум статусом
export const formatPremiumDisplayName = (
  displayName: string,
  username: string,
  premiumData: PremiumUser
): string => {
  const name = displayName || username || 'Неизвестный'
  
  if (premiumData.isPremium && premiumData.premiumIcon) {
    const icon = getPremiumIconEmoji(premiumData.premiumIcon)
    return `${icon} ${name}`
  }
  
  return name
}

// Валидация hex цвета
export const isValidHexColor = (color: string): boolean => {
  const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
  return hexPattern.test(color)
}

// Удалена - используется новая функция _getContrastColor

// Применить эффект свечения для премиум ников
export const getPremiumGlowStyle = (color: string): React.CSSProperties => {
  if (!isValidHexColor(color)) {
    return {}
  }

  return {
    textShadow: `0 0 8px ${color}40, 0 0 16px ${color}20`,
  }
}

export default {
  getPremiumNicknameStyle,
  getPremiumIconEmoji,
  isLightColor,
  getPremiumBadgeClass,
  formatPremiumDisplayName,
  isValidHexColor,
  getPremiumGlowStyle,
}
