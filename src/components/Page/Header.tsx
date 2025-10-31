'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
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
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 })
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const { downloadLatestRelease, isDownloading, requestNotificationPermission } = useAppUpdate()

  // Закрываем меню при клике вне него (для Portal)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      // Проверяем что клик не по кнопке и не по меню
      if (
        menuRef.current && 
        !menuRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
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
    if (!isMobileMenuOpen && buttonRef.current) {
      // Вычисляем позицию кнопки для Portal
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuPosition({
        top: rect.bottom + 8, // 8px отступ
        right: window.innerWidth - rect.right // Расстояние от правого края
      })
    }
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
    <>
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
                  ? 'bg-primary/20 cursor-wait animate-pulse'
                  : 'hover:bg-primary/10 hover:ring-2 hover:ring-primary cursor-pointer'
              }`}
              aria-label={isDownloading ? "Скачивание..." : "Скачать приложение"}
              title={isDownloading ? "Скачивание установщика..." : "Скачать последнюю версию приложения"}
            >
              <Download className="download-icon h-5 w-5 transition-all duration-200" />
            </button>

            {/* Admin Button - только для администраторов */}
            {isAdmin && (
              <button
                onClick={onAdminClick}
                className="p-2 rounded-md admin-button hover:bg-destructive/10 hover:ring-2 hover:ring-destructive transition-all duration-200 border border-border cursor-pointer h-9"
                aria-label="Открыть админку"
                title="Административная панель"
              >
                <Shield className="admin-icon h-5 w-5" />
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
          <div className="md:hidden relative">
            <button
              ref={buttonRef}
              onClick={toggleMobileMenu}
              className={`p-2 rounded-md transition-all duration-200 border border-border h-9 ${
                isMobileMenuOpen
                  ? 'bg-secondary/80 ring-2 ring-secondary/60'
                  : 'hover:bg-secondary/80 hover:ring-2 hover:ring-secondary/60'
              } cursor-pointer`}
              aria-label="Меню"
              title="Открыть меню"
            >
              <Settings className={`preserve-icon-color h-5 w-5 transition-transform duration-200 ${
                isMobileMenuOpen ? 'rotate-90' : ''
              }`} />
            </button>

          </div>
        </div>
      </div>
    </header>
    
    {/* Mobile dropdown menu в Portal */}
    {isMobileMenuOpen && typeof window !== 'undefined' && createPortal(
      <div 
        ref={menuRef}
        className="fixed w-48 bg-card border border-border rounded-lg shadow-lg py-2 z-[9999] transition-all duration-300 opacity-100 visible transform translate-y-0"
        style={{
          top: menuPosition.top,
          right: menuPosition.right
        }}
      >
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
              ? 'bg-primary/20 cursor-wait'
              : 'hover:bg-secondary/80 cursor-pointer'
          }`}
        >
          <Download className="download-icon h-5 w-5" />
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
            <Shield className="admin-icon h-5 w-5" />
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
      </div>,
      document.body
    )}
    </>
  )
}
