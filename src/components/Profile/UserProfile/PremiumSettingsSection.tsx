import React, { useState } from 'react'
import { Crown, Settings } from 'lucide-react'
import PremiumSettingsModal from '@/components/ui/PremiumSettingsModal'
import { PremiumSettingsSectionProps } from './types'

const PremiumSettingsSection = ({ userId, isPremium }: PremiumSettingsSectionProps) => {
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)

  const handleOpenSettings = () => {
    // Мгновенно открываем модал, данные загрузятся внутри него
    setIsSettingsModalOpen(true)
  }

  const handleCloseSettings = () => {
    setIsSettingsModalOpen(false)
    // Восстанавливаем фокус на чат после закрытия модального окна
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('restoreChatFocus'))
    }, 100)
  }

  if (!isPremium) {
    return null
  }

  return (
    <>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Crown className="w-5 h-5 text-yellow-500" />
          Премиум статус
        </h3>
        
        <div className="flex items-center justify-between">
                <button
                  onClick={handleOpenSettings}
                  className="w-full display-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 
                           hover:from-yellow-600 hover:to-orange-600 
                           text-white text-sm font-medium rounded-lg
                           transition-all duration-200 hover:scale-105 hover:shadow-lg
                           focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2
                           dark:focus:ring-offset-gray-800
                           flex gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Настроить
                </button>
              </div>
      </div>

      <PremiumSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={handleCloseSettings}
        userId={userId}
      />
    </>
  )
}

export default PremiumSettingsSection
