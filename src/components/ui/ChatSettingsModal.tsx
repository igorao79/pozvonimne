'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Settings } from 'lucide-react'
import useThemeStore from '@/store/useThemeStore'

interface ChatSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  hideArchive: boolean
  onToggleHideArchive: (hide: boolean) => void
  hidePinned: boolean
  onToggleHidePinned: (hide: boolean) => void
  hideFavorites: boolean
  onToggleHideFavorites: (hide: boolean) => void
}

const ChatSettingsModal: React.FC<ChatSettingsModalProps> = ({
  isOpen,
  onClose,
  hideArchive,
  onToggleHideArchive,
  hidePinned,
  onToggleHidePinned,
  hideFavorites,
  onToggleHideFavorites
}) => {
  const { theme: currentTheme } = useThemeStore()
  const [localHideArchive, setLocalHideArchive] = useState(hideArchive)
  const [localHidePinned, setLocalHidePinned] = useState(hidePinned)
  const [localHideFavorites, setLocalHideFavorites] = useState(hideFavorites)

  // Синхронизируем локальное состояние с пропсами
  useEffect(() => {
    setLocalHideArchive(hideArchive)
  }, [hideArchive])

  useEffect(() => {
    setLocalHidePinned(hidePinned)
  }, [hidePinned])

  useEffect(() => {
    setLocalHideFavorites(hideFavorites)
  }, [hideFavorites])

  // Обработчик изменения чекбокса
  const handleToggleHideArchive = (checked: boolean) => {
    setLocalHideArchive(checked)
    onToggleHideArchive(checked)
  }

  const handleToggleHidePinned = (checked: boolean) => {
    setLocalHidePinned(checked)
    onToggleHidePinned(checked)
  }

  const handleToggleHideFavorites = (checked: boolean) => {
    setLocalHideFavorites(checked)
    onToggleHideFavorites(checked)
  }

  if (!isOpen) return null

  // Проверяем доступность document для SSR
  if (typeof document === 'undefined') return null

  // Обработчик клика по фону
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="chat-settings-title"
    >
      <div className={`
        relative w-full max-w-md mx-auto rounded-lg shadow-xl
        ${currentTheme === 'dark'
          ? 'bg-gray-800 border border-gray-700'
          : 'bg-white border border-gray-200'
        }
        transform transition-all duration-200 ease-out
        animate-in zoom-in-95 fade-in-0
      `}>
        {/* Заголовок */}
        <div className={`
          flex items-center justify-between p-6 pb-4
          ${currentTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'}
        `}>
          <h2 id="chat-settings-title" className={`
            text-xl font-bold flex items-center gap-2
            ${currentTheme === 'dark' ? 'text-white' : 'text-gray-900'}
          `}>
            <Settings className="preserve-icon-color w-5 h-5" />
            Настройки чата
          </h2>

          <button
            onClick={onClose}
            className={`
              p-2 rounded-full transition-colors duration-200
              ${currentTheme === 'dark'
                ? 'hover:bg-gray-700 text-gray-400 hover:text-white'
                : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
              }
            `}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Контент */}
        <div className="px-6 pb-6">
          <div className="space-y-4">
            {/* Настройка скрытия архива */}
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border">
              <input
                type="checkbox"
                id="hideArchive"
                checked={localHideArchive}
                onChange={(e) => handleToggleHideArchive(e.target.checked)}
                className="w-5 h-5 text-primary bg-background border-2 border-border rounded focus:ring-primary focus:ring-2 transition-colors cursor-pointer
                         checked:bg-primary checked:border-primary
                         dark:ring-offset-gray-800"
              />
              <label
                htmlFor="hideArchive"
                className="text-sm font-medium text-foreground cursor-pointer select-none"
              >
                Скрыть архив
              </label>
            </div>

            {/* Настройка скрытия закрепленных чатов */}
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border">
              <input
                type="checkbox"
                id="hidePinned"
                checked={localHidePinned}
                onChange={(e) => handleToggleHidePinned(e.target.checked)}
                className="w-5 h-5 text-primary bg-background border-2 border-border rounded focus:ring-primary focus:ring-2 transition-colors cursor-pointer
                         checked:bg-primary checked:border-primary
                         dark:ring-offset-gray-800"
              />
              <label
                htmlFor="hidePinned"
                className="text-sm font-medium text-foreground cursor-pointer select-none"
              >
                Скрыть закрепленные чаты
              </label>
            </div>

            {/* Настройка скрытия избранного */}
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border">
              <input
                type="checkbox"
                id="hideFavorites"
                checked={localHideFavorites}
                onChange={(e) => handleToggleHideFavorites(e.target.checked)}
                className="w-5 h-5 text-primary bg-background border-2 border-border rounded focus:ring-primary focus:ring-2 transition-colors cursor-pointer
                         checked:bg-primary checked:border-primary
                         dark:ring-offset-gray-800"
              />
              <label
                htmlFor="hideFavorites"
                className="text-sm font-medium text-foreground cursor-pointer select-none"
              >
                Скрыть избранное
              </label>
            </div>

            {/* Описание */}
            <div className="text-xs text-muted-foreground">
              При включении этих опций архивные, закрепленные чаты и избранное будут скрыты из списка чатов.
              Вы сможете вернуться к ним, отключив соответствующие настройки.
            </div>

            {/* Кнопка закрытия */}
            <div className="flex justify-end pt-4">
              <button
                onClick={onClose}
                className={`
                  px-4 py-2 text-sm font-medium rounded-lg border transition-colors duration-200
                  ${currentTheme === 'dark'
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default ChatSettingsModal
