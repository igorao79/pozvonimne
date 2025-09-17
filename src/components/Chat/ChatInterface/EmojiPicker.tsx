import React, { useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import useThemeStore from '@/store/useThemeStore'

// Динамический импорт для избежания проблем с SSR
const EmojiPickerWithTheme = dynamic(
  async () => {
    const mod = await import('emoji-picker-react')
    const EmojiPicker = mod.default
    const Theme = mod.Theme
    return ({ theme, ...props }: any) => (
      <EmojiPicker
        theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
        {...props}
      />
    )
  },
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    )
  }
)

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void
  isOpen: boolean
  onClose: () => void
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({
  onEmojiSelect,
  isOpen,
  onClose
}) => {
  // EmojiPicker render

  const { theme } = useThemeStore()
  const pickerRef = useRef<HTMLDivElement>(null)

  // Закрытие при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  const handleEmojiSelect = (emojiData: any) => {
    onEmojiSelect(emojiData.emoji)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      ref={pickerRef}
      className="fixed z-[100]"
      style={{
        bottom: '80px',
        right: '20px',
        transformOrigin: 'bottom right'
      }}
    >
      <div className="emoji-picker-container">
        <EmojiPickerWithTheme
          onEmojiClick={handleEmojiSelect}
          theme={theme}
          previewConfig={{ showPreview: false }}
          skinTonesDisabled={true}
          width={300}
          height={400}
          searchPlaceHolder="Поиск emoji..."
        />
      </div>
    </div>
  )
}
