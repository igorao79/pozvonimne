'use client'

import { useState } from 'react'
import CallInterface from '@/components/Call/CallInterface'
import { UserProfile } from '@/components/Profile'
import { AdminPanel } from '@/components/Admin'
import Header from './Header'
import ErrorDisplay from './ErrorDisplay'

interface MainLayoutProps {
  isAdmin: boolean
  error: string | null
  resetChatTrigger: number
  onCurrentChatChange: (chatId: string | null) => void
  onSignOut: () => void
  onLogoClick?: () => void
}

export default function MainLayout({
  isAdmin,
  error,
  resetChatTrigger,
  onCurrentChatChange,
  onSignOut,
  onLogoClick
}: MainLayoutProps) {
  const [showProfile, setShowProfile] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)

  // Функция для восстановления фокуса на чат после закрытия модальных окон
  const restoreChatFocus = () => {
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('restoreChatFocus'))
    }, 100)
  }

  const handleLogoClick = () => {
    // Сбрасываем состояние к начальному виду - закрываем профиль и сбрасываем чаты
    setShowProfile(false)
    onLogoClick?.()
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background transition-colors">
      <Header
        isAdmin={isAdmin}
        onLogoClick={handleLogoClick}
        onProfileClick={() => setShowProfile(true)}
        onAdminClick={() => setShowAdmin(true)}
        onSignOut={onSignOut}
      />

      <ErrorDisplay error={error} />

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <CallInterface
          resetChatTrigger={resetChatTrigger}
          onCurrentChatChange={onCurrentChatChange}
        />
      </main>

      {/* Profile Modal */}
      {showProfile && (
        <UserProfile onClose={() => {
          setShowProfile(false)
          restoreChatFocus()
        }} />
      )}

      {/* Admin Panel */}
      {showAdmin && (
        <AdminPanel
          onClose={() => {
            setShowAdmin(false)
            restoreChatFocus()
          }}
        />
      )}
    </div>
  )
}
