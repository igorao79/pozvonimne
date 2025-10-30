import { useState, useEffect } from 'react'

interface ChatSettings {
  hideArchive: boolean
  hidePinned: boolean
  hideFavorites: boolean
}

const CHAT_SETTINGS_KEY = 'chat_settings'

// Хук для управления настройками чата
export const useChatSettings = () => {
  const [settings, setSettings] = useState<ChatSettings>({
    hideArchive: false,
    hidePinned: false,
    hideFavorites: false
  })

  // Загружаем настройки из localStorage при монтировании
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(CHAT_SETTINGS_KEY)
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings)
        setSettings(parsedSettings)
      }
    } catch (error) {
      console.error('Ошибка загрузки настроек чата:', error)
    }
  }, [])

  // Сохраняем настройки в localStorage при изменении
  const updateSettings = (newSettings: Partial<ChatSettings>) => {
    const updatedSettings = { ...settings, ...newSettings }
    setSettings(updatedSettings)

    try {
      localStorage.setItem(CHAT_SETTINGS_KEY, JSON.stringify(updatedSettings))
    } catch (error) {
      console.error('Ошибка сохранения настроек чата:', error)
    }
  }

  // Переключаем скрытие архива
  const toggleHideArchive = (hide: boolean) => {
    updateSettings({ hideArchive: hide })
  }

  // Переключаем скрытие закрепленных чатов
  const toggleHidePinned = (hide: boolean) => {
    updateSettings({ hidePinned: hide })
  }

  // Переключаем скрытие избранного
  const toggleHideFavorites = (hide: boolean) => {
    updateSettings({ hideFavorites: hide })
  }

  return {
    hideArchive: settings.hideArchive,
    hidePinned: settings.hidePinned,
    hideFavorites: settings.hideFavorites,
    updateSettings,
    toggleHideArchive,
    toggleHidePinned,
    toggleHideFavorites
  }
}
