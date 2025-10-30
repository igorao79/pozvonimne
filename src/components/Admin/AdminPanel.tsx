'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Users, Shield, Ban, AlertTriangle } from 'lucide-react'
import useSupabaseStore from '@/store/useSupabaseStore'
import UsersList from './UsersList'
import UserActionModal from './UserActionModal'

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

interface AdminPanelProps {
  onClose: () => void
}

const AdminPanel = ({ onClose }: AdminPanelProps) => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [modalAction, setModalAction] = useState<'ban' | 'unban' | 'premium' | 'revoke_premium' | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  const { supabase } = useSupabaseStore()

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase.rpc('admin_get_all_users')
      if (error) throw error

      setUsers(data || [])
    } catch (err) {
      console.error('Error loading users:', err)
      setError('Ошибка загрузки пользователей: ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const initializeAdminPanel = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Проверяем права администратора
      const { data: isAdminData, error: adminError } = await supabase.rpc('is_admin')
      if (adminError) throw adminError

      setIsAdmin(isAdminData)

      if (!isAdminData) {
        throw new Error('У вас нет прав доступа к административной панели')
      }

      // Если админ - загружаем пользователей
      await loadUsers()
    } catch (err) {
      console.error('Error initializing admin panel:', err)
      setError('Ошибка инициализации: ' + (err as Error).message)
      setLoading(false)
      setIsAdmin(false)
    }
  }, [supabase, loadUsers])

  useEffect(() => {
    initializeAdminPanel()
  }, [initializeAdminPanel])

  const checkAdminRights = async () => {
    try {
      const { data, error } = await supabase.rpc('is_admin')
      if (error) throw error
      setIsAdmin(data)
      return data
    } catch (err) {
      console.error('Error checking admin rights:', err)
      setError('Ошибка проверки прав доступа')
      setIsAdmin(false)
      return false
    }
  }

  const handleUserAction = (user: User, action: 'ban' | 'unban' | 'premium' | 'revoke_premium') => {
    setSelectedUser(user)
    setModalAction(action)
  }

  const executeUserAction = async (actionData: { reason?: string; duration?: number; duration_hours?: number; duration_days?: number }) => {
    if (!selectedUser || !modalAction) return

    try {
      setError(null)

      // Проверяем права администратора
      const isAdminCheck = await checkAdminRights()
      if (!isAdminCheck) {
        throw new Error('У вас нет прав для выполнения этого действия')
      }

      let result

      switch (modalAction) {
        case 'ban':
          result = await supabase.rpc('admin_ban_user', {
            target_user_id: selectedUser.id,
            reason: actionData.reason,
            ban_duration_hours: actionData.duration_hours
          })
          break
        case 'unban':
          result = await supabase.rpc('admin_unban_user', {
            target_user_id: selectedUser.id
          })
          break
        case 'premium':
          result = await supabase.rpc('admin_grant_premium', {
            target_user_id: selectedUser.id,
            premium_duration_days: actionData.duration_days
          })
          break
        case 'revoke_premium':
          result = await supabase.rpc('admin_revoke_premium', {
            target_user_id: selectedUser.id
          })
          break
      }

      if (result?.error) throw result.error

      // Перезагружаем список пользователей
      await loadUsers()

      // Закрываем модальное окно
      setSelectedUser(null)
      setModalAction(null)
    } catch (err) {
      console.error(`Error executing ${modalAction}:`, err)
      setError(`Ошибка выполнения действия: ${(err as Error).message}`)
    }
  }

  if (!isAdmin && !loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-card rounded-lg w-full max-w-md p-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Shield className="h-6 w-6 text-destructive mr-2" />
              <h2 className="text-xl font-semibold text-foreground">Доступ запрещен</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-secondary/80 transition-colors"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
          <p className="text-muted-foreground mb-4">
            У вас нет прав доступа к административной панели.
          </p>
          <button
            onClick={onClose}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-card rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden border border-border animate-in fade-in duration-300">
        {/* Header */}
        <div className="bg-secondary/50 border-b border-border p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Shield className="h-6 w-6 text-primary mr-2" />
              <h2 className="text-xl font-semibold text-foreground">Административная панель</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-md hover:bg-secondary/80 transition-colors"
              aria-label="Закрыть админку"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-secondary/30 rounded-lg p-4">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-primary mr-3" />
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {users.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Всего пользователей</div>
                </div>
              </div>
            </div>

            <div className="bg-secondary/30 rounded-lg p-4">
              <div className="flex items-center">
                <Ban className="h-8 w-8 text-destructive mr-3" />
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {users.filter(u => u.is_banned).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Заблокированных</div>
                </div>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-destructive mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-destructive">{error}</p>
                    <button
                      onClick={initializeAdminPanel}
                      className="mt-2 text-sm text-primary hover:text-primary/80 underline"
                    >
                      Повторить попытку
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-destructive hover:text-destructive/80"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Users List */}
          <div className="bg-secondary/20 rounded-lg border border-border overflow-hidden">
            <div className="p-4 border-b border-border bg-secondary/30">
              <h3 className="text-lg font-medium text-foreground flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Пользователи
              </h3>
            </div>

            <div className="h-96"> {/* Фиксированная высота для скроллинга */}
              <UsersList
                users={users}
                loading={loading && isAdmin && !error}
                hasError={!!error}
                onUserAction={handleUserAction}
                onRefresh={loadUsers}
              />
            </div>
          </div>
        </div>

        {/* User Action Modal */}
        {selectedUser && modalAction && (
          <UserActionModal
            user={selectedUser}
            action={modalAction}
            onExecute={executeUserAction}
            onClose={() => {
              setSelectedUser(null)
              setModalAction(null)
            }}
          />
        )}
      </div>
    </div>
  )
}

export default AdminPanel
