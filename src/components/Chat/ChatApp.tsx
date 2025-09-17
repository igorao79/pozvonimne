'use client'

import { useState, useRef, useEffect } from 'react'
import ChatList from './ChatList'
import ChatInterface from './ChatInterface'
import CreateChatModal from './CreateChatModal'

interface Chat {
  id: string
  type: 'private' | 'group'
  name: string
  avatar_url?: string
  last_message?: string
  last_message_at?: string
  last_message_sender_name?: string
  unread_count: number
  other_participant_id?: string
  other_participant_name?: string
  other_participant_avatar?: string
  created_at: string
}

interface ChatAppProps {
  autoOpenChatId?: string // ID чата для автоматического открытия
}

const ChatApp = ({ autoOpenChatId }: ChatAppProps = {}) => {
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isLoading, setIsLoading] = useState(!!autoOpenChatId) // Простая логика загрузки
  const chatListRef = useRef<any>(null)
  
  // Ref для debouncing сохранения в localStorage
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
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

  // Очистка таймера при размонтировании компонента
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  const handleChatSelect = (chat: Chat) => {
    console.log('💾 CHAT APP - Выбран чат для сохранения:', {
      chatId: chat.id,
      chatName: chat.name,
      timestamp: new Date().toISOString()
    })
    
    // Мгновенно обновляем UI
    setSelectedChat(chat)
    
    // Сохраняем в localStorage с debouncing для оптимизации
    debouncedSaveToLocalStorage(chat)
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
    <div className="h-full flex bg-muted overflow-hidden">
      {/* Мобильная версия - показываем либо список, либо чат */}
      <div className="flex-1 md:hidden overflow-hidden">
        {selectedChat ? (
          <ChatInterface
            chat={selectedChat}
            onBack={handleBackToList}
          />
        ) : (
          <div className="bg-card h-full overflow-hidden">
            <ChatList
              ref={chatListRef}
              onChatSelect={handleChatSelect}
              onCreateNewChat={handleCreateNewChat}
              selectedChatId={undefined}
            />
          </div>
        )}
      </div>

      {/* Десктопная версия - показываем оба компонента */}
      <div className="hidden md:flex w-full overflow-hidden">
        {/* Левая панель - список чатов */}
        <div className="w-80 bg-card border-r border-border flex-shrink-0 overflow-hidden">
          <ChatList
            ref={chatListRef}
            onChatSelect={handleChatSelect}
            onCreateNewChat={handleCreateNewChat}
            selectedChatId={selectedChat?.id}
          />
        </div>

        {/* Правая панель - интерфейс чата */}
        <div className="flex-1 bg-background overflow-hidden">
          {selectedChat ? (
            <ChatInterface
              chat={selectedChat}
              onBack={handleBackToList}
            />
          ) : (
            <div className="h-full flex items-center justify-center p-4 chat-pattern-bg">
              <div className="text-center max-w-md bg-card/80 backdrop-blur-sm rounded-lg p-6 border border-border/50">
                <svg className="w-12 h-12 mx-auto text-muted-foreground mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <h3 className="text-lg font-medium text-foreground mb-2">Выберите чат</h3>
                <p className="text-muted-foreground text-sm">Выберите чат из списка или создайте новый</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Модал создания чата */}
      <CreateChatModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onChatCreated={handleChatCreated}
      />

    </div>
  )
}

export default ChatApp
