'use client'

import { useEffect } from 'react'
import { Capacitor, PluginListenerHandle } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { App } from '@capacitor/app'

/**
 * Настройка Capacitor при запуске приложения
 */
export default function CapacitorSetup() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return
    }

    const setupStatusBar = async () => {
      try {
        // iOS СПЕЦИФИЧНЫЕ настройки для предотвращения движения status bar
        if (Capacitor.getPlatform() === 'ios') {
          // Многократный сброс для гарантии
          await StatusBar.hide()
          await new Promise(resolve => setTimeout(resolve, 50))
          await StatusBar.show()

          // КРИТИЧНО: НЕ накладываем на веб-представление
          await StatusBar.setOverlaysWebView({ overlay: false })

          // Устанавливаем стиль и цвет
          await StatusBar.setStyle({ style: Style.Light })
          await StatusBar.setBackgroundColor({ color: '#ffffff' })

          // Дополнительный сброс через 500мс (iOS иногда сбрасывает настройки)
          setTimeout(async () => {
            try {
              await StatusBar.setOverlaysWebView({ overlay: false })
              await StatusBar.setStyle({ style: Style.Light })
              console.log('✅ iOS StatusBar дополнительно зафиксирован')
            } catch (e) {
              console.warn('⚠️ iOS StatusBar дополнительная настройка не удалась:', e)
            }
          }, 500)
        } else {
          // Android настройки - Xiaomi/MIUI специфично
          await StatusBar.show()

          // Xiaomi устройства часто игнорируют стандартные настройки
          // Повторяем несколько раз для гарантии
          await StatusBar.setOverlaysWebView({ overlay: false })
          await new Promise(resolve => setTimeout(resolve, 50))
          await StatusBar.setOverlaysWebView({ overlay: false }) // Повтор

          await StatusBar.setBackgroundColor({ color: '#ffffff' })
          await StatusBar.setStyle({ style: Style.Light })

          // Xiaomi может сбрасывать настройки - повторяем через время
          setTimeout(async () => {
            try {
              await StatusBar.setOverlaysWebView({ overlay: false })
              await StatusBar.setBackgroundColor({ color: '#ffffff' })
              await StatusBar.setStyle({ style: Style.Light })
              console.log('✅ Xiaomi StatusBar дополнительно зафиксирован')
            } catch (e) {
              console.warn('⚠️ Xiaomi StatusBar дополнительная настройка не удалась:', e)
            }
          }, 1000)
        }

        console.log('✅ StatusBar настроен для предотвращения движения при скролле')
      } catch (error) {
        console.error('❌ Ошибка StatusBar:', error)
      }
    }

    // Показываем сразу
    setupStatusBar()
    
    // Повторно показываем после небольшой задержки (на случай если что-то скрыло)
    const timer = setTimeout(() => {
      setupStatusBar()
    }, 100)
    
    // Показываем когда приложение возвращается на передний план
    let listenerHandle: PluginListenerHandle | null = null
    App.addListener('appStateChange', async ({ isActive }) => {
      if (isActive) {
        await setupStatusBar()
      }
    }).then(handle => {
      listenerHandle = handle
    })

    return () => {
      clearTimeout(timer)
      if (listenerHandle) {
        listenerHandle.remove()
      }
    }
  }, [])

  return null
}
