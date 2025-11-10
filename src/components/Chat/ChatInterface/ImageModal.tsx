import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { CldImage } from 'next-cloudinary'

interface ImageModalProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
  publicId?: string
  alt?: string
}

export const ImageModal: React.FC<ImageModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  publicId,
  alt = 'Изображение'
}) => {
  // Блокируем скролл body когда модальное окно открыто
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    // Очистка при размонтировании
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Закрытие по Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  // Закрытие по клику на затемнение
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      {/* Кнопка закрытия */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
        aria-label="Закрыть"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Контейнер изображения */}
      <div className="relative max-w-[90vw] max-h-[90vh] p-4">
        <CldImage
          src={publicId || imageUrl}
          width={1200}
          height={800}
          alt={alt}
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          crop={{
            type: 'auto',
            source: true
          }}
          quality="auto"
          format="webp"
          priority={true}
        />
      </div>
    </div>,
    document.body
  )
}
