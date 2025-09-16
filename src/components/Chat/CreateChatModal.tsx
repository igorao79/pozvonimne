'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import useCallStore from '@/store/useCallStore'
import useUsers from '@/hooks/useUsers'

interface User {
  id: string
  username: string
  display_name: string
  avatar_url?: string
  status?: string
  last_seen?: string | null
}

interface CreateChatModalProps {
  isOpen: boolean
  onClose: () => void
  onChatCreated: (chatId: string) => void
}

const CreateChatModal = ({ isOpen, onClose, onChatCreated }: CreateChatModalProps) => {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { userId } = useCallStore()
  const { users, loading: usersLoading } = useUsers()
  const supabase = createClient()

  // Сброс состояния при открытии/закрытии модала
  useEffect(() => {
    if (isOpen) {
      setSelectedUsers([])
      setSearchQuery('')
      setError(null)
      setCreating(false)
    }
  }, [isOpen])

  // Фильтрация пользователей
  const filteredUsers = users
    .filter(user => user.id !== userId) // Исключаем текущего пользователя
    .filter(user => {
      if (!searchQuery) return true
      const query = searchQuery.toLowerCase()
      return (
        user.display_name?.toLowerCase().includes(query) ||
        user.username?.toLowerCase().includes(query)
      )
    })

  // Переключение выбора пользователя
  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  // Создание чата
  const handleCreateChat = async () => {
    if (selectedUsers.length === 0) {
      setError('Выберите хотя бы одного пользователя')
      return
    }

    if (selectedUsers.length > 1) {
      setError('Групповые чаты пока не поддерживаются')
      return
    }

    setCreating(true)
    setError(null)

    try {
      // Создаем приватный чат с выбранным пользователем
      const { data: chatId, error: createError } = await supabase.rpc(
        'create_or_get_private_chat',
        { other_user_id: selectedUsers[0] }
      )

      if (createError) {
        console.error('Ошибка создания чата:', createError)
        setError('Ошибка создания чата')
        return
      }

      console.log('✅ Чат создан/получен:', chatId)
      
      // Даем немного времени на сохранение в БД
      await new Promise(resolve => setTimeout(resolve, 200))
      
      onChatCreated(chatId)
      onClose()
    } catch (err) {
      console.error('Ошибка:', err)
      setError('Ошибка подключения')
    } finally {
      setCreating(false)
    }
  }

  // Форматирование статуса пользователя
  const getUserStatus = (user: User) => {
    if (!user.last_seen) return 'Неизвестно'

    const lastSeen = new Date(user.last_seen)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60))

    if (diffInMinutes <= 5) return 'онлайн'

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const lastSeenDate = new Date(lastSeen.getFullYear(), lastSeen.getMonth(), lastSeen.getDate())

    if (lastSeenDate.getTime() === today.getTime()) {
      return `был в сети в ${lastSeen.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
    }

    return `был в сети ${lastSeen.toLocaleDateString('ru-RU')}`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg max-w-md w-full max-h-[80vh] flex flex-col border border-border">
        {/* Заголовок */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Новый чат</h2>
            <button
              onClick={onClose}
              className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Поиск */}
        <div className="p-4 border-b">
          <div className="relative">
            <input
              type="text"
              placeholder="Поиск пользователей..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring placeholder:text-muted-foreground"
            />
            <svg className="w-5 h-5 text-muted-foreground absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Ошибка */}
        {error && (
          <div className="p-4">
            <div className="bg-destructive/10 border border-destructive rounded-lg p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </div>
        )}

        {/* Список пользователей */}
        <div className="flex-1 overflow-y-auto">
          {usersLoading ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Загрузка пользователей...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-muted-foreground">
                {searchQuery ? 'Пользователи не найдены' : 'Нет доступных пользователей'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={() => toggleUserSelection(user.id)}
                  className={`p-4 hover:bg-muted cursor-pointer transition-colors ${
                    selectedUsers.includes(user.id) ? 'bg-primary/10' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {/* Чекбокс */}
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      selectedUsers.includes(user.id) 
                        ? 'bg-primary border-primary' 
                        : 'border-border'
                    }`}>
                      {selectedUsers.includes(user.id) && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>

                    {/* Аватар */}
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex-shrink-0">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.display_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {user.display_name?.charAt(0)?.toUpperCase() || user.username?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Информация */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {user.display_name || user.username}
                      </p>
                      <p className={`text-xs truncate ${
                        getUserStatus(user) === 'онлайн' 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-muted-foreground'
                      }`}>
                        {getUserStatus(user)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Кнопки */}
        <div className="p-4 border-t">
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-foreground bg-muted rounded-lg hover:bg-muted/80 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleCreateChat}
              disabled={selectedUsers.length === 0 || creating}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {creating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
                  Создание...
                </>
              ) : (
                'Создать чат'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreateChatModal
