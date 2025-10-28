import { useState, useEffect } from 'react'

interface ChatSettings {
  hideArchive: boolean
}

const CHAT_SETTINGS_KEY = 'chat_settings'

// Хук для управления настройками чата
export const useChatSettings = () => {
  const [settings, setSettings] = useState<ChatSettings>({
    hideArchive: false
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

  return {
    hideArchive: settings.hideArchive,
    updateSettings,
    toggleHideArchive
  }
}
