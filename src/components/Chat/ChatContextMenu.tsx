'use client'

import React, { useEffect, useRef } from 'react'
import { Pin, PinOff, MessageSquare, Archive } from 'lucide-react'
import { usePinnedChats } from '@/hooks/usePinnedChats'

interface ChatContextMenuProps {
  chatId: string
  chatName: string
  position: { x: number; y: number }
  onClose: () => void
  onSelectChat?: () => void
}

export const ChatContextMenu: React.FC<ChatContextMenuProps> = ({
  chatId,
  chatName,
  position,
  onClose,
  onSelectChat
}) => {
  const menuRef = useRef<HTMLDivElement>(null)
  const { isPinned, pinChat, unpinChat } = usePinnedChats()
  const chatIsPinned = isPinned(chatId)

  // Закрываем меню при клике вне его области
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    // Небольшая задержка чтобы избежать немедленного закрытия
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }, 100)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  // Обработчик закрепления/открепления
  const handleTogglePin = async () => {
    try {
      let success = false
      if (chatIsPinned) {
        success = await unpinChat(chatId)
      } else {
        success = await pinChat(chatId)
      }
      
      if (success) {
        console.log('📌 Операция успешно выполнена:', chatIsPinned ? 'открепление' : 'закрепление')
      } else {
        console.error('📌 Ошибка выполнения операции:', chatIsPinned ? 'открепление' : 'закрепление')
      }
    } catch (error) {
      console.error('📌 Критическая ошибка при изменении закрепления:', error)
    }
    
    onClose()
  }

  // Обработчик перехода к чату
  const handleGoToChat = () => {
    onSelectChat?.()
    onClose()
  }

  // Определяем позицию меню чтобы оно не выходило за пределы экрана
  const adjustedPosition = React.useMemo(() => {
    const menuWidth = 200 // Предполагаемая ширина меню
    const menuHeight = 120 // Предполагаемая высота меню
    
    let x = position.x
    let y = position.y

    // Проверяем не выходит ли меню за правую границу экрана
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10
    }

    // Проверяем не выходит ли меню за нижнюю границу экрана
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10
    }

    // Не даем меню выходить за левую и верхнюю границы
    x = Math.max(10, x)
    y = Math.max(10, y)

    return { x, y }
  }, [position])

  return (
    <>
      {/* Фоновая подложка для перехвата кликов */}
      <div
        className="fixed inset-0 z-40 bg-transparent"
        onClick={onClose}
      />
      
      {/* Контекстное меню */}
      <div
        ref={menuRef}
        className="fixed z-50 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[180px] animate-in fade-in-0 zoom-in-95 duration-150"
        style={{
          left: `${adjustedPosition.x}px`,
          top: `${adjustedPosition.y}px`,
        }}
      >
        {/* Заголовок меню */}
        <div className="px-3 py-1.5 border-b border-border/50">
          <p className="text-xs text-muted-foreground truncate font-medium">
            {chatName}
          </p>
        </div>

        {/* Опции меню */}
        <div className="py-1">
          {/* Закрепить/Открепить */}
          <button
            onClick={handleTogglePin}
            className="w-full flex items-center px-3 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            {chatIsPinned ? (
              <>
                <PinOff className="w-4 h-4 mr-2" />
                Открепить чат
              </>
            ) : (
              <>
                <Pin className="w-4 h-4 mr-2" />
                Закрепить чат
              </>
            )}
          </button>

          {/* Перейти к чату */}
          <button
            onClick={handleGoToChat}
            className="w-full flex items-center px-3 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Открыть чат
          </button>

          {/* Разделитель */}
          <div className="h-px bg-border/50 mx-2 my-1" />

          {/* Дополнительные опции (пока заглушки) */}
          <button
            onClick={onClose}
            className="w-full flex items-center px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors opacity-50 cursor-not-allowed"
            disabled
          >
            <Archive className="w-4 h-4 mr-2" />
            Архивировать
          </button>
        </div>
      </div>
    </>
  )
}

export default ChatContextMenu
