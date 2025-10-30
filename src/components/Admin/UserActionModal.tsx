'use client'

import { useState, useEffect } from 'react'
import { X, Ban, ShieldOff, Crown, AlertTriangle, User, Clock, Calendar } from 'lucide-react'

interface User {
  id: string
  email: string
  display_name: string
  username: string
  avatar_url: string | null
  is_banned: boolean
  ban_reason: string | null
  ban_until: string | null
  is_premium: boolean
  premium_until: string | null
}

interface UserActionModalProps {
  user: User
  action: 'ban' | 'unban' | 'premium' | 'revoke_premium'
  onExecute: (actionData: { reason?: string; duration?: number; duration_hours?: number; duration_days?: number }) => Promise<void>
  onClose: () => void
}

const UserActionModal = ({ user, action, onExecute, onClose }: UserActionModalProps) => {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    reason: '',
    duration_hours: '',
    duration_days: '',
    custom_duration: false
  })

  // Предустановленные варианты времени
  const banDurations = [
    { label: '1 час', hours: 1 },
    { label: '3 часа', hours: 3 },
    { label: '6 часов', hours: 6 },
    { label: '12 часов', hours: 12 },
    { label: '1 день', hours: 24 },
    { label: '3 дня', hours: 72 },
    { label: '1 неделя', hours: 168 },
    { label: '1 месяц', hours: 720 },
    { label: 'Постоянно', hours: null }
  ]

  const premiumDurations = [
    { label: '1 день', days: 1 },
    { label: '1 неделя', days: 7 },
    { label: '1 месяц', days: 30 },
    { label: '3 месяца', days: 90 },
    { label: '6 месяцев', days: 180 },
    { label: '1 год', days: 365 },
    { label: 'Навсегда', days: null }
  ]

  const banReasons = [
    'Спам или навязчивое поведение',
    'Неподобающее поведение',
    'Нарушение правил сообщества',
    'Злоупотребление функциями',
    'Подозрительная активность',
    'Мошенничество или обман',
    'Харассмент или угрозы',
    'Другое'
  ]

  useEffect(() => {
    // Сбрасываем форму при изменении действия
    setFormData({
      reason: '',
      duration_hours: '',
      duration_days: '',
      custom_duration: false
    })
  }, [action])

  const getModalConfig = () => {
    switch (action) {
      case 'ban':
        return {
          title: 'Заблокировать пользователя',
          icon: Ban,
          iconColor: 'text-destructive',
          confirmText: 'Заблокировать',
          confirmClass: 'bg-destructive hover:bg-destructive/90'
        }
      case 'unban':
        return {
          title: 'Разблокировать пользователя',
          icon: ShieldOff,
          iconColor: 'text-green-600',
          confirmText: 'Разблокировать',
          confirmClass: 'bg-green-600 hover:bg-green-700'
        }
      case 'premium':
        return {
          title: 'Выдать премиум статус',
          icon: Crown,
          iconColor: 'text-yellow-500',
          confirmText: 'Выдать премиум',
          confirmClass: 'bg-yellow-500 hover:bg-yellow-600'
        }
      case 'revoke_premium':
        return {
          title: 'Снять премиум статус',
          icon: Crown,
          iconColor: 'text-yellow-500',
          confirmText: 'Снять премиум',
          confirmClass: 'bg-destructive hover:bg-destructive/90'
        }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let actionData = {}

      switch (action) {
        case 'ban':
          if (!formData.reason.trim()) {
            throw new Error('Укажите причину блокировки')
          }
          actionData = {
            reason: formData.reason.trim(),
            duration_hours: formData.duration_hours ? parseInt(formData.duration_hours) : null
          }
          break
        
        case 'unban':
          actionData = {}
          break
          
        case 'premium':
          actionData = {
            duration_days: formData.duration_days ? parseInt(formData.duration_days) : null
          }
          break
          
        case 'revoke_premium':
          actionData = {}
          break
      }

      await onExecute(actionData)
      onClose()
    } catch (error) {
      console.error('Error executing action:', error)
      alert('Ошибка: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const config = getModalConfig()
  const IconComponent = config.icon

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-card rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto border border-border animate-in fade-in duration-200">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
            <div className="flex items-center">
              <IconComponent className={`h-6 w-6 ${config.iconColor} mr-2`} />
              <h3 className="text-lg font-semibold text-foreground">{config.title}</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md hover:bg-secondary transition-colors"
              disabled={loading}
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6 space-y-6">
            {/* User Info */}
            <div className="bg-secondary/20 rounded-lg p-4">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  <User className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="ml-3">
                  <div className="font-medium text-foreground">
                    {user.display_name || user.username || 'Без имени'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    @{user.username || 'no-username'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {user.email}
                  </div>
                </div>
              </div>

              {/* Current Status */}
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex flex-wrap gap-2 text-sm">
                  {user.is_banned && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-destructive/20 text-destructive">
                      <Ban className="h-3 w-3 mr-1" />
                      Заблокирован
                    </span>
                  )}
                  {user.is_premium && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-600">
                      <Crown className="h-3 w-3 mr-1" />
                      Премиум
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action-specific forms */}
            {action === 'ban' && (
              <>
                {/* Ban Reason */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Причина блокировки *
                  </label>
                  <select
                    value={formData.reason}
                    onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                    className="w-full p-3 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                    required
                  >
                    <option value="">Выберите причину...</option>
                    {banReasons.map((reason) => (
                      <option key={reason} value={reason}>{reason}</option>
                    ))}
                  </select>
                  {formData.reason === 'Другое' && (
                    <textarea
                      placeholder="Опишите причину блокировки..."
                      value={formData.reason}
                      onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                      className="w-full mt-2 p-3 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                      rows={3}
                      required
                    />
                  )}
                </div>

                {/* Ban Duration */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Длительность блокировки
                  </label>
                  {!formData.custom_duration ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {banDurations.map((duration) => (
                          <button
                            key={duration.label}
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              duration_hours: duration.hours?.toString() || '' 
                            }))}
                            className={`p-2 text-sm rounded-md border transition-colors ${
                              formData.duration_hours === (duration.hours?.toString() || '')
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background hover:bg-secondary border-border'
                            }`}
                          >
                            {duration.label}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, custom_duration: true }))}
                        className="text-sm text-primary hover:text-primary/80 transition-colors"
                      >
                        Указать время вручную
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          placeholder="Часов"
                          value={formData.duration_hours}
                          onChange={(e) => setFormData(prev => ({ ...prev, duration_hours: e.target.value }))}
                          className="flex-1 p-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ 
                          ...prev, 
                          custom_duration: false, 
                          duration_hours: '' 
                        }))}
                        className="text-sm text-primary hover:text-primary/80 transition-colors"
                      >
                        Выбрать из списка
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {action === 'premium' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Длительность премиум статуса
                </label>
                {!formData.custom_duration ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {premiumDurations.map((duration) => (
                        <button
                          key={duration.label}
                          type="button"
                          onClick={() => setFormData(prev => ({ 
                            ...prev, 
                            duration_days: duration.days?.toString() || '' 
                          }))}
                          className={`p-2 text-sm rounded-md border transition-colors ${
                            formData.duration_days === (duration.days?.toString() || '')
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background hover:bg-secondary border-border'
                          }`}
                        >
                          {duration.label}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, custom_duration: true }))}
                      className="text-sm text-primary hover:text-primary/80 transition-colors"
                    >
                      Указать время вручную
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        placeholder="Дней"
                        value={formData.duration_days}
                        onChange={(e) => setFormData(prev => ({ ...prev, duration_days: e.target.value }))}
                        className="flex-1 p-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ 
                        ...prev, 
                        custom_duration: false, 
                        duration_days: '' 
                      }))}
                      className="text-sm text-primary hover:text-primary/80 transition-colors"
                    >
                      Выбрать из списка
                    </button>
                  </div>
                )}
              </div>
            )}

            {action === 'unban' && (
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-start">
                  <ShieldOff className="h-5 w-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <div className="font-medium text-green-800 dark:text-green-200 mb-1">
                      Разблокировка пользователя
                    </div>
                    <div className="text-green-600 dark:text-green-400">
                      Пользователь сможет снова получить доступ к приложению после подтверждения.
                      {user.ban_reason && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          <strong>Текущая причина бана:</strong> {user.ban_reason}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {action === 'revoke_premium' && (
              <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <div className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                      Снятие премиум статуса
                    </div>
                    <div className="text-yellow-600 dark:text-yellow-400">
                      Пользователь потеряет доступ ко всем премиум функциям.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-4 sm:p-6 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm border border-border rounded-md hover:bg-secondary transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 text-sm text-white rounded-md transition-colors flex items-center ${config.confirmClass} ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Выполняется...
                </>
              ) : (
                config.confirmText
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default UserActionModal
