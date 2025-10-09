'use client'

import { User, Shield, Download } from 'lucide-react'
import OptimizedImage from '@/components/ui/OptimizedImage'
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler'
import { useAppUpdate } from '@/hooks/useAppUpdate'

interface HeaderProps {
  isAdmin: boolean
  onLogoClick: () => void
  onProfileClick: () => void
  onAdminClick: () => void
  onSignOut: () => void
}

export default function Header({
  isAdmin,
  onLogoClick,
  onProfileClick,
  onAdminClick,
  onSignOut
}: HeaderProps) {
  const { downloadLatestRelease, isDownloading, requestNotificationPermission } = useAppUpdate()

  const handleUpdateClick = async () => {
    // Запрашиваем разрешение на уведомления при первом клике
    await requestNotificationPermission()
    // Начинаем скачивание
    downloadLatestRelease()
  }

  return (
    <header className="bg-card shadow-sm border-b border-border flex-shrink-0 transition-colors safe-area-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-2">
          <div className="flex items-center">
            <OptimizedImage
              src="/logo.webp"
              alt="Позвони.мне логотип"
              width={32}
              height={32}
              className="mr-2 select-none"
              priority
              quality={95}
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
            />
            <h1
              className="text-lg font-semibold text-foreground hover:text-primary hover:ring-2 hover:ring-primary/30 dark:hover:ring-primary/50 hover:ring-offset-1 transition-all duration-200 cursor-pointer rounded px-2 py-1"
              onClick={onLogoClick}
            >
              Позвони.мне
            </h1>
          </div>
          <div className="flex items-center justify-end space-x-3">
            <AnimatedThemeToggler />

            {/* Download Button */}
            <button
              onClick={handleUpdateClick}
              disabled={isDownloading}
              className={`p-2 rounded-md download-button transition-all duration-200 border border-border h-9 ${
                isDownloading
                  ? 'bg-blue-100 dark:bg-blue-900/50 cursor-wait animate-pulse'
                  : 'hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:ring-2 hover:ring-blue-300 dark:hover:ring-blue-600 cursor-pointer'
              }`}
              aria-label={isDownloading ? "Скачивание..." : "Скачать приложение"}
              title={isDownloading ? "Скачивание установщика..." : "Скачать последнюю версию приложения"}
            >
              <Download className={`h-5 w-5 transition-all duration-200 ${
                isDownloading 
                  ? 'text-blue-400 dark:text-blue-500' 
                  : 'text-blue-600 dark:text-blue-400'
              }`} />
            </button>

            {/* Admin Button - только для администраторов */}
            {isAdmin && (
              <button
                onClick={onAdminClick}
                className="p-2 rounded-md admin-button hover:bg-yellow-100 dark:hover:bg-yellow-900/30 hover:ring-2 hover:ring-yellow-300 dark:hover:ring-yellow-600 transition-all duration-200 border border-border cursor-pointer h-9"
                aria-label="Открыть админку"
                title="Административная панель"
              >
                <Shield className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </button>
            )}
            <button
              onClick={onProfileClick}
              className="p-2 rounded-md profile-button hover:bg-secondary/80 hover:ring-2 hover:ring-secondary/60 dark:hover:bg-gray-600 dark:hover:ring-gray-300 transition-all duration-200 border border-border cursor-pointer h-9"
              aria-label="Открыть профиль"
            >
              <User className="h-5 w-5 text-foreground" />
            </button>
            <button
              onClick={onSignOut}
              className="text-sm logout-button text-primary hover:text-primary/80 hover:bg-primary/10 hover:ring-1 hover:ring-primary/30 dark:hover:bg-gray-600 dark:hover:ring-gray-300 transition-all duration-200 px-3 py-2 rounded cursor-pointer h-9"
            >
              Выйти
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
