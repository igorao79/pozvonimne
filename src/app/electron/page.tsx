'use client'

import dynamic from 'next/dynamic'
import ElectronLayout from '../electron-layout'

// Dynamically import the main app to avoid SSR issues in Electron
const MainApp = dynamic(() => import('../page'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-lg text-muted-foreground">Загрузка Позвони.мне...</p>
      </div>
    </div>
  )
})

export default function ElectronPage() {
  return (
    <ElectronLayout>
      <MainApp />
    </ElectronLayout>
  )
}
