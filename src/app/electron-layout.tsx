'use client'

import { useEffect, useState } from 'react'
import { Inter } from 'next/font/google'
import '../app/globals.css'

const inter = Inter({ subsets: ['latin', 'cyrillic'] })

// Extend Window interface for Electron API
declare global {
  interface Window {
    electronAPI?: {
      getAppVersion: () => Promise<string>
      getPlatform: () => Promise<string>
      showMessageBox: (options: any) => Promise<any>
      getScreenSources: () => Promise<any[]>
      getSystemTheme: () => Promise<string>
      checkForUpdates: () => Promise<{ updateAvailable: boolean; message: string }>
      // Add other methods as needed
    }
    electron?: {
      platform: string
      versions: {
        node: string
        chrome: string
        electron: string
      }
    }
  }
}

export default function ElectronLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isElectron, setIsElectron] = useState(false)
  const [platform, setPlatform] = useState<string>('')

  useEffect(() => {
    // Check if running in Electron
    const isElectronEnv = typeof window !== 'undefined' &&
                         window.electronAPI !== undefined

    setIsElectron(isElectronEnv)

    if (isElectronEnv) {
      // Get platform info
      window.electronAPI?.getPlatform().then(setPlatform).catch(() => {
        setPlatform('unknown')
      })

      // Add Electron-specific styling
      document.documentElement.classList.add('electron-app')

      // Customize title bar behavior for macOS
      if (window.electron?.platform === 'darwin') {
        document.documentElement.classList.add('macos')
      }
    }
  }, [])

  return (
    <html lang="ru" suppressHydrationWarning className={isElectron ? 'electron' : ''}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        {isElectron && (
          <style dangerouslySetInnerHTML={{
            __html: `
              html.electron {
                -webkit-app-region: drag;
              }
              html.electron .electron-no-drag {
                -webkit-app-region: no-drag;
              }
              html.electron.macos header {
                padding-top: 20px;
              }
            `
          }} />
        )}
      </head>
      <body className={`${inter.className} ${isElectron ? 'electron-body' : ''}`} suppressHydrationWarning>
        {children}

        {isElectron && (
          <script dangerouslySetInnerHTML={{
            __html: `
              // Electron-specific initialization
              if (window.electronAPI) {
                console.log('Running in Electron environment');
                console.log('Platform:', '${platform}');
                console.log('Electron version:', window.electron?.versions?.electron);
              }
            `
          }} />
        )}
      </body>
    </html>
  )
}
