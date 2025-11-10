import React, { useState, useRef, useCallback } from 'react'
import { Camera, X, Upload, Image as ImageIcon } from 'lucide-react'

interface ImageMessageInputProps {
  onImageSubmit: (imageUrl: string, publicId: string, fileName: string) => void
  disabled?: boolean
  chatId: string
}

export const ImageMessageInput: React.FC<ImageMessageInputProps> = ({
  onImageSubmit,
  disabled = false,
  chatId
}) => {
  const [isUploading, setIsUploading] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Функция для обработки выбора файла
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Проверяем тип файла
    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите изображение')
      return
    }

    // Проверяем размер файла (максимум 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Файл слишком большой. Максимальный размер: 10MB')
      return
    }

    setSelectedFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }, [])

  // Функция для открытия выбора файла
  const handleSelectImage = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  // Функция для отмены выбора изображения
  const handleCancel = useCallback(() => {
    setSelectedImage(null)
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  // Функция для отправки изображения
  const handleSendImage = useCallback(async () => {
    if (!selectedFile || !selectedImage) return

    setIsUploading(true)

    try {
      // Создаем FormData для отправки на наш API
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('chatId', chatId)

      // Отправляем изображение через наш API endpoint
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка загрузки изображения')
      }

      const data = await response.json()

      // Отправляем изображение через callback
      onImageSubmit(data.imageUrl, data.publicId, data.fileName)

      // Очищаем состояние
      setSelectedImage(null)
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Ошибка загрузки изображения:', error)
      alert('Не удалось загрузить изображение. Попробуйте снова.')
    } finally {
      setIsUploading(false)
    }
  }, [selectedFile, selectedImage, onImageSubmit, chatId])

  return (
    <div className="flex items-center space-x-4 p-4">
      {/* Скрытый input для выбора файла */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {selectedImage ? (
        /* Превью выбранного изображения */
        <div className="flex-1 flex items-center space-x-3">
          <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
            <img
              src={selectedImage}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            {isUploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">
              {selectedFile?.name || 'Изображение'}
            </div>
            <div className="text-xs text-muted-foreground">
              {isUploading ? 'Загрузка...' : 'Готово к отправке'}
            </div>
          </div>

          {/* Кнопки управления */}
          <div className="flex items-center space-x-2">
            {!isUploading && (
              <>
                <button
                  onClick={handleCancel}
                  className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  title="Отмена"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSendImage}
                  className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  title="Отправить"
                >
                  <Upload className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        /* Кнопка выбора изображения */
        <div className="flex-1 flex items-center space-x-3">
          <button
            onClick={handleSelectImage}
            disabled={disabled}
            className="flex-shrink-0 w-16 h-16 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Camera className="w-8 h-8" />
          </button>

          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">
              Выберите изображение
            </div>
            <div className="text-xs text-muted-foreground">
              Максимальный размер: 10MB
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
