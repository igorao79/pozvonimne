import { useState, useCallback } from 'react'

interface UpdateStatus {
  updateAvailable: boolean
  message: string
}

export function useAppUpdate() {
  const [isChecking, setIsChecking] = useState(false)
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
    try {
      // Открываем страницу с релизами в браузере
      const releasesUrl = 'https://github.com/igorao79/pozvonimne/releases/latest'
      window.open(releasesUrl, '_blank')
    } catch (error) {
      console.error('Error opening releases page:', error)
    }
  }, [])

  return {
    isChecking,
    updateStatus,
    checkForUpdates,
    downloadLatestRelease
  }
}
