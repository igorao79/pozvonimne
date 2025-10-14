'use client'

import { useState } from 'react'
import { Trash2, AlertTriangle } from 'lucide-react'
import { DeleteAccountSectionProps } from './types'
import { createClient } from '@/utils/supabase/client'
import useCallStore from '@/store/useCallStore'
import { useAuth } from '@/hooks/useAuth'

const DeleteAccountSection = ({ loading, onError, onSuccess }: DeleteAccountSectionProps) => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showFinalConfirmDialog, setShowFinalConfirmDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { userId } = useCallStore()
  const auth = useAuth()
  const supabase = createClient()

  const handleDeleteClick = () => {
    setShowConfirmDialog(true)
    onError('') // Сбрасываем ошибки
  }

  const handleConfirmDelete = () => {
    setShowConfirmDialog(false)
    setShowFinalConfirmDialog(true)
  }

  const handleFinalConfirmDelete = async () => {
    setDeleting(true)
    onError('')

    try {
      // Вызываем функцию удаления аккаунта
      const { error: deleteError } = await supabase.rpc('delete_user_account', {
        user_id: userId
      })

      if (deleteError) {
        console.error('Error deleting account:', deleteError)
        onError('Ошибка при удалении аккаунта: ' + deleteError.message)
        setDeleting(false)
        return
      }

      onSuccess('Аккаунт успешно удален. Вы будете перенаправлены на главную страницу.')

      // Закрываем модальные окна
      setShowFinalConfirmDialog(false)

      // Через 3 секунды выходим и перезагружаем страницу
      setTimeout(async () => {
        await auth.handleSignOut()
        window.location.href = '/'
      }, 3000)

    } catch (err) {
      console.error('Delete account error:', err)
      onError('Произошла ошибка при удалении аккаунта')
      setDeleting(false)
    }
  }

  const handleCancelDelete = () => {
    setShowConfirmDialog(false)
    setShowFinalConfirmDialog(false)
  }

  return (
    <>
      <div className="mb-6">
        <button
          onClick={handleDeleteClick}
          disabled={loading}
          className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 dark:bg-red-500 dark:hover:bg-red-600 transition-colors flex items-center justify-center space-x-2"
        >
          <Trash2 className="h-4 w-4" />
          <span>{loading ? 'Загрузка...' : 'Удалить аккаунт'}</span>
        </button>
        <p className="text-xs text-muted-foreground mt-1">
          Это действие необратимо. Все данные будут потеряны.
        </p>
      </div>

      {/* Модальное окно подтверждения */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-card rounded-lg p-6 max-w-sm w-full border border-border">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0" />
              <h3 className="text-lg font-semibold text-foreground">
                Удалить аккаунт?
              </h3>
            </div>

            <p className="text-sm text-muted-foreground mb-6">
              Вы уверены, что хотите удалить свой аккаунт? Это действие необратимо.
              Все ваши сообщения, настройки и данные будут удалены навсегда.
            </p>

            <div className="flex space-x-3">
              <button
                onClick={handleCancelDelete}
                className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Финальное модальное окно подтверждения */}
      {showFinalConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-card rounded-lg p-6 max-w-sm w-full border border-border">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0" />
              <h3 className="text-lg font-semibold text-foreground">
                Финальное подтверждение
              </h3>
            </div>

            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-3">
                ⚠️ <strong>ВНИМАНИЕ!</strong> Это действие необратимо!
              </p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• Все ваши сообщения будут удалены</p>
                <p>• Все чаты с вашим участием будут очищены</p>
                <p>• Ваш профиль будет полностью удален</p>
                <p>• Восстановление данных будет невозможно</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-6 font-medium">
              Вы действительно хотите навсегда удалить свой аккаунт?
            </p>

            <div className="flex space-x-3">
              <button
                onClick={handleCancelDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                onClick={handleFinalConfirmDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {deleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Удаление...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>Удалить навсегда</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default DeleteAccountSection
