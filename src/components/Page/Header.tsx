'use client'

import { useState, useEffect, useRef } from 'react'
import { User, Shield, Download, Settings } from 'lucide-react'
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { downloadLatestRelease, isDownloading, requestNotificationPermission } = useAppUpdate()

  // Закрываем меню при клике вне него
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false)
      }
    }

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMobileMenuOpen])

  const handleUpdateClick = async () => {
    // Запрашиваем разрешение на уведомления при первом клике
    await requestNotificationPermission()
    // Начинаем скачивание
    downloadLatestRelease()
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  const handleMenuItemClick = (action: () => void) => {
    action()
    closeMobileMenu()
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
          {/* Desktop buttons */}
          <div className="hidden md:flex items-center justify-end space-x-3">
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

          {/* Mobile menu button */}
          <div className="md:hidden relative" ref={menuRef}>
            <button
              onClick={toggleMobileMenu}
              className={`p-2 rounded-md transition-all duration-200 border border-border h-9 ${
                isMobileMenuOpen
                  ? 'bg-secondary/80 ring-2 ring-secondary/60'
                  : 'hover:bg-secondary/80 hover:ring-2 hover:ring-secondary/60'
              } cursor-pointer`}
              aria-label="Меню"
              title="Открыть меню"
            >
              <Settings className={`h-5 w-5 transition-transform duration-200 ${
                isMobileMenuOpen ? 'rotate-90' : ''
              }`} />
            </button>

            {/* Mobile dropdown menu */}
            <div className={`absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-lg shadow-lg py-2 z-50 transition-all duration-300 ${
              isMobileMenuOpen
                ? 'opacity-100 visible transform translate-y-0'
                : 'opacity-0 invisible transform -translate-y-2'
            }`}>
              {/* Theme toggler */}
              <div className="px-3 py-2 border-b border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Тема</span>
                  <AnimatedThemeToggler />
                </div>
              </div>

              {/* Menu items */}
              <button
                onClick={() => handleMenuItemClick(onProfileClick)}
                className="w-full text-left px-3 py-2 flex items-center space-x-3 hover:bg-secondary/80 transition-colors duration-200 cursor-pointer"
              >
                <User className="h-5 w-5 text-foreground" />
                <span className="text-sm">Профиль</span>
              </button>

              <button
                onClick={() => handleMenuItemClick(handleUpdateClick)}
                disabled={isDownloading}
                className={`w-full text-left px-3 py-2 flex items-center space-x-3 transition-colors duration-200 ${
                  isDownloading
                    ? 'bg-blue-100 dark:bg-blue-900/50 cursor-wait'
                    : 'hover:bg-secondary/80 cursor-pointer'
                }`}
              >
                <Download className={`h-5 w-5 ${
                  isDownloading
                    ? 'text-blue-400 dark:text-blue-500'
                    : 'text-blue-600 dark:text-blue-400'
                }`} />
                <span className="text-sm">
                  {isDownloading ? 'Скачивание...' : 'Скачать приложение'}
                </span>
              </button>

              {/* Admin Button - только для администраторов */}
              {isAdmin && (
                <button
                  onClick={() => handleMenuItemClick(onAdminClick)}
                  className="w-full text-left px-3 py-2 flex items-center space-x-3 hover:bg-secondary/80 transition-colors duration-200 cursor-pointer"
                >
                  <Shield className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  <span className="text-sm">Админка</span>
                </button>
              )}

              <div className="border-t border-border mt-2 pt-2">
                <button
                  onClick={() => handleMenuItemClick(onSignOut)}
                  className="w-full text-left px-3 py-2 flex items-center space-x-3 text-primary hover:bg-primary/10 transition-colors duration-200 cursor-pointer"
                >
                  <span className="text-sm font-medium">Выйти</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
