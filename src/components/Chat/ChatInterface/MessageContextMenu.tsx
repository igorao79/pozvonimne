import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
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

  // Обработчик клика вне меню и предотвращение скроллинга
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeMenu()
      }
    }

    // Предотвращение скроллинга при открытом меню
    const preventScroll = (e: Event) => {
      e.preventDefault()
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)

      // Блокируем скролл колесиком мыши и touch события
      document.addEventListener('wheel', preventScroll, { passive: false })
      document.addEventListener('touchmove', preventScroll, { passive: false })

      // Добавляем стили для предотвращения скроллинга
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      document.removeEventListener('wheel', preventScroll)
      document.removeEventListener('touchmove', preventScroll)

      // Восстанавливаем возможность скроллинга
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Если пользователь не может редактировать или удалять сообщение, просто возвращаем children
  if (!canEdit && !canDelete) {
    return <>{children}</>
  }

  // Функция для вычисления оптимальной позиции меню
  const calculateMenuPosition = (clickX: number, clickY: number) => {
    const menuWidth = 192 // min-w-48 = 192px
    const menuHeight = canEdit && canDelete ? 88 : 44 // высота с учетом количества элементов
    const padding = 16 // отступ от краев экрана
    const offset = 8 // отступ от курсора

    const screenWidth = window.innerWidth
    const screenHeight = window.innerHeight

    let x = clickX
    let y = clickY

    // Интеллектуальное позиционирование по горизонтали
    const spaceRight = screenWidth - clickX
    const spaceLeft = clickX

    if (spaceRight >= menuWidth + padding) {
      // Есть место справа - показываем справа от курсора
      x = clickX + offset
    } else if (spaceLeft >= menuWidth + padding) {
      // Места справа нет, но есть слева - показываем слева от курсора
      x = clickX - menuWidth - offset
    } else {
      // Мало места с обеих сторон - центрируем с отступом
      x = Math.max(padding, Math.min(screenWidth - menuWidth - padding, clickX - menuWidth / 2))
    }

    // Интеллектуальное позиционирование по вертикали
    const spaceBelow = screenHeight - clickY
    const spaceAbove = clickY

    if (spaceBelow >= menuHeight + padding) {
      // Есть место снизу - показываем ниже курсора
      y = clickY + offset
    } else if (spaceAbove >= menuHeight + padding) {
      // Места снизу нет, но есть сверху - показываем выше курсора
      y = clickY - menuHeight - offset
    } else {
      // Мало места сверху и снизу - размещаем с максимальным доступным пространством
      if (spaceBelow > spaceAbove) {
        y = Math.min(clickY + offset, screenHeight - menuHeight - padding)
      } else {
        y = Math.max(padding, clickY - menuHeight - offset)
      }
    }

    // Финальные проверки границ
    x = Math.max(padding, Math.min(x, screenWidth - menuWidth - padding))
    y = Math.max(padding, Math.min(y, screenHeight - menuHeight - padding))

    return { x, y }
  }

  // Обработчик правого клика
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const position = calculateMenuPosition(e.clientX, e.clientY)
    setMenuPosition(position)
    setIsOpen(true)
  }

  // Обработчик долгого нажатия для мобильных устройств
  const handleTouchStart = (e: React.TouchEvent) => {
    const timer = setTimeout(() => {
      const touch = e.touches[0]
      if (touch) {
        const position = calculateMenuPosition(touch.clientX, touch.clientY)
        setMenuPosition(position)
        setIsOpen(true)
      }
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

      {/* Контекстное меню через портал */}
      {isOpen && createPortal(
        <>
          {/* Фоновая подложка для перехвата кликов */}
          <div
            className="fixed inset-0 z-[9998] bg-transparent"
            onClick={closeMenu}
          />

          {/* Контекстное меню */}
          <div
            ref={menuRef}
            className="fixed z-[9999] bg-background border border-border rounded-lg shadow-lg py-1 min-w-48 animate-in fade-in-0 zoom-in-95 duration-150"
            style={{
              left: `${menuPosition.x}px`,
              top: `${menuPosition.y}px`
            }}
          >
            {canEdit && (
              <button
                onClick={handleEdit}
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted hover:ring-1 hover:ring-muted/50 dark:hover:bg-slate-700 dark:hover:ring-slate-500 transition-all duration-200 cursor-pointer flex items-center gap-2 rounded"
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
                className="w-full px-3 py-2 text-left text-sm hover:bg-destructive/10 hover:ring-1 hover:ring-destructive/30 transition-all duration-200 cursor-pointer flex items-center gap-2 text-destructive rounded"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Удалить
              </button>
            )}
          </div>

          {/* Затемнение фона при открытом меню на мобильных устройствах */}
          <div
            className="fixed inset-0 bg-black/20 z-[9997] md:hidden"
            onClick={closeMenu}
          />
        </>,
        document.body
      )}
    </div>
  )
}
