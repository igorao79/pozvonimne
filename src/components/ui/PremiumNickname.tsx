import React from 'react'
import useThemeStore from '@/store/useThemeStore'
import {
  Crown, Star, Diamond, Flame, Zap, Heart, Rocket, Trophy, Sparkles, Shield
} from 'lucide-react'
import {
  getPremiumNicknameStyle,
  getPremiumIconColor,
  PremiumUser
} from '@/utils/premiumDisplay'

interface PremiumNicknameProps {
  displayName?: string
  username?: string
  premiumData?: PremiumUser | null
  showIcon?: boolean
  showGlow?: boolean
  className?: string
}

const PremiumNickname: React.FC<PremiumNicknameProps> = ({
  displayName,
  username,
  premiumData,
  showIcon = true,
  showGlow = false,
  className = ''
}) => {
  const { theme } = useThemeStore()
  const isDarkTheme = theme === 'dark'

  const name = displayName || username || 'Неизвестный'
  const isPremium = premiumData?.isPremium ?? false

  const shouldShowIcon = isPremium && showIcon && premiumData?.premiumIcon && premiumData.premiumIcon !== ''

  const baseStyle = isPremium && premiumData ? getPremiumNicknameStyle(premiumData, isDarkTheme) : {}
  const combinedStyle = { ...baseStyle }

  // Получить компонент иконки
  const getIconComponent = (iconId: string) => {
    const iconMap: Record<string, { component: any, color: string }> = {
      crown: { component: Crown, color: 'text-yellow-500' },
      star: { component: Star, color: 'text-yellow-400' },
      diamond: { component: Diamond, color: 'text-blue-400' },
      fire: { component: Flame, color: 'text-red-500' },
      lightning: { component: Zap, color: 'text-yellow-300' },
      heart: { component: Heart, color: 'text-red-500' },
      rocket: { component: Rocket, color: 'text-gray-600' },
      trophy: { component: Trophy, color: 'text-yellow-600' },
      magic: { component: Sparkles, color: 'text-purple-500' },
      shield: { component: Shield, color: 'text-blue-500' },
    }

    return iconMap[iconId] || null
  }

  return (
    <span
      key={`${name}-${isPremium}-${premiumData?.premiumColor}-${premiumData?.premiumIcon}`}
      className={`inline-flex items-center gap-1 ${className}`}
      style={combinedStyle}
    >
      {isPremium && showIcon && premiumData?.premiumIcon && premiumData.premiumIcon !== '' && (
        <span
          className="leading-none"
          title="Премиум пользователь"
        >
          {(() => {
            const iconData = getIconComponent(premiumData.premiumIcon!)
            if (iconData) {
              const IconComponent = iconData.component
              // Используем цвет иконки в зависимости от настройки premiumIconColorMatch
              const iconColorClass = premiumData.premiumIconColorMatch
                ? getPremiumIconColor(premiumData, isDarkTheme)
                : iconData.color
              return <IconComponent className={`w-4 h-4 ${iconColorClass}`} />
            }
            return null
          })()}
        </span>
      )}
      <span>{name}</span>
    </span>
  )
}

export default PremiumNickname
