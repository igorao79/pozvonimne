'use client'

import { useState, useRef } from 'react'
import ChatList from './ChatList'
import ChatInterface from './ChatInterface'
import CreateChatModal from './CreateChatModal'
import RealtimeTest from './RealtimeTest'

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

const ChatApp = () => {
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const chatListRef = useRef<any>(null)

  const handleChatSelect = (chat: Chat) => {
    setSelectedChat(chat)
  }

  const handleBackToList = () => {
    setSelectedChat(null)
  }

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

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Мобильная версия - показываем либо список, либо чат */}
      <div className="flex-1 md:hidden">
        {selectedChat ? (
          <ChatInterface 
            chat={selectedChat} 
            onBack={handleBackToList}
          />
        ) : (
          <div className="bg-white h-full">
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
      <div className="hidden md:flex w-full">
        {/* Левая панель - список чатов */}
        <div className="w-1/3 bg-white border-r">
          <ChatList
            ref={chatListRef}
            onChatSelect={handleChatSelect}
            onCreateNewChat={handleCreateNewChat}
            selectedChatId={selectedChat?.id}
          />
        </div>

        {/* Правая панель - интерфейс чата */}
        <div className="flex-1 bg-gray-50">
          {selectedChat ? (
            <ChatInterface 
              chat={selectedChat} 
              onBack={handleBackToList}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Выберите чат</h3>
                <p className="text-gray-500">Выберите чат из списка или создайте новый</p>
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

      {/* Тестовый компонент для отладки realtime (только в development) */}
      {process.env.NODE_ENV === 'development' && <RealtimeTest />}
    </div>
  )
}

export default ChatApp
