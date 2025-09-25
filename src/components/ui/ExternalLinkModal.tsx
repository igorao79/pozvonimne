'use client'

import React from 'react'
import { AlertTriangle, ExternalLink, X } from 'lucide-react'
import useThemeStore from '@/store/useThemeStore'

interface ExternalLinkModalProps {
  isOpen: boolean
  onClose: () => void
  url: string
  onConfirm: () => void
}

const ExternalLinkModal: React.FC<ExternalLinkModalProps> = ({
  isOpen,
  onClose,
  url,
  onConfirm
}) => {
  const { theme } = useThemeStore()

  if (!isOpen) return null

  // Извлекаем домен из URL для отображения
  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname
    } catch {
      return url
    }
  }

  // Обработчик клика по фону
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <div className={`
        relative w-full max-w-md mx-auto rounded-lg shadow-xl
        ${theme === 'dark' 
          ? 'bg-gray-800 border border-gray-700' 
          : 'bg-white border border-gray-200'
        }
        transform transition-all duration-200 ease-out
        animate-in zoom-in-95 fade-in-0
      `}>
        {/* Заголовок с иконкой закрытия */}
        <div className={`
          flex items-center justify-between p-6 pb-4
          ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}
        `}>
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
            </div>
            <h2 className={`
              text-lg font-semibold
              ${theme === 'dark' ? 'text-white' : 'text-gray-900'}
            `}>
              Переход на внешний сайт
            </h2>
          </div>
          
          <button
            onClick={onClose}
            className={`
              p-2 rounded-full transition-colors duration-200
              ${theme === 'dark' 
                ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
              }
            `}
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Контент */}
        <div className="px-6 pb-6">
          <div className="space-y-4">
            <p className={`
              text-sm leading-relaxed
              ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}
            `}>
              Вы покидаете <span className="font-medium text-blue-500">pozvonimne.vercel.app</span> и переходите на внешний ресурс:
            </p>
            
            <div className={`
              p-3 rounded-lg border
              ${theme === 'dark' 
                ? 'bg-gray-700/50 border-gray-600' 
                : 'bg-gray-50 border-gray-200'
              }
            `}>
              <div className="flex items-center space-x-2">
                <ExternalLink className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className={`
                  text-sm font-mono break-all
                  ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}
                `}>
                  {getDomain(url)}
                </span>
              </div>
            </div>

            <p className={`
              text-sm
              ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}
            `}>
              Убедитесь, что доверяете этому сайту, прежде чем продолжить.
            </p>
          </div>

          {/* Кнопки действий */}
          <div className="flex items-center justify-end space-x-3 mt-6">
            <button
              onClick={onClose}
              className={`
                px-4 py-2 text-sm font-medium rounded-lg border transition-colors duration-200
                ${theme === 'dark'
                  ? 'border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                }
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                ${theme === 'dark' ? 'focus:ring-offset-gray-800' : 'focus:ring-offset-white'}
              `}
            >
              Отменить
            </button>
            
            <button
              onClick={onConfirm}
              className={`
                px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg
                hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                transition-colors duration-200
                ${theme === 'dark' ? 'focus:ring-offset-gray-800' : 'focus:ring-offset-white'}
              `}
            >
              Продолжить
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExternalLinkModal
