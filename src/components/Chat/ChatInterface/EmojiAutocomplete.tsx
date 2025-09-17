import React, { useState, useEffect, useRef } from 'react'
import { SearchIndex } from 'emoji-mart'
import data from '@emoji-mart/data'

interface EmojiSuggestion {
  id: string
  name: string
  native: string
  shortcodes?: string
  keywords?: string[]
}

interface EmojiAutocompleteProps {
  inputValue: string
  onEmojiSelect: (emoji: string) => void
  onClose: () => void
}

// Флаг инициализации данных
let dataInitialized = false

const initializeData = async () => {
  if (!dataInitialized) {
    try {
      // Инициализируем данные emoji-mart
      await SearchIndex.reset()
      dataInitialized = true
      console.log('🎨 Emoji data initialized successfully')
    } catch (error) {
      console.error('❌ Failed to initialize Emoji data:', error)
    }
  }
}

export const EmojiAutocomplete: React.FC<EmojiAutocompleteProps> = ({
  inputValue,
  onEmojiSelect,
  onClose
}) => {
  const [suggestions, setSuggestions] = useState<EmojiSuggestion[]>([])
  const [isVisible, setIsVisible] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Инициализация данных при монтировании компонента
  useEffect(() => {
    initializeData()
  }, [])

  // Анализ введенного текста для поиска emoji паттернов
  useEffect(() => {
    const analyzeText = async () => {
      // Ищем паттерн :text: в конце строки
      const colonMatch = inputValue.match(/:([^:\s]+)$/)

      if (colonMatch && dataInitialized) {
        const searchTerm = colonMatch[1].toLowerCase()
        setIsVisible(true)

        try {
          // Используем SearchIndex из emoji-mart для поиска
          const searchResults = await SearchIndex.search(searchTerm, { maxResults: 8, caller: 'autocomplete' })

          // Преобразуем результаты в формат нашего компонента
          const filteredEmojis: EmojiSuggestion[] = searchResults
            .map((emoji: any) => ({
              id: emoji.id,
              name: emoji.name,
              native: emoji.skins?.[0]?.native || emoji.native,
              shortcodes: emoji.shortcodes ? `:${emoji.shortcodes}:` : `:${emoji.id}:`,
              keywords: emoji.keywords
            }))

          setSuggestions(filteredEmojis)
          setSelectedIndex(0)
        } catch (error) {
          console.error('❌ Error searching emojis:', error)
          setSuggestions([])
        }
      } else {
        setIsVisible(false)
        setSuggestions([])
      }
    }

    analyzeText()
  }, [inputValue])

  // Обработка клавиш
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible || suggestions.length === 0) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev =>
            prev < suggestions.length - 1 ? prev + 1 : prev
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => prev > 0 ? prev - 1 : prev)
          break
        case 'Enter':
          e.preventDefault()
          if (suggestions[selectedIndex]) {
            handleEmojiSelect(suggestions[selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
        case 'Tab':
          if (suggestions[selectedIndex]) {
            e.preventDefault()
            handleEmojiSelect(suggestions[selectedIndex])
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isVisible, suggestions, selectedIndex, onClose])

  // Закрытие при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isVisible, onClose])

  const handleEmojiSelect = (emoji: EmojiSuggestion) => {
    onEmojiSelect(emoji.native)
    setIsVisible(false)
    setSuggestions([])
  }

  if (!isVisible || suggestions.length === 0) {
    return null
  }

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full left-0 mb-2 bg-card border border-border rounded-lg shadow-lg p-2 w-64 max-h-64 overflow-y-auto z-[100]"
    >
      <div className="space-y-1">
        {suggestions.map((emoji, index) => (
          <button
            key={emoji.id}
            onClick={() => handleEmojiSelect(emoji)}
            className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center space-x-3 ${
              index === selectedIndex
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
          >
            <span className="text-xl">{emoji.native}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{emoji.name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {emoji.shortcodes}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-2 pt-2 border-t border-border">
        <div className="text-xs text-muted-foreground text-center">
          ↑↓ для навигации • Enter/Tab для выбора • Esc для закрытия
        </div>
      </div>
    </div>
  )
}
