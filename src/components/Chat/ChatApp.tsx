'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import ChatList from './ChatList'
import ChatInterface from './ChatInterface'
import FavoritesChat from './FavoritesChat'
import CreateChatModal from './CreateChatModal'
import ChatContextMenu from './ChatContextMenu'
import { RandomFact } from '@/components/ui/random-fact'
import { UserCounter } from '@/components/ui/user-counter'
import { Chat as ChatInterfaceChat } from './ChatInterface/types'

interface Chat {
  id: string
  type: 'private' | 'group' | 'favorites'
  name: string
  avatar_url?: string
  last_message?: string
  last_message_at?: string
  last_message_sender_id?: string
  last_message_sender_name?: string
  unread_count?: number
  other_participant_id?: string
  other_participant_name?: string
  other_participant_avatar?: string
  other_participant_is_creator?: boolean
  other_participant_status?: string
  other_participant_last_seen?: string
  created_at?: string
  updated_at?: string
}

interface ChatAppProps {
  autoOpenChatId?: string // ID чата для автоматического открытия
  onResetChat?: () => void // Callback для сброса состояния чата
  resetTrigger?: number // Триггер для принудительного сброса состояния
  isInCall?: boolean // Флаг, указывающий что пользователь в звонке
  onCurrentChatChange?: (chatId: string | null) => void // Callback для отслеживания активного чата
  layout?: 'mobile' | 'desktop' // Режим отображения
}

