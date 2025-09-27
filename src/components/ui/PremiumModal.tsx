'use client'

import React from 'react'
import { X, Crown, Star, Sparkles } from 'lucide-react'

interface PremiumModalProps {
  isOpen: boolean
  onClose: () => void
  onPurchase: () => void
}

const PremiumModal: React.FC<PremiumModalProps> = ({
  isOpen,
  onClose,
  onPurchase
}) => {
  if (!isOpen) return null

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
      <div className="relative w-full max-w-md mx-auto rounded-lg shadow-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 transform transition-all duration-200 ease-out animate-in zoom-in-95 fade-in-0">
        {/* Заголовок */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Crown className="w-6 h-6 text-yellow-500" />
            Премиум привилегия
          </h2>

          <button
            onClick={onClose}
            className="p-2 rounded-full transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Контент */}
        <div className="px-6 pb-6">
          <div className="space-y-4">
            {/* Описание */}
            <div className="text-center space-y-3">
              <div className="flex justify-center">
                <div className="relative">
                  <Crown className="w-16 h-16 text-yellow-500" />
                  <Sparkles className="absolute -top-1 -right-1 w-6 h-6 text-purple-500 animate-pulse" />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Получите премиум статус!
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  Премиум привилегия дает вам возможность персонализировать свой профиль в чате:
                </p>
              </div>
            </div>

            {/* Преимущества */}
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500" />
                Что вы получите:
              </h4>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
                  Возможность выбрать цвет своего ника в чате
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
                  Специальную иконку рядом с вашим именем
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
                  Полную настройку внешнего вида профиля
                </li>
              </ul>
            </div>

            {/* Важная информация */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <div className="text-blue-500 mt-0.5">ℹ️</div>
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium mb-1">Важно!</p>
                  <p className="leading-relaxed">
                    Создатель проекта не нуждается в ваших деньгах. Эта привилегия создана исключительно для тестирования функционала и развития личных навыков.
                  </p>
                </div>
              </div>
            </div>

            {/* Инструкции по покупке */}
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
              <div className="flex items-start gap-3">
                <div className="text-red-500 mt-0.5">⚠️</div>
                <div className="text-sm text-red-800 dark:text-red-200">
                  <p className="font-medium mb-2 text-red-900 dark:text-red-100">Инструкции по покупке:</p>
                  <div className="space-y-1">
                    <p>1. Нажмите "Купить премиум" - откроется DonationAlerts</p>
                    <p>2. Авторизуйтесь и выберите сумму <strong>от 10 ₽</strong></p>
                    <p className="font-bold text-red-900 dark:text-red-100">
                      3. В поле "Сообщение" ОБЯЗАТЕЛЬНО напишите: <strong>"премиум"</strong>
                    </p>
                    <p>4. Завершите оплату</p>
                    <p className="text-xs mt-2 opacity-75">
                      Без слова "премиум" в сообщении донат не будет засчитан!
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Цена и кнопка */}
            <div className="space-y-3">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-full font-bold text-lg">
                  <span>от 10 ₽</span>
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>

              <button
                onClick={onPurchase}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 flex items-center justify-center gap-2"
              >
                <Crown className="w-5 h-5" />
                Купить премиум
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PremiumModal