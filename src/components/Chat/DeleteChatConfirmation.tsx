'use client'

import React from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DeleteChatConfirmationProps {
  chatName: string
  onConfirm: () => void
  onCancel: () => void
  isDeleting?: boolean
}

export const DeleteChatConfirmation: React.FC<DeleteChatConfirmationProps> = ({
  chatName,
  onConfirm,
  onCancel,
  isDeleting = false
}) => {
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm animate-in fade-in-0 duration-200"
        onClick={onCancel}
      />
      
      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 z-[101] -translate-x-1/2 -translate-y-1/2 w-full max-w-md animate-in fade-in-0 zoom-in-95 duration-200">
        <div className="bg-card border border-border rounded-lg shadow-2xl p-6 m-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Удалить переписку?
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Это действие необратимо
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              disabled={isDeleting}
              className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="mb-6 space-y-3">
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
              <p className="text-sm text-foreground">
                <span className="font-semibold">Переписка с "{chatName}"</span> будет полностью удалена у обоих участников.
              </p>
            </div>
            
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start space-x-2">
                <span className="text-destructive mt-0.5">•</span>
                <p>Все сообщения будут безвозвратно удалены</p>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-destructive mt-0.5">•</span>
                <p>Собеседник также потеряет доступ к переписке</p>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-destructive mt-0.5">•</span>
                <p>Восстановить данные будет невозможно</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <Button
              onClick={onCancel}
              disabled={isDeleting}
              variant="outline"
              className="flex-1"
            >
              Отмена
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isDeleting}
              variant="destructive"
              className="flex-1"
            >
              {isDeleting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Удаление...
                </>
              ) : (
                'Удалить для всех'
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

export default DeleteChatConfirmation