const ChatApp = ({ autoOpenChatId, onResetChat, resetTrigger, isInCall, onCurrentChatChange, layout = 'mobile' }: ChatAppProps = {}) => {
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isLoading, setIsLoading] = useState(!!autoOpenChatId) // Простая логика загрузки
  const [chatsUpdateTrigger] = useState(0) // Триггер для обновления списка чатов

  // Состояние для контекстного меню чатов
  const [contextMenu, setContextMenu] = useState<{
    chatId: string
    chatName: string
    position: { x: number; y: number }
    isArchived: boolean
  } | null>(null)

  const chatListRef = useRef<React.ComponentRef<typeof ChatList>>(null)

  // Ref для debouncing сохранения в localStorage
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 🔥 УБРАНА ГЛОБАЛЬНАЯ СИСТЕМА: const { registerRefreshCallback } = useChatSyncStore()

  // 🔥 УБРАНА ГЛОБАЛЬНАЯ СИСТЕМА: Теперь ChatList использует прямые подписки
  // Каждый компонент имеет свою независимую прямую подписку на изменения БД

  // Обработчики контекстного меню
  const handleContextMenu = (chatId: string, chatName: string, position: { x: number; y: number }, isArchived: boolean) => {
    setContextMenu({ chatId, chatName, position, isArchived })
  }

  const handleCloseContextMenu = () => {
    setContextMenu(null)
  }


  const handleSelectChatFromContext = () => {
    if (contextMenu) {
      // Найдем чат по ID и выберем его
      // Это можно реализовать через callback из ChatList
      console.log('Выбор чата из контекстного меню:', contextMenu.chatId)
    }
    setContextMenu(null)
  }

  // Уведомляем систему звуков об изменении активного чата
  useEffect(() => {
    if (onCurrentChatChange) {
      onCurrentChatChange(selectedChat?.id || null)
      console.log('💬 Активный чат изменился:', selectedChat?.id?.slice(0, 8) || 'нет')
    }
  }, [selectedChat?.id, onCurrentChatChange])

  // Функция для сброса состояния чата
  const resetChatState = useCallback(() => {
    console.log('🔄 RESET CHAT STATE - Сброс состояния чата')
    setSelectedChat(null)
    setShowCreateModal(false)
    setIsLoading(false)

    // Уведомляем родительский компонент
    if (onCurrentChatChange) {
      onCurrentChatChange(null)
      console.log('📞 ChatApp уведомил onCurrentChatChange о сбросе состояния')
    }

    // Очищаем localStorage
    try {
      localStorage.removeItem('selectedChatId')
      localStorage.removeItem('selectedChatName')
      localStorage.removeItem('selectedChatTimestamp')
      console.log('💾 RESET CHAT STATE - localStorage очищен')
    } catch (error) {
      console.error('💾 RESET CHAT STATE - Ошибка очистки localStorage:', error)
    }

    // Вызываем callback если он есть
    if (onResetChat) {
      onResetChat()
    }
  }, [onCurrentChatChange, onResetChat])
  
  // Debounced функция для сохранения в localStorage
  const debouncedSaveToLocalStorage = (chat: Chat) => {
    // Очищаем предыдущий таймер
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    // Устанавливаем новый таймер на 300ms
    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem('selectedChatId', chat.id)
        localStorage.setItem('selectedChatName', chat.name)
        localStorage.setItem('selectedChatTimestamp', new Date().toISOString())
        console.log('💾 DEBOUNCED SAVE - Чат сохранен с задержкой:', {
          chatId: chat.id,
          chatName: chat.name
        })
      } catch (error) {
        console.error('💾 DEBOUNCED SAVE - Ошибка сохранения:', error)
      }
    }, 300)
  }

  // ПРОСТАЯ логика восстановления чата
  useEffect(() => {
    if (autoOpenChatId) {
      console.log('🔄 ПРОСТОЕ РЕШЕНИЕ - Открываем чат после звонка:', autoOpenChatId)
      setIsLoading(true)
      
      // Быстрая попытка найти и открыть чат
      const tryFindChat = async () => {
        console.log('🔄 FAST CHAT OPEN - Пытаемся быстро открыть чат:', autoOpenChatId)
        
        if (chatListRef.current?.findAndSelectChat) {
          try {
            const chat = await chatListRef.current.findAndSelectChat(autoOpenChatId)
            
            if (chat) {
              console.log('✅ FAST CHAT OPEN - Чат найден и открыт:', chat.name)
              setSelectedChat(chat)
              localStorage.setItem('selectedChatId', chat.id)
            } else {
              console.log('⚠️ FAST CHAT OPEN - Чат не найден')
            }
            setIsLoading(false)
          } catch (error) {
            console.log('❌ FAST CHAT OPEN - Ошибка поиска чата:', error)
            setIsLoading(false)
          }
        } else {
          // Короткая задержка если ChatList не готов
          console.log('⏳ FAST CHAT OPEN - ChatList не готов, короткая задержка...')
          setTimeout(tryFindChat, 200)
        }
      }
      
      // Запускаем сразу без задержки
      tryFindChat()
    } else {
      // Восстановление из localStorage ТОЛЬКО если нет autoOpenChatId
      console.log('💾 CHAT APP - Нет autoOpenChatId, проверяем localStorage для восстановления')
      
      try {
        const savedChatId = localStorage.getItem('selectedChatId')
        const savedChatName = localStorage.getItem('selectedChatName')
        const savedTimestamp = localStorage.getItem('selectedChatTimestamp')
        
        console.log('💾 CHAT APP - Данные из localStorage:', {
          savedChatId,
          savedChatName,
          savedTimestamp,
          hasValidData: !!savedChatId
        })
        
        if (savedChatId && chatListRef.current?.findAndSelectChat) {
          console.log('🔄 CHAT APP - Пытаемся восстановить чат из localStorage:', savedChatId)
          
          chatListRef.current.findAndSelectChat(savedChatId)
            .then((chat: Chat | null) => {
              if (chat) {
                console.log('✅ CHAT APP - Чат успешно восстановлен из localStorage:', {
                  chatId: chat.id,
                  chatName: chat.name,
                  fromStorage: savedChatName
                })
                setSelectedChat(chat)
              } else {
                console.log('⚠️ CHAT APP - Сохраненный чат не найден, очищаем localStorage')
                localStorage.removeItem('selectedChatId')
                localStorage.removeItem('selectedChatName')
                localStorage.removeItem('selectedChatTimestamp')
              }
            })
            .catch((error: unknown) => {
              console.error('❌ CHAT APP - Ошибка восстановления чата из localStorage:', error)
              localStorage.removeItem('selectedChatId')
              localStorage.removeItem('selectedChatName')
              localStorage.removeItem('selectedChatTimestamp')
            })
        }
      } catch (error) {
        console.error('💾 CHAT APP - Ошибка чтения localStorage:', error)
      }
    }
  }, [autoOpenChatId])

  // Effect для обработки внешнего сброса чата по триггеру
  useEffect(() => {
    if (resetTrigger && resetTrigger > 0) {
      console.log('🔄 EXTERNAL RESET - Триггер сброса чата активирован:', resetTrigger)
      resetChatState()
    }
  }, [resetTrigger, resetChatState])

  // ПРОСТОЙ слушатель удаления чата
  useEffect(() => {
    const handleChatDeleted = (event: CustomEvent) => {
      const { chatId } = event.detail
      console.log('📨 ChatApp получил событие chatDeleted для ID:', chatId)
      console.log('🔍 selectedChat.id:', selectedChat?.id)
      console.log('🔍 selectedChat.name:', selectedChat?.name)
      console.log('🔍 hasSelectedChat:', !!selectedChat)
      console.log('🔍 idsMatch:', selectedChat?.id === chatId)
      console.log('🔍 willReset:', selectedChat && selectedChat.id === chatId)
      
      // Если удаленный чат совпадает с выбранным - сбрасываем на главную
      if (selectedChat && selectedChat.id === chatId) {
        console.log('🔄 СБРАСЫВАЕМ selectedChat на null')
        setSelectedChat(null)
        // Очищаем localStorage
        localStorage.removeItem('selectedChatId')
        localStorage.removeItem('selectedChatName') 
        localStorage.removeItem('selectedChatTimestamp')
        // Уведомляем родительский компонент
        if (onCurrentChatChange) {
          onCurrentChatChange(null)
          console.log('📞 ChatApp уведомил onCurrentChatChange о сбросе чата')
        }
        console.log('✅ selectedChat сброшен на главную страницу')
      } else {
        console.log('⏭️ Не сбрасываем - другой чат или чат не выбран')
      }
    }

    console.log('👂 ChatApp начал слушать событие chatDeleted')
    window.addEventListener('chatDeleted', handleChatDeleted as EventListener)
    return () => {
      console.log('👋 ChatApp перестал слушать событие chatDeleted')
      window.removeEventListener('chatDeleted', handleChatDeleted as EventListener)
    }
  }, [selectedChat, onCurrentChatChange])

  // СЛУШАТЕЛЬ удаления чата ДРУГИМИ пользователями (для всех)
  useEffect(() => {
    const handleChatDeletedForAll = (event: CustomEvent) => {
      const { chatId } = event.detail
      console.log('💣 ChatApp получил событие chatDeletedForAll для ID:', chatId)
      console.log('🔍 selectedChat.id:', selectedChat?.id)
      console.log('🔍 idsMatch:', selectedChat?.id === chatId)
      
      // Если удаленный чат совпадает с выбранным - сбрасываем на главную
      if (selectedChat && selectedChat.id === chatId) {
        console.log('💣 СБРАСЫВАЕМ selectedChat на null (удален другим пользователем)')
        setSelectedChat(null)
        // Очищаем localStorage
        localStorage.removeItem('selectedChatId')
        localStorage.removeItem('selectedChatName') 
        localStorage.removeItem('selectedChatTimestamp')
        // Уведомляем родительский компонент
        if (onCurrentChatChange) {
          onCurrentChatChange(null)
          console.log('📞 ChatApp уведомил onCurrentChatChange о сбросе чата (удален для всех)')
        }
        console.log('✅ selectedChat сброшен на главную страницу (чат удален для всех)')
      } else {
        console.log('⏭️ Не сбрасываем - другой чат или чат не выбран (для всех)')
      }
    }

    console.log('👂 ChatApp начал слушать событие chatDeletedForAll')
    window.addEventListener('chatDeletedForAll', handleChatDeletedForAll as EventListener)
    return () => {
      console.log('👋 ChatApp перестал слушать событие chatDeletedForAll')
      window.removeEventListener('chatDeletedForAll', handleChatDeletedForAll as EventListener)
    }
  }, [selectedChat, onCurrentChatChange])

  // Очистка таймера при размонтировании компонента
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  const handleChatSelect = (chat: Chat) => {
    console.log('🎯 ChatApp.handleChatSelect ВЫЗВАН для чата:', chat.id)
    console.log('💾 CHAT APP - Выбран чат для сохранения:', {
      chatId: chat.id,
      chatName: chat.name,
      chatType: chat.type,
      timestamp: new Date().toISOString()
    })
    
    // Мгновенно обновляем UI
    setSelectedChat(chat)
    console.log('✅ ChatApp.setSelectedChat установлен на:', chat.id, 'тип:', chat.type)
    
    // Уведомляем родительский компонент
    if (onCurrentChatChange) {
      onCurrentChatChange(chat.id)
      console.log('📞 ChatApp уведомил onCurrentChatChange о чате:', chat.id)
    }
    
    // Сохраняем в localStorage с debouncing для оптимизации (кроме избранного)
    if (chat.type !== 'favorites') {
      debouncedSaveToLocalStorage(chat)
    } else {
      console.log('⭐ Избранное не сохраняется в localStorage')
    }
  }

  const handleBackToList = () => {
    console.log('💾 CHAT APP - Очищаем выбранный чат из localStorage')
    
    try {
      localStorage.removeItem('selectedChatId')
      localStorage.removeItem('selectedChatName')
      localStorage.removeItem('selectedChatTimestamp')
      console.log('💾 CHAT APP - localStorage успешно очищен')
    } catch (error) {
      console.error('💾 CHAT APP - Ошибка очистки localStorage:', error)
    }
    
    setSelectedChat(null)
    
    // Уведомляем родительский компонент
    if (onCurrentChatChange) {
      onCurrentChatChange(null)
      console.log('📞 ChatApp уведомил onCurrentChatChange о возврате к списку')
    }
  }

  // Удалили сложную логику - теперь используем простую выше

  const handleCreateNewChat = () => {
    setShowCreateModal(true)
  }

  const handleChatCreated = async (chatId: string) => {
    console.log('Чат создан:', chatId)
    setShowCreateModal(false)
    
    // Принудительно обновляем список чатов
    // Используем рефреш-функцию из ChatList
    if (chatListRef.current?.refreshChats) {
      await chatListRef.current.refreshChats()
    }
    
    // Автоматически выбираем созданный чат
    // Ищем его в обновленном списке и выбираем
    setTimeout(async () => {
      if (chatListRef.current?.findAndSelectChat) {
        const chat = await chatListRef.current.findAndSelectChat(chatId)
        if (chat) {
          setSelectedChat(chat)
          // Уведомляем родительский компонент
          if (onCurrentChatChange) {
            onCurrentChatChange(chat.id)
            console.log('📞 ChatApp уведомил onCurrentChatChange о новом чате:', chat.id)
          }
        }
      }
    }, 500)
  }

  // ПРОСТОЙ загрузочный экран только при автоматическом открытии чата
  if (isLoading && autoOpenChatId) {
    return (
      <div className="h-full flex items-center justify-center bg-muted">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Открываем чат...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${layout === 'desktop' ? 'h-full w-full' : 'h-full'} flex bg-muted overflow-hidden`}>
      {/* Мобильная версия - ChatList всегда смонтирован для получения уведомлений */}
      <div className={layout === 'mobile' ? "flex-1 overflow-hidden" : "hidden"}>
        {/* ChatList всегда смонтирован, но скрыт когда пользователь в чате */}
        <div className={`${selectedChat ? 'hidden' : 'block'} bg-card h-full`}>
          <ChatList
            ref={chatListRef}
            onChatSelect={handleChatSelect}
            onCreateNewChat={handleCreateNewChat}
            selectedChatId={undefined}
            externalUpdateTrigger={chatsUpdateTrigger}
            onContextMenu={handleContextMenu}
          />
        </div>

        {/* ChatInterface или FavoritesChat показывается когда выбран чат */}
        {selectedChat && (
          selectedChat.type === 'favorites' ? (
            <FavoritesChat
              onBack={handleBackToList}
              isActive={true}
            />
          ) : (
            <ChatInterface
              chat={selectedChat as ChatInterfaceChat}
              onBack={handleBackToList}
              isInCall={isInCall}
              hasUnreadMessages={(selectedChat.unread_count || 0) > 0}
            />
          )
        )}
      </div>


      {/* Десктопная версия - всегда показываем оба компонента */}
      <div className={layout === 'desktop' ? "flex w-full overflow-hidden" : "hidden md:flex w-full overflow-hidden"}>
        {/* Левая панель - список чатов */}
        <div className="w-80 bg-card border-r border-border flex-shrink-0 overflow-hidden">
          <ChatList
            ref={chatListRef}
            onChatSelect={handleChatSelect}
            onCreateNewChat={handleCreateNewChat}
            selectedChatId={selectedChat?.id}
            externalUpdateTrigger={chatsUpdateTrigger}
            onContextMenu={handleContextMenu}
          />
        </div>

        {/* Правая панель - интерфейс чата */}
        <div className="flex-1 bg-background overflow-hidden">
          {selectedChat ? (
            selectedChat.type === 'favorites' ? (
              <FavoritesChat
                onBack={handleBackToList}
                isActive={true}
              />
            ) : (
              <ChatInterface
                chat={selectedChat as ChatInterfaceChat}
                onBack={handleBackToList}
                isInCall={isInCall}
                hasUnreadMessages={(selectedChat.unread_count || 0) > 0}
              />
            )
          ) : (
            <div className="h-full flex items-center justify-center p-4 chat-pattern-bg">
              <div className="text-center max-w-md">
                <div className="bg-card/80 backdrop-blur-sm rounded-lg p-6 border border-border/50 mb-4">
                  <svg className="w-12 h-12 mx-auto text-muted-foreground mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <h3 className="text-lg font-medium text-foreground mb-2">Выберите чат</h3>
                  <p className="text-muted-foreground text-sm">Выберите чат из списка или создайте новый</p>
                </div>
                {/* RandomFact и UserCounter */}
                <div>
                  <RandomFact />
                  <UserCounter />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Модал создания чата */}
      <CreateChatModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          // Восстанавливаем фокус на чат после закрытия модального окна
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('restoreChatFocus'))
          }, 100)
        }}
        onChatCreated={handleChatCreated}
      />

      {/* Контекстное меню */}
      {contextMenu && (
        <ChatContextMenu
          chatId={contextMenu.chatId}
          chatName={contextMenu.chatName}
          position={contextMenu.position}
          onClose={handleCloseContextMenu}
          onSelectChat={handleSelectChatFromContext}
          isArchived={contextMenu.isArchived}
        />
      )}

    </div>
  )
}

export default ChatApp
