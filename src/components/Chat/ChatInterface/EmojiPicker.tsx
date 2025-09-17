import React, { useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import data from '@emoji-mart/data'

// Динамический импорт для избежания проблем с SSR
const EmojiPickerComponent = dynamic(
  () => import('@emoji-mart/react'),
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
  console.log('🎨 EmojiPicker render, isOpen:', isOpen)

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

  const handleEmojiSelect = (emoji: any) => {
    onEmojiSelect(emoji.native)
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
      <EmojiPickerComponent
        data={data}
        onEmojiSelect={handleEmojiSelect}
        theme="dark"
        previewPosition="none"
        skinTonePosition="none"
        perLine={8}
        emojiSize={24}
        emojiButtonSize={32}
        navPosition="bottom"
        maxFrequentRows={1}
        categories={['frequent', 'people', 'nature', 'foods', 'activity', 'places', 'objects', 'symbols', 'flags']}
        i18n={{
          search: 'Поиск emoji...',
          search_no_results_1: 'Ничего не найдено',
          search_no_results_2: 'Попробуйте другой запрос',
          pick: 'Выберите emoji...',
          add_custom: 'Добавить свой',
          categories: {
            search: 'Результаты поиска',
            recent: 'Недавние',
            frequent: 'Часто используемые',
            people: 'Люди и эмоции',
            nature: 'Животные и природа',
            foods: 'Еда и напитки',
            activity: 'Активности',
            places: 'Путешествия и места',
            objects: 'Объекты',
            symbols: 'Символы',
            flags: 'Флаги',
            custom: 'Пользовательские'
          }
        }}
      />
    </div>
  )
}
