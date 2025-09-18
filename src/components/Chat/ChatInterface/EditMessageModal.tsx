import React, { useState, useEffect, useRef } from 'react'

interface EditMessageModalProps {
  isOpen: boolean
  messageId: string
  currentContent: string
  onSave: (messageId: string, newContent: string) => Promise<void>
  onCancel: () => void
}

export const EditMessageModal: React.FC<EditMessageModalProps> = ({
  isOpen,
  messageId,
  currentContent,
  onSave,
  onCancel
}) => {
  const [content, setContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Инициализация контента при открытии модального окна
  useEffect(() => {
    if (isOpen && currentContent) {
      setContent(currentContent)
      // Фокус на textarea после небольшого таймаута для корректного рендеринга
      setTimeout(() => {
        textareaRef.current?.focus()
        textareaRef.current?.select()
      }, 100)
    }
  }, [isOpen, currentContent])

  // Обработчик сохранения
  const handleSave = async () => {
    if (!content.trim()) return

    setIsSaving(true)
    try {
      await onSave(messageId, content.trim())
      onCancel() // Закрываем модальное окно после успешного сохранения
    } catch (error) {
      console.error('Ошибка при сохранении сообщения:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Обработчик отмены
  const handleCancel = () => {
    setContent('')
    onCancel()
  }

  // Обработчик клавиш
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  // Автоматическое изменение размера textarea
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }

  useEffect(() => {
    adjustTextareaHeight()
  }, [content])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl max-w-md w-full border border-border">
        {/* Заголовок */}
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-lg font-semibold">Редактировать сообщение</h3>
        </div>

        {/* Содержимое */}
        <div className="p-4">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Введите текст сообщения..."
            className="w-full resize-none border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-h-[80px] max-h-[200px] overflow-y-auto"
            disabled={isSaving}
          />

          {/* Подсказка */}
          <div className="mt-2 text-xs text-muted-foreground">
            <p>Ctrl+Enter или Cmd+Enter для сохранения</p>
            <p>Escape для отмены</p>
          </div>
        </div>

        {/* Кнопки действий */}
        <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            Отмена
          </button>

          <button
            onClick={handleSave}
            disabled={!content.trim() || isSaving}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving && (
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            )}
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}
