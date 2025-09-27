'use client'

import React, { useState, useEffect } from 'react'
import {
  X, Palette, Award, Save, Check, RotateCcw,
  Crown, Star, Diamond, Flame, Zap, Heart, Rocket, Trophy, Sparkles, Shield
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { usePremiumData } from '@/hooks/usePremiumData'
import { _getBrightness, _getContrastColor } from '@/utils/premiumDisplay'
import useThemeStore from '@/store/useThemeStore'
import useCallStore from '@/store/useCallStore'

interface PremiumSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
}

// Доступные иконки для премиум пользователей
const PREMIUM_ICONS = [
  { id: '', name: 'Без иконки', icon: null, color: 'text-gray-400' },
  { id: 'crown', name: 'Корона', icon: Crown, color: 'text-yellow-500' },
  { id: 'star', name: 'Звезда', icon: Star, color: 'text-yellow-400' },
  { id: 'diamond', name: 'Алмаз', icon: Diamond, color: 'text-blue-400' },
  { id: 'fire', name: 'Огонь', icon: Flame, color: 'text-red-500' },
  { id: 'lightning', name: 'Молния', icon: Zap, color: 'text-yellow-300' },
  { id: 'heart', name: 'Сердце', icon: Heart, color: 'text-red-500' },
  { id: 'rocket', name: 'Ракета', icon: Rocket, color: 'text-gray-600' },
  { id: 'trophy', name: 'Трофей', icon: Trophy, color: 'text-yellow-600' },
  { id: 'magic', name: 'Магия', icon: Sparkles, color: 'text-purple-500' },
  { id: 'shield', name: 'Щит', icon: Shield, color: 'text-blue-500' },
]

