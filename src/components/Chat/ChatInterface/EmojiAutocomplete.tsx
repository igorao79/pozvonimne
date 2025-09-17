import React, { useState, useEffect, useRef } from 'react'

interface EmojiSuggestion {
  id: string
  name: string
  native: string
  shortcodes: string
  keywords: string[]
}

interface EmojiAutocompleteProps {
  inputValue: string
  onEmojiSelect: (emoji: string) => void
  onClose: () => void
}

// Простая база emoji для autocomplete
const emojiDatabase: EmojiSuggestion[] = [
  { id: 'smile', name: 'Smile', native: '😊', shortcodes: ':smile:', keywords: ['happy', 'joy', 'smile'] },
  { id: 'heart', name: 'Heart', native: '❤️', shortcodes: ':heart:', keywords: ['love', 'heart', 'like'] },
  { id: 'thumbs_up', name: 'Thumbs Up', native: '👍', shortcodes: ':thumbs_up:', keywords: ['good', 'ok', 'yes'] },
  { id: 'laughing', name: 'Laughing', native: '😂', shortcodes: ':laughing:', keywords: ['laugh', 'funny', 'lol'] },
  { id: 'wink', name: 'Wink', native: '😉', shortcodes: ':wink:', keywords: ['wink', 'flirt', 'cute'] },
  { id: 'fire', name: 'Fire', native: '🔥', shortcodes: ':fire:', keywords: ['hot', 'fire', 'lit'] },
  { id: 'star', name: 'Star', native: '⭐', shortcodes: ':star:', keywords: ['star', 'favorite', 'awesome'] },
  { id: 'cry', name: 'Cry', native: '😢', shortcodes: ':cry:', keywords: ['sad', 'tear', 'cry'] },
  { id: 'thinking', name: 'Thinking', native: '🤔', shortcodes: ':thinking:', keywords: ['think', 'confused', 'wonder'] },
  { id: 'cool', name: 'Cool', native: '😎', shortcodes: ':cool:', keywords: ['cool', 'sunglasses', 'awesome'] },
  { id: 'hi', name: 'Hi', native: '👋', shortcodes: ':hi:', keywords: ['hello', 'hi', 'wave'] },
  { id: 'bye', name: 'Bye', native: '👋', shortcodes: ':bye:', keywords: ['bye', 'goodbye', 'wave'] },
  { id: 'yes', name: 'Yes', native: '✅', shortcodes: ':yes:', keywords: ['yes', 'check', 'agree'] },
  { id: 'no', name: 'No', native: '❌', shortcodes: ':no:', keywords: ['no', 'cross', 'deny'] },
  { id: 'love', name: 'Love', native: '😍', shortcodes: ':love:', keywords: ['love', 'hearts', 'inlove'] },
  { id: 'angry', name: 'Angry', native: '😠', shortcodes: ':angry:', keywords: ['angry', 'mad', 'upset'] },
  { id: 'surprised', name: 'Surprised', native: '😮', shortcodes: ':surprised:', keywords: ['wow', 'surprise', 'shocked'] },
  { id: 'sleep', name: 'Sleep', native: '😴', shortcodes: ':sleep:', keywords: ['sleep', 'tired', 'sleepy'] },
  { id: 'coffee', name: 'Coffee', native: '☕', shortcodes: ':coffee:', keywords: ['coffee', 'drink', 'morning'] },
  { id: 'pizza', name: 'Pizza', native: '🍕', shortcodes: ':pizza:', keywords: ['pizza', 'food', 'yum'] }
]

export const EmojiAutocomplete: React.FC<EmojiAutocompleteProps> = ({
  inputValue,
  onEmojiSelect,
  onClose
}) => {
  const [suggestions, setSuggestions] = useState<EmojiSuggestion[]>([])
  const [isVisible, setIsVisible] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Анализ введенного текста для поиска emoji паттернов
  useEffect(() => {
    const analyzeText = () => {
      // Ищем паттерн :text: в конце строки
      const colonMatch = inputValue.match(/:([^:\s]+)$/)

      if (colonMatch) {
        const searchTerm = colonMatch[1].toLowerCase()
        setIsVisible(true)

        // Ищем emoji в нашей базе данных
        const filteredEmojis = emojiDatabase.filter(emoji =>
          emoji.id.toLowerCase().includes(searchTerm) ||
          emoji.name.toLowerCase().includes(searchTerm) ||
          emoji.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm))
        ).slice(0, 5) // Ограничиваем до 5 подсказок

        setSuggestions(filteredEmojis)
        setSelectedIndex(0)
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
