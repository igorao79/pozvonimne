'use client'

import React from 'react'
import { Mail, CheckCircle, RefreshCw, X } from 'lucide-react'
import useThemeStore from '@/store/useThemeStore'

interface EmailVerificationModalProps {
  isOpen: boolean
  onClose: () => void
  email: string
  onResendEmail?: () => void
  isResending?: boolean
}

const EmailVerificationModal: React.FC<EmailVerificationModalProps> = ({
  isOpen,
  onClose,
  email,
  onResendEmail,
  isResending = false
}) => {
  const { theme } = useThemeStore()

  if (!isOpen) return null

  // Обработчик клика по фону
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <div className={`
        relative w-full max-w-md mx-auto rounded-xl shadow-2xl
        ${theme === 'dark' 
          ? 'bg-gray-800 border border-gray-700' 
          : 'bg-white border border-gray-200'
        }
        transform transition-all duration-300 ease-out
        animate-in zoom-in-95 fade-in-0 slide-in-from-bottom-4
      `}>
        {/* Заголовок с иконкой закрытия */}
        <div className={`
          flex items-center justify-between p-6 pb-4
          ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}
        `}>
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className={`
                w-12 h-12 rounded-full flex items-center justify-center
                ${theme === 'dark' ? 'bg-blue-600/20' : 'bg-blue-50'}
              `}>
                <Mail className="w-6 h-6 text-blue-500" />
              </div>
            </div>
            <div>
              <h2 className={`
                text-xl font-semibold
                ${theme === 'dark' ? 'text-white' : 'text-gray-900'}
              `}>
                Проверьте почту
              </h2>
              <p className={`
                text-sm mt-1
                ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}
              `}>
                Почти готово!
              </p>
            </div>
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
            {/* Основное сообщение */}
            <div className={`
              p-4 rounded-lg border-l-4 border-blue-500
              ${theme === 'dark' 
                ? 'bg-blue-600/10 border-blue-500' 
                : 'bg-blue-50 border-blue-500'
              }
            `}>
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className={`
                    text-sm font-medium leading-relaxed
                    ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}
                  `}>
                    Мы отправили письмо с подтверждением на адрес:
                  </p>
                  <p className={`
                    text-sm font-mono mt-1 px-2 py-1 rounded
                    ${theme === 'dark' 
                      ? 'bg-gray-700/50 text-blue-300' 
                      : 'bg-white text-blue-600'
                    }
                  `}>
                    {email}
                  </p>
                </div>
              </div>
            </div>

            {/* Инструкции */}
            <div className="space-y-3">
              <h3 className={`
                text-sm font-semibold
                ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}
              `}>
                Что делать дальше:
              </h3>
              
              <div className="space-y-2">
                {[
                  'Откройте свою почтовую программу или сайт',
                  'Найдите письмо от Позвони.мне (проверьте папку "Спам")',
                  'Нажмите на ссылку подтверждения в письме',
                  'Вернитесь на сайт и войдите в аккаунт'
                ].map((step, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className={`
                      w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold
                      ${theme === 'dark' 
                        ? 'bg-gray-700 text-gray-300' 
                        : 'bg-gray-100 text-gray-600'
                      }
                    `}>
                      {index + 1}
                    </div>
                    <p className={`
                      text-sm leading-relaxed
                      ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}
                    `}>
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Дополнительная информация */}
            <div className={`
              p-3 rounded-lg text-xs
              ${theme === 'dark' 
                ? 'bg-gray-700/30 text-gray-400' 
                : 'bg-gray-50 text-gray-500'
              }
            `}>
              <p>
                💡 <strong>Не получили письмо?</strong> Проверьте папку "Спам" или "Промоакции". 
                Письмо может прийти в течение 5-10 минут.
              </p>
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="flex items-center justify-between mt-6 space-x-3">
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
              Понятно
            </button>
            
            {onResendEmail && (
              <button
                onClick={onResendEmail}
                disabled={isResending}
                className={`
                  flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white 
                  bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                  transition-colors duration-200
                  ${theme === 'dark' ? 'focus:ring-offset-gray-800' : 'focus:ring-offset-white'}
                `}
              >
                {isResending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Отправляем...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    <span>Отправить повторно</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default EmailVerificationModal
