'use client'

import React from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  restrictToVerticalAxis,
  restrictToParentElement,
} from '@dnd-kit/modifiers'
import { PinnedChatItem } from './PinnedChatItem'
import { usePinnedChats } from '@/hooks/usePinnedChats'
import { Chat } from '@/types/chat'

interface PinnedChatsListProps {
  chats: Chat[]
  selectedChatId?: string
  onChatSelect: (chat: Chat) => void
  formatLastMessageTime: (timestamp?: string) => string
  truncateText: (text: string, maxLength?: number) => string
  onContextMenu: (chatId: string, chatName: string, position: { x: number; y: number }) => void
  hasArchivedChats?: boolean
  archivedChatsCount?: number
  onShowArchive?: () => void
  showArchiveView?: boolean
  hideArchive?: boolean
}

export const PinnedChatsList: React.FC<PinnedChatsListProps> = ({
  chats,
  selectedChatId,
  onChatSelect,
  formatLastMessageTime,
  truncateText,
  onContextMenu,
  hasArchivedChats = false,
  archivedChatsCount = 0,
  onShowArchive,
  showArchiveView = false,
  hideArchive = false
}) => {
  const { pinnedChats, reorderPinnedChats, getPinnedChatsCount } = usePinnedChats()

  // Настройка сенсоров для drag & drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Минимальное расстояние для активации перетаскивания
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Фильтруем только закрепленные чаты в правильном порядке
  const pinnedChatObjects = React.useMemo(() => {
    const result = pinnedChats
      .map(pinnedId => chats.find(chat => chat.id === pinnedId))
      .filter((chat): chat is Chat => chat !== undefined)
    
    console.log('📌 PinnedChatsList: Обновление списка закрепленных чатов', {
      pinnedChatsIds: pinnedChats.map(id => id.slice(0, 8)),
      foundChats: result.length,
      chatsAvailable: chats.length,
      timestamp: new Date().toLocaleTimeString()
    })
    
    return result
  }, [pinnedChats, chats])

  // Обработчик завершения перетаскивания
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = pinnedChats.indexOf(active.id as string)
      const newIndex = pinnedChats.indexOf(over.id as string)

      if (oldIndex !== -1 && newIndex !== -1) {
        try {
          console.log('📌 Drag & Drop: Начинаем изменение порядка чатов:', `${oldIndex} -> ${newIndex}`)
          const success = await reorderPinnedChats(oldIndex, newIndex)
          
          if (success) {
            console.log('✅ Drag & Drop: Порядок чатов успешно изменен')
          } else {
            console.error('❌ Drag & Drop: Ошибка изменения порядка чатов')
          }
        } catch (error) {
          console.error('📌 Drag & Drop: Критическая ошибка при изменении порядка:', error)
        }
      }
    }
  }

  // Если нет закрепленных чатов, не отображаем секцию
  if (pinnedChatObjects.length === 0) {
    return null
  }

  return (
    <div className="border-b border-border/30">
      {/* Заголовок секции закрепленных чатов */}
      <div className="px-2 py-1 bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <svg 
              className="w-3 h-3 text-muted-foreground" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" 
              />
            </svg>
            <span className="text-xs font-medium text-muted-foreground">
              Закрепленные
            </span>
          </div>
          <span className="text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5">
            {getPinnedChatsCount()}
          </span>
        </div>
      </div>

      {/* Список закрепленных чатов с drag & drop */}
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      >
        <SortableContext 
          items={pinnedChats}
          strategy={verticalListSortingStrategy}
        >
          <div className="divide-y divide-border/30">
            {pinnedChatObjects.map((chat) => (
              <PinnedChatItem
                key={chat.id}
                chat={chat}
                onClick={() => onChatSelect(chat)}
                isSelected={selectedChatId === chat.id}
                formatLastMessageTime={formatLastMessageTime}
                truncateText={truncateText}
                onContextMenu={onContextMenu}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Подсказка о drag & drop */}
      {pinnedChatObjects.length > 1 && (
        <div className="px-2 py-1">
          <p className="text-xs text-muted-foreground/70 text-center">
            💡 Перетащите чтобы изменить порядок
          </p>
        </div>
      )}

      {/* Элемент "Архив" */}
      {((hasArchivedChats && !showArchiveView && !hideArchive) || showArchiveView) && onShowArchive && (
        <div className="border-t border-border">
          <button
            onClick={onShowArchive}
            className="w-full px-3 py-3 hover:bg-accent/50 transition-colors text-left flex items-center space-x-3"
          >
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              {showArchiveView ? (
                <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground truncate">
                  {showArchiveView ? 'Вернуться к обычным чатам' : 'Архив'}
                </p>
                {!showArchiveView && (
                  <span className="text-xs text-muted-foreground">{archivedChatsCount}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {showArchiveView ? 'Показать все активные разговоры' : 'Архивированные чаты'}
              </p>
            </div>
          </button>
        </div>
      )}
    </div>
  )
}

export default PinnedChatsList