const PremiumSettingsModal: React.FC<PremiumSettingsModalProps> = ({
  isOpen,
  onClose,
  userId
}) => {
  const { theme } = useThemeStore()
  const { user, userId: currentUserId } = useCallStore()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [currentColor, setCurrentColor] = useState('#FFFFFF')
  const [currentIcon, setCurrentIcon] = useState('')
  const [customColor, setCustomColor] = useState('#FFFFFF')
  const [iconColorMatch, setIconColorMatch] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [userProfile, setUserProfile] = useState<{
    avatar_url?: string
    display_name?: string
    username?: string
  } | null>(null)

  const { theme: currentTheme } = useThemeStore()
  const isDarkTheme = currentTheme === 'dark'

  const supabase = createClient()
  // Получаем доступ к функции обновления данных
  const { refreshPremiumData } = usePremiumData([userId])

  // Данные текущего пользователя для предпросмотра
  const userAvatar = userProfile?.avatar_url
  const userDisplayName = userProfile?.display_name || userProfile?.username || user?.email?.split('@')[0] || 'Ваш никнейм'

  // Сбрасываем состояние при закрытии
  useEffect(() => {
    if (!isOpen) {
      setDataLoaded(false)
      setSuccess('')
      setError('')
    }
  }, [isOpen])

  // Загружаем текущие настройки пользователя только при открытии модала
  useEffect(() => {
    if (!isOpen || !userId) return

    const loadPremiumSettings = async () => {
      setLoading(true)
      setError('')
      try {
        // Загружаем и премиум настройки, и профиль пользователя
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('avatar_url, display_name, username, premium_color, premium_icon, premium_icon_color_match')
          .eq('id', userId)
          .single()

        if (profileError) throw profileError

        if (profileData) {
          // Сохраняем данные профиля для предпросмотра
          setUserProfile({
            avatar_url: profileData.avatar_url,
            display_name: profileData.display_name,
            username: profileData.username
          })

          // Сохраняем премиум настройки
          setCurrentColor(profileData.premium_color || '#FFFFFF')
          setCurrentIcon(profileData.premium_icon || '')
          setCustomColor(profileData.premium_color || '#FFFFFF')
          setIconColorMatch(profileData.premium_icon_color_match || false)
        }
        setDataLoaded(true)
      } catch (error) {
        console.error('Ошибка загрузки данных:', error)
        setError('Не удалось загрузить настройки')
        setDataLoaded(true) // Показываем интерфейс даже при ошибке
      } finally {
        setLoading(false)
      }
    }

    loadPremiumSettings()
  }, [userId, isOpen]) // Убрали supabase из зависимостей чтобы избежать лишних вызовов

  const handleSaveSettings = async () => {
    if (!userId) return

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          premium_color: currentColor,
          premium_icon: currentIcon,
          premium_icon_color_match: iconColorMatch,
        })
        .eq('id', userId)

      if (error) throw error

      // Обновляем данные в хуках
      await refreshPremiumData()

      setSuccess('Настройки успешно сохранены!')
      setTimeout(() => {
        setSuccess('')
        onClose()
      }, 2000)
    } catch (error) {
      console.error('Ошибка сохранения настроек:', error)
      setError('Не удалось сохранить настройки')
    } finally {
      setSaving(false)
    }
  }

  const resetToDefault = async () => {
    const defaultColor = '#FFFFFF'
    const defaultIcon = ''

    setCurrentColor(defaultColor)
    setCurrentIcon(defaultIcon)
    setCustomColor(defaultColor)

    // Сохраняем изменения в базу сразу
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          premium_color: defaultColor,
          premium_icon: defaultIcon,
        })
        .eq('id', userId)

      if (error) throw error

      // Обновляем данные в хуках
      await refreshPremiumData()

      setSuccess('Сброшено к настройкам по умолчанию!')
      setTimeout(() => {
        setSuccess('')
        onClose()
      }, 2000)
    } catch (error) {
      console.error('Ошибка сброса настроек:', error)
      setError('Не удалось сбросить настройки')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen || !dataLoaded) return null

  // Обработчик клика по фону
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <div       className={`
        relative w-full max-w-lg mx-auto rounded-lg shadow-xl max-h-[90vh] overflow-y-auto
        ${currentTheme === 'dark'
          ? 'bg-gray-800 border border-gray-700'
          : 'bg-white border border-gray-200'
        }
        transform transition-all duration-200 ease-out
        animate-in zoom-in-95 fade-in-0
      `}>
        {/* Заголовок */}
        <div className={`
          flex items-center justify-between p-6 pb-4
          ${currentTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}
        `}>
          <h2 className={`
            text-xl font-bold
            ${currentTheme === 'dark' ? 'text-white' : 'text-gray-900'}
          `}>
            Настройки премиум
          </h2>

          <button
            onClick={onClose}
            className={`
              p-2 rounded-full transition-colors duration-200
              ${currentTheme === 'dark'
                ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
                : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
              }
            `}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Контент */}
        <div className="px-6 pb-6">
          {loading ? (
            <div className="space-y-4">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/3"></div>
                <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
                <div className="grid grid-cols-5 gap-2">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="h-8 bg-gray-300 dark:bg-gray-600 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Сообщения */}
              {error && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 
                               border border-red-200 dark:border-red-800 rounded-lg p-3">
                  {error}
                </div>
              )}
              
              {success && (
                <div className="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 
                               border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  {success}
                </div>
              )}

              {/* Выбор цвета ника */}
              <div>
                <label className="flex items-center gap-2 font-medium text-foreground mb-3">
                  <Palette className="w-4 h-4 text-purple-500" />
                  Цвет ника
                </label>

                {/* Информация об авто-контрасте */}
                <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-xs text-blue-700 dark:text-blue-300">
                  <strong>Авто-контраст:</strong> Для очень светлых или темных цветов система автоматически адаптирует цвет в зависимости от темы приложения ({currentTheme === 'dark' ? 'темная' : 'светлая'}) для лучшей видимости.
                </div>

                <div className="space-y-3">
                  {/* Выбор цвета и кнопка по умолчанию */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={currentColor}
                        onChange={(e) => {
                          setCurrentColor(e.target.value)
                          setCustomColor(e.target.value)
                        }}
                        className="w-12 h-12 rounded-lg border border-border cursor-pointer"
                        title="Выберите цвет ника"
                      />
                      <span className="text-sm text-muted-foreground font-mono">
                        {currentColor.toUpperCase()}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        const defaultColor = '#FFFFFF'
                        setCurrentColor(defaultColor)
                        setCustomColor(defaultColor)
                      }}
                      className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors duration-200
                               ${currentTheme === 'dark'
                                 ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                                 : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                               }`}
                      title="Установить цвет по умолчанию"
                    >
                      По умолчанию
                    </button>
                  </div>
                </div>

                {/* Предпросмотр профиля */}
                <div className="mt-3 p-4 bg-background/50 rounded-lg border">
                  <span className="text-sm text-muted-foreground mb-3 block">
                    Предпросмотр профиля ({isDarkTheme ? 'темная тема' : 'светлая тема'}):
                  </span>
                  <div className="flex items-center gap-3">
                    {/* Аватарка */}
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex-shrink-0">
                      {userAvatar ? (
                        <img
                          src={userAvatar}
                          alt="Ваш аватар"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {userDisplayName?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Иконка и имя */}
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {currentIcon && (
                        <span className="flex-shrink-0">
                          {(() => {
                            const selectedIcon = PREMIUM_ICONS.find(icon => icon.id === currentIcon)
                            if (selectedIcon?.icon) {
                              const IconComponent = selectedIcon.icon
                              // Используем цвет иконки в зависимости от настройки
                              const iconStyle = iconColorMatch
                                ? (() => {
                                    const brightness = _getBrightness(currentColor)
                                    if (!isDarkTheme && brightness > 220) return { color: '#000000' }
                                    if (isDarkTheme && brightness < 35) return { color: '#FFFFFF' }
                                    return { color: currentColor }
                                  })()
                                : {}
                              return <IconComponent className={`w-4 h-4 ${iconColorMatch ? '' : selectedIcon.color}`} style={iconStyle} />
                            }
                            return null
                          })()}
                        </span>
                      )}
                      <span
                        className="font-medium truncate"
                        style={{
                          color: (() => {
                            const brightness = _getBrightness(currentColor)
                            if (!isDarkTheme && brightness > 220) return '#000000'
                            if (isDarkTheme && brightness < 35) return '#FFFFFF'
                            return currentColor
                          })()
                        }}
                      >
                        {userDisplayName}
                      </span>
                      {(() => {
                        const brightness = _getBrightness(currentColor)
                        return (!isDarkTheme && brightness > 220) || (isDarkTheme && brightness < 35)
                      })() && (
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          (адаптировано к теме)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Выбор иконки */}
              <div>
                <label className="flex items-center gap-2 font-medium text-foreground mb-3">
                  <Award className="w-4 h-4 text-indigo-500" />
                  Иконка статуса
                </label>
                
                <div className="grid grid-cols-4 gap-2">
                  {PREMIUM_ICONS.map((icon) => (
                    <button
                      key={icon.id}
                      onClick={() => setCurrentIcon(icon.id)}
                      className={`p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105
                                 flex flex-col items-center gap-1
                                 ${currentIcon === icon.id
                                   ? 'border-foreground bg-primary/10'
                                   : 'border-border hover:border-foreground/50 hover:bg-muted/50'
                                 }`}
                      title={icon.name}
                    >
                      {icon.icon ? (
                        <icon.icon className={`w-6 h-6 ${icon.color}`} />
                      ) : (
                        <X className="w-6 h-6 text-gray-400" />
                      )}
                      <span className="text-xs text-muted-foreground text-center leading-none">
                        {icon.name}
                      </span>
                    </button>
                  ))}
                </div>

              </div>

              {/* Настройка цвета иконки */}
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border">
                <input
                  type="checkbox"
                  id="iconColorMatch"
                  checked={iconColorMatch}
                  onChange={(e) => setIconColorMatch(e.target.checked)}
                  className="w-5 h-5 text-primary bg-background border-2 border-border rounded focus:ring-primary focus:ring-2 transition-colors cursor-pointer
                           checked:bg-primary checked:border-primary
                           dark:ring-offset-gray-800"
                />
                <label
                  htmlFor="iconColorMatch"
                  className="text-sm font-medium text-foreground cursor-pointer select-none"
                >
                  Иконка под цвет ника
                </label>
              </div>

              {/* Кнопки действий */}
              <div className="flex items-center justify-between pt-4">
                <button
                  onClick={resetToDefault}
                  className={`
                    px-3 py-2 text-sm font-medium rounded-lg border transition-colors duration-200
                    ${currentTheme === 'dark'
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }
                    flex items-center gap-2
                  `}
                >
                  <RotateCcw className="w-4 h-4" />
                  По умолчанию
                </button>

                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className={`
                      px-4 py-2 text-sm font-medium rounded-lg border transition-colors duration-200
                      ${currentTheme === 'dark'
                        ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    Отменить
                  </button>

                  <button
                    onClick={handleSaveSettings}
                    disabled={saving}
                    className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500
                             hover:from-yellow-600 hover:to-orange-600
                             disabled:from-gray-400 disabled:to-gray-500
                             text-white text-sm font-medium rounded-lg
                             transition-all duration-200 hover:scale-105 hover:shadow-lg
                             focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2
                             dark:focus:ring-offset-gray-800
                             flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PremiumSettingsModal
