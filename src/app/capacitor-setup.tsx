'use client'

import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
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
        // ПОКАЗЫВАЕМ статус бар
        await StatusBar.show()
        
        // Делаем его прозрачным чтобы контент был под ним
        await StatusBar.setOverlaysWebView({ overlay: true })
        
        // Темный стиль (светлые иконки)
        await StatusBar.setStyle({ style: Style.Light })
        
        // Прозрачный фон
        await StatusBar.setBackgroundColor({ color: '#00000000' })
        
        console.log('✅ StatusBar показан')
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
    let listenerHandle: any = null
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
