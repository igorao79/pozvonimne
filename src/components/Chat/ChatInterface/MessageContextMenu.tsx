import React, { useState, useRef, useEffect } from 'react'
import { Message } from './types'

interface MessageContextMenuProps {
  message: Message
  userId?: string
  onEdit?: (messageId: string, currentContent: string) => void
  onDelete?: (messageId: string) => void
  children: React.ReactNode
}

export const MessageContextMenu: React.FC<MessageContextMenuProps> = ({
  message,
  userId,
  onEdit,
  onDelete,
  children
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })
  const menuRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Проверяем, является ли сообщение собственным и не удаленным
  const isOwnMessage = message.sender_id === userId
  const canEdit = isOwnMessage && !message.is_deleted && message.type === 'text'
  const canDelete = isOwnMessage && !message.is_deleted

  // Если пользователь не может редактировать или удалять сообщение, просто возвращаем children
  if (!canEdit && !canDelete) {
    return <>{children}</>
  }

  // Обработчик правого клика
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const rect = containerRef.current?.getBoundingClientRect()
    if (rect) {
      setMenuPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
    }
    setIsOpen(true)
  }

  // Обработчик долгого нажатия для мобильных устройств
  const handleTouchStart = () => {
    const timer = setTimeout(() => {
      setIsOpen(true)
      // Для мобильных устройств показываем меню в центре
      setMenuPosition({ x: 50, y: 50 })
    }, 500)

    const handleTouchEnd = () => {
      clearTimeout(timer)
    }

    document.addEventListener('touchend', handleTouchEnd, { once: true })
  }

  // Закрытие меню
  const closeMenu = () => {
    setIsOpen(false)
  }

  // Обработчик клика вне меню
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeMenu()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleTouchStart)
    }
  }, [isOpen])

  // Обработчик редактирования
  const handleEdit = () => {
    if (onEdit) {
      onEdit(message.id, message.content)
    }
    closeMenu()
  }

  // Обработчик удаления
  const handleDelete = () => {
    if (onDelete) {
      onDelete(message.id)
    }
    closeMenu()
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Основной контент сообщения */}
      <div
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        className="cursor-context-menu"
      >
        {children}
      </div>

      {/* Контекстное меню */}
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute z-50 bg-background border border-border rounded-lg shadow-lg py-1 min-w-48"
          style={{
            left: `${menuPosition.x}px`,
            top: `${menuPosition.y}px`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          {canEdit && (
            <button
              onClick={handleEdit}
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Редактировать
            </button>
          )}

          {canDelete && (
            <button
              onClick={handleDelete}
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2 text-destructive"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Удалить
            </button>
          )}
        </div>
      )}

      {/* Затемнение фона при открытом меню на мобильных устройствах */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={closeMenu}
        />
      )}
    </div>
  )
}
