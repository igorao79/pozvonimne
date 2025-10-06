import { useState, useCallback } from 'react'

interface UpdateStatus {
  updateAvailable: boolean
  message: string
}

interface GitHubAsset {
  name: string
  size: number
  browser_download_url: string
  content_type: string
}

interface GitHubRelease {
  tag_name: string
  name: string
  assets: GitHubAsset[]
}

export function useAppUpdate() {
  const [isChecking, setIsChecking] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null)

  const checkForUpdates = useCallback(async () => {
    if (isChecking) return

    setIsChecking(true)
    try {
      // Используем IPC для проверки обновлений
      if (window.electronAPI?.checkForUpdates) {
        const result = await window.electronAPI.checkForUpdates()
        setUpdateStatus(result)
      } else {
        setUpdateStatus({
          updateAvailable: false,
          message: 'Проверка обновлений недоступна в браузере'
        })
      }
    } catch (error) {
      console.error('Error checking for updates:', error)
      setUpdateStatus({
        updateAvailable: false,
        message: 'Ошибка при проверке обновлений'
      })
    } finally {
      setIsChecking(false)
    }
  }, [isChecking])

  const downloadLatestRelease = useCallback(async () => {
    if (isDownloading) return

    setIsDownloading(true)
    
    try {
      // Получаем информацию о последнем релизе через GitHub API
      const response = await fetch('https://api.github.com/repos/igorao79/pozvonimne/releases/latest')
      
      if (!response.ok) {
        throw new Error(`Failed to fetch latest release: ${response.statusText}`)
      }
      
      const release: GitHubRelease = await response.json()
      
      // Ищем файл установщика в assets релиза
      const setupAsset = release.assets?.find((asset: GitHubAsset) => 
        asset.name && asset.name.match(/^pozvonimne-setup-.*\.exe$/i)
      )
      
      if (!setupAsset) {
        console.error('Setup file not found in release assets')
        // Fallback - открываем страницу релизов
        const fallbackLink = document.createElement('a')
        fallbackLink.href = `https://github.com/igorao79/pozvonimne/releases/tag/${release.tag_name}`
        fallbackLink.target = '_blank'
        fallbackLink.rel = 'noopener noreferrer'
        fallbackLink.dataset.externalAllowed = 'true'
        fallbackLink.style.display = 'none'
        document.body.appendChild(fallbackLink)
        fallbackLink.click()
        document.body.removeChild(fallbackLink)
        return
      }
      
      console.log(`🔄 Начинаем скачивание ${setupAsset.name} (${(setupAsset.size / 1024 / 1024).toFixed(1)} MB)`)
      
      // Показываем уведомление пользователю
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Скачивание началось', {
          body: `Файл ${setupAsset.name} загружается...`,
          icon: '/logo.png'
        })
      }
      
      // Создаем временную ссылку для скачивания
      const downloadLink = document.createElement('a')
      downloadLink.href = setupAsset.browser_download_url
      downloadLink.download = setupAsset.name
      downloadLink.style.display = 'none'
      
      // Добавляем ссылку в DOM, кликаем и удаляем
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)
      
      console.log(`✅ Скачивание запущено: ${setupAsset.name}`)
      
      // Устанавливаем таймаут для сброса состояния загрузки
      setTimeout(() => {
        setIsDownloading(false)
      }, 2000)
      
    } catch (error) {
      console.error('Ошибка при скачивании последнего релиза:', error)
      // Fallback - открываем страницу релизов
      const fallbackLink = document.createElement('a')
      fallbackLink.href = 'https://github.com/igorao79/pozvonimne/releases/latest'
      fallbackLink.target = '_blank'
      fallbackLink.rel = 'noopener noreferrer'
      fallbackLink.dataset.externalAllowed = 'true'
      fallbackLink.style.display = 'none'
      document.body.appendChild(fallbackLink)
      fallbackLink.click()
      document.body.removeChild(fallbackLink)
      setIsDownloading(false)
    }
  }, [isDownloading])

  // Запрос разрешения на уведомления при первом использовании
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  }, [])

  return {
    isChecking,
    isDownloading,
    updateStatus,
    checkForUpdates,
    downloadLatestRelease,
    requestNotificationPermission
  }
}
