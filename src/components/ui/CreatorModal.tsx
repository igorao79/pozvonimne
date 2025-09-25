'use client'

import { X, Star, Heart, Code, Coffee } from 'lucide-react'
import { useUsers } from '@/hooks/useUsers'

interface CreatorModalProps {
  isOpen: boolean
  onClose: () => void
}

const CreatorModal = ({ isOpen, onClose }: CreatorModalProps) => {
  const { users } = useUsers()
  // Ищем пользователя igorao79 (создателя приложения)
  const creatorUser = users.find(user => 
    user.username === 'igorao79' || 
    user.display_name === 'igorao79' ||
    user.is_creator === true
  )
  
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-500 fill-current" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Создатель приложения
            </h2>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* Creator Info */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-full overflow-hidden mx-auto mb-3 ring-2 ring-yellow-400/20">
              {creatorUser?.avatar_url ? (
                <img
                  src={creatorUser.avatar_url}
                  alt={creatorUser.display_name || creatorUser.username || 'Creator'}
                  className="w-full h-full object-cover select-none"
                  onContextMenu={(e) => e.preventDefault()}
                  onDragStart={(e) => e.preventDefault()}
                  onMouseDown={(e) => e.preventDefault()}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {creatorUser?.display_name?.charAt(0)?.toUpperCase() || 
                     creatorUser?.username?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
              )}
            </div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-1">
              {creatorUser?.display_name || creatorUser?.username || 'Igor Goreckiy'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              igoraor79@gmail.com
            </p>
          </div>

          {/* App Info */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg overflow-hidden">
                <img
                  src="/logo.webp"
                  alt="Позвони.мне"
                  className="w-full h-full object-cover select-none"
                  onContextMenu={(e) => e.preventDefault()}
                  onDragStart={(e) => e.preventDefault()}
                  onMouseDown={(e) => e.preventDefault()}
                />
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">
                Позвони.мне
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              Современное приложение для голосовых и видеозвонков с мгновенными сообщениями
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="flex flex-col items-center gap-1">
              <Code className="w-5 h-5 text-blue-500" />
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Разработка
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Heart className="w-5 h-5 text-red-500" />
              <span className="text-xs text-gray-600 dark:text-gray-400">
                С любовью
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Coffee className="w-5 h-5 text-amber-600" />
              <span className="text-xs text-gray-600 dark:text-gray-400">
                И чай
              </span>
            </div>
          </div>

          {/* Thank you message */}
          <div className="text-center pt-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Спасибо, что пользуетесь нашим приложением! 
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white border-0 rounded-xl font-medium shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105"
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  )
}

export default CreatorModal
