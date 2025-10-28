'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Pin, PinOff, MessageSquare, Archive, ArchiveRestore, Trash2, UserMinus } from 'lucide-react'
import { usePinnedChats } from '@/hooks/usePinnedChats'
import useChatActions from '@/hooks/useChatActions'
import DeleteChatConfirmation from './DeleteChatConfirmation'

interface ChatContextMenuProps {
  chatId: string
  chatName: string
  position: { x: number; y: number }
  onClose: () => void
  onSelectChat?: () => void
  isArchived?: boolean
}

export const ChatContextMenu: React.FC<ChatContextMenuProps> = ({
  chatId,
  chatName,
  position,
  onClose,
  onSelectChat,
  isArchived = false
}) => {
  const menuRef = useRef<HTMLDivElement>(null)
  const { isPinned, pinChat, unpinChat } = usePinnedChats()
  const { archiveChat, deleteChatForSelf, deleteChatForAll, isLoading } = useChatActions()
  const chatIsPinned = isPinned(chatId)
  
  // Состояние для модального окна подтверждения удаления
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)

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

  // Обработчик архивации/разархивации
  const handleArchive = async () => {
    // Оптимистичное обновление UI
    const wasArchived = isArchived
    const willBeArchived = !isArchived

    // Отправляем событие для мгновенного обновления UI
    window.dispatchEvent(new CustomEvent('optimisticArchiveChange', {
      detail: {
        chatId,
        isArchived: willBeArchived,
        timestamp: Date.now()
      }
    }))

    try {
      const success = await archiveChat(chatId, willBeArchived)
      if (success) {
        console.log(`✅ Чат ${willBeArchived ? 'архивирован' : 'разархивирован'}`)
        // Успешно - оставляем оптимистичное обновление
      } else {
        // В случае ошибки откатываем оптимистичное обновление
        console.error('❌ Операция архивирования не удалась')
        window.dispatchEvent(new CustomEvent('rollbackArchiveChange', {
          detail: {
            chatId,
            isArchived: wasArchived,
            timestamp: Date.now()
          }
        }))
      }
    } catch (error) {
      console.error('❌ Ошибка архивации:', error)
      // В случае ошибки откатываем оптимистичное обновление
      window.dispatchEvent(new CustomEvent('rollbackArchiveChange', {
        detail: {
          chatId,
          isArchived: wasArchived,
          timestamp: Date.now()
        }
      }))
    }
    onClose()
  }

  // Обработчик удаления для себя
  const handleDeleteForSelf = async () => {
    try {
      const success = await deleteChatForSelf(chatId)
      if (success) {
        console.log('✅ Чат удален для себя')
      }
    } catch (error) {
      console.error('❌ Ошибка удаления для себя:', error)
    }
    onClose()
  }

  // Обработчик удаления для всех
  const handleDeleteForAll = async () => {
    try {
      const success = await deleteChatForAll(chatId)
      if (success) {
        console.log('✅ Чат удален для всех')
      }
      setShowDeleteConfirmation(false)
    } catch (error) {
      console.error('❌ Ошибка удаления для всех:', error)
    }
    onClose()
  }

  // Позиционирование меню точно в координатах курсора
  const adjustedPosition = React.useMemo(() => {
    return { x: position.x, y: position.y }
  }, [position])

  return (
    <>
      {/* Фоновая подложка для перехвата кликов */}
      <div
        className="fixed inset-0 z-[9998] bg-transparent"
        onClick={onClose}
      />
      
      {/* Контекстное меню */}
      <div
        ref={menuRef}
        className="fixed z-[9999] bg-card border border-border rounded-lg shadow-lg py-1 min-w-[180px] animate-in fade-in-0 zoom-in-95 duration-150"
        style={{
          position: 'fixed',
          left: `${adjustedPosition.x}px`,
          top: `${adjustedPosition.y}px`,
          zIndex: 9999,
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

          {/* Архивировать/Разархивировать */}
          <button
            onClick={handleArchive}
            disabled={isLoading}
            className="w-full flex items-center px-3 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
          >
            {isArchived ? (
              <>
                <ArchiveRestore className="w-4 h-4 mr-2" />
                Разархивировать
              </>
            ) : (
              <>
                <Archive className="w-4 h-4 mr-2" />
                Архивировать
              </>
            )}
          </button>

          {/* Разделитель */}
          <div className="h-px bg-border/50 mx-2 my-1" />

          {/* Удалить для себя */}
          <button
            onClick={handleDeleteForSelf}
            disabled={isLoading}
            className="w-full flex items-center px-3 py-2 text-sm text-orange-600 dark:text-orange-400 hover:bg-accent transition-colors disabled:opacity-50"
          >
            <UserMinus className="w-4 h-4 mr-2" />
            Удалить для себя
          </button>

          {/* Удалить для всех */}
          <button
            onClick={() => setShowDeleteConfirmation(true)}
            disabled={isLoading}
            className="w-full flex items-center px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Удалить для всех
          </button>
        </div>
      </div>
      
      {/* Модальное окно подтверждения удаления */}
      {showDeleteConfirmation && (
        <DeleteChatConfirmation
          chatName={chatName}
          onConfirm={handleDeleteForAll}
          onCancel={() => {
            setShowDeleteConfirmation(false)
            onClose()
          }}
          isDeleting={isLoading}
        />
      )}
    </>
  )
}

export default ChatContextMenu
