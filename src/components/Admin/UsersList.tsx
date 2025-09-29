'use client'

import { useState } from 'react'
import {
  Ban,
  Crown,
  Shield,
  ShieldOff,
  User,
  Clock,
  RefreshCw,
  Search,
  Filter,
  MoreVertical
} from 'lucide-react'
import OptimizedImage from '@/components/ui/OptimizedImage'

interface User {
  id: string
  email: string
  display_name: string
  username: string
  avatar_url: string | null
  status: string
  last_seen: string
  created_at: string
  last_sign_in_at: string
  is_banned: boolean
  ban_reason: string | null
  ban_until: string | null
  banned_by: string | null
  banned_at: string | null
  is_premium: boolean
  premium_until: string | null
  premium_granted_by: string | null
  premium_granted_at: string | null
}

interface UsersListProps {
  users: User[]
  loading: boolean
  hasError?: boolean
  onUserAction: (user: User, action: 'ban' | 'unban' | 'premium' | 'revoke_premium') => void
  onRefresh: () => void
}

type FilterType = 'all' | 'banned' | 'premium' | 'online'

const UsersList = ({ users, loading, hasError = false, onUserAction, onRefresh }: UsersListProps) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  // Фильтрация и поиск
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesFilter = (() => {
      switch (filter) {
        case 'banned': return user.is_banned
        case 'premium': return user.is_premium
        case 'online': return user.status === 'online'
        default: return true
      }
    })()

    return matchesSearch && matchesFilter
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatBanDuration = (banUntil: string | null) => {
    if (!banUntil) return 'Постоянно'

    const until = new Date(banUntil)
    const now = new Date()
    const diff = until.getTime() - now.getTime()

    if (diff <= 0) return 'Истек'

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (days > 0) return `${days}д ${hours}ч`
    if (hours > 0) return `${hours}ч ${minutes}мин`
    if (minutes > 0) return `${minutes}мин`
    return 'Менее минуты'
  }

  const getUserStatus = (user: User) => {
    if (user.is_banned) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-destructive/20 text-destructive">
          <Ban className="h-3 w-3 mr-1" />
          Забанен
        </span>
      )
    }
    
    if (user.status === 'online') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-700 dark:text-green-400">
          <div className="h-2 w-2 bg-green-500 rounded-full mr-1" />
          Онлайн
        </span>
      )
    }
    
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-secondary text-muted-foreground">
        <div className="h-2 w-2 bg-gray-400 rounded-full mr-1" />
        Оффлайн
      </span>
    )
  }

  const toggleUserActions = (userId: string) => {
    setSelectedUserId(selectedUserId === userId ? null : userId)
  }


  return (
    <div className="overflow-hidden">
      {/* Search and Filter Bar */}
      <div className="p-4 border-b border-border bg-secondary/10">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Поиск по имени, username или email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm"
            />
          </div>
          
          {/* Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterType)}
              className="pl-10 pr-8 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm appearance-none cursor-pointer min-w-[140px]"
            >
              <option value="all">Все ({users.length})</option>
              <option value="online">Онлайн ({users.filter(u => u.status === 'online').length})</option>
              <option value="banned">Забанены ({users.filter(u => u.is_banned).length})</option>
              <option value="premium">Премиум ({users.filter(u => u.is_premium).length})</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            className="px-3 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors flex items-center text-sm whitespace-nowrap"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Обновить
          </button>
        </div>
        
        {/* Results count */}
        <div className="mt-2 text-sm text-muted-foreground">
          Показано {filteredUsers.length} из {users.length} пользователей
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="flex items-center text-muted-foreground">
              <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
              Загрузка пользователей...
            </div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex items-center justify-center p-8 text-muted-foreground">
            <User className="h-8 w-8 mr-2" />
            {searchQuery || filter !== 'all' ? 'Пользователи не найдены' : hasError ? 'Ошибка загрузки пользователей' : 'Нет пользователей'}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-secondary/20">
              <tr>
                <th className="text-left p-3 font-medium text-sm text-muted-foreground">Пользователь</th>
                <th className="text-left p-3 font-medium text-sm text-muted-foreground">Статус</th>
                <th className="text-left p-3 font-medium text-sm text-muted-foreground hidden sm:table-cell">Последняя активность</th>
                <th className="text-left p-3 font-medium text-sm text-muted-foreground hidden lg:table-cell">Дата регистрации</th>
                <th className="text-right p-3 font-medium text-sm text-muted-foreground">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-border hover:bg-secondary/10 transition-colors">
                  {/* User Info */}
                  <td className="p-3">
                    <div className="flex items-center">
                      <div className="relative">
                        {user.avatar_url ? (
                          <OptimizedImage
                            src={user.avatar_url}
                            alt={user.display_name || user.username}
                            width={40}
                            height={40}
                            className="rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                            <User className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        {user.is_premium && (
                          <Crown className="absolute -top-1 -right-1 h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                      <div className="ml-3">
                        <div className="font-medium text-foreground text-sm">
                          {user.display_name || user.username || 'Без имени'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          @{user.username || 'no-username'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="p-3">
                    <div className="flex flex-col gap-1">
                      {getUserStatus(user)}
                      {user.is_banned && (
                        <div className="text-xs text-destructive">
                          {formatBanDuration(user.ban_until) === 'Истек'
                            ? 'Истек'
                            : `на ${formatBanDuration(user.ban_until)}`
                          }
                        </div>
                      )}
                      {user.is_premium && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">
                          <Crown className="h-3 w-3 mr-1" />
                          Премиум
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Last Activity */}
                  <td className="p-3 hidden sm:table-cell">
                    <div className="text-sm text-muted-foreground">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {user.last_seen ? formatDate(user.last_seen) : 'Никогда'}
                    </div>
                  </td>

                  {/* Registration Date */}
                  <td className="p-3 hidden lg:table-cell">
                    <div className="text-sm text-muted-foreground">
                      {formatDate(user.created_at)}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="p-3 text-right">
                    <div className="relative">
                      <button
                        onClick={() => toggleUserActions(user.id)}
                        className="p-1 rounded-md hover:bg-secondary transition-colors"
                      >
                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                      </button>

                      {selectedUserId === user.id && (
                        <div className="absolute right-0 top-8 mt-1 bg-card border border-border rounded-md shadow-lg z-10 min-w-[200px]">
                          {user.is_banned ? (
                            <button
                              onClick={() => {
                                onUserAction(user, 'unban')
                                setSelectedUserId(null)
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors flex items-center text-green-600"
                            >
                              <ShieldOff className="h-4 w-4 mr-2" />
                              Разбанить
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                onUserAction(user, 'ban')
                                setSelectedUserId(null)
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors flex items-center text-destructive"
                            >
                              <Ban className="h-4 w-4 mr-2" />
                              Забанить
                            </button>
                          )}

                          {user.is_premium ? (
                            <button
                              onClick={() => {
                                onUserAction(user, 'revoke_premium')
                                setSelectedUserId(null)
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors flex items-center text-yellow-600"
                            >
                              <Crown className="h-4 w-4 mr-2" />
                              Снять премиум
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                onUserAction(user, 'premium')
                                setSelectedUserId(null)
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors flex items-center text-yellow-600"
                            >
                              <Crown className="h-4 w-4 mr-2" />
                              Выдать премиум
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default UsersList
