import React, { useState, useEffect, useRef } from 'react'

interface Emoji {
  slug: string
  character: string
  unicodeName: string
  codePoint: string
  group: string
  subGroup: string
}

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void
  isOpen: boolean
  onClose: () => void
}

const API_KEY = '2cac978ec06f1f4fd78f9d8d8a4c11359703f0ca'

export const EmojiPicker: React.FC<EmojiPickerProps> = ({
  onEmojiSelect,
  isOpen,
  onClose
}) => {
  console.log('🎨 EmojiPicker render, isOpen:', isOpen)

  const [emojis, setEmojis] = useState<Emoji[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('smileys-emotion')
  const pickerRef = useRef<HTMLDivElement>(null)

  const categories = [
    { slug: 'smileys-emotion', name: '😀', label: 'Эмоции' },
    { slug: 'people-body', name: '👋', label: 'Люди' },
    { slug: 'animals-nature', name: '🐶', label: 'Животные' },
    { slug: 'food-drink', name: '🍎', label: 'Еда' },
    { slug: 'activities', name: '⚽', label: 'Активности' },
    { slug: 'travel-places', name: '✈️', label: 'Путешествия' },
    { slug: 'objects', name: '💡', label: 'Объекты' },
    { slug: 'symbols', name: '❤️', label: 'Символы' },
    { slug: 'flags', name: '🏳️', label: 'Флаги' }
  ]

  // Загрузка emoji по категории
  const loadEmojis = async (category: string) => {
    try {
      setLoading(true)
      const response = await fetch(
        `https://emoji-api.com/categories/${category}?access_key=${API_KEY}`
      )

      if (!response.ok) {
        throw new Error('Failed to load emojis')
      }

      const data = await response.json()
      setEmojis(data)
    } catch (error) {
      console.error('Error loading emojis:', error)
      setEmojis([])
    } finally {
      setLoading(false)
    }
  }

  // Поиск emoji
  const searchEmojis = async (term: string) => {
    if (!term.trim()) {
      loadEmojis(activeCategory)
      return
    }

    try {
      setLoading(true)
      const response = await fetch(
        `https://emoji-api.com/emojis?search=${encodeURIComponent(term)}&access_key=${API_KEY}`
      )

      if (!response.ok) {
        throw new Error('Failed to search emojis')
      }

      const data = await response.json()
      setEmojis(data)
    } catch (error) {
      console.error('Error searching emojis:', error)
      setEmojis([])
    } finally {
      setLoading(false)
    }
  }

  // Загрузка начальной категории
  useEffect(() => {
    if (isOpen && emojis.length === 0) {
      loadEmojis(activeCategory)
    }
  }, [isOpen, activeCategory, emojis.length])

  // Обработка поиска
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchTerm) {
        searchEmojis(searchTerm)
      } else {
        loadEmojis(activeCategory)
      }
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [searchTerm, activeCategory])

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

  return (
    <div
      ref={pickerRef}
      className={`fixed bg-card border border-border rounded-lg shadow-lg p-4 w-80 max-h-96 overflow-hidden z-[100] transition-all duration-200 ${
        isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
      }`}
      style={{
        bottom: isOpen ? '80px' : '60px',
        right: '20px',
        transformOrigin: 'bottom right'
      }}
    >
      {/* Заголовок с поиском */}
      <div className="mb-3">
        <input
          type="text"
          placeholder="Поиск emoji..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Категории */}
      {!searchTerm && (
        <div className="flex flex-wrap gap-1 mb-3 pb-2 border-b border-border">
          {categories.map((category) => (
            <button
              key={category.slug}
              onClick={() => {
                setActiveCategory(category.slug)
                setSearchTerm('')
              }}
              className={`px-2 py-1 text-sm rounded transition-colors ${
                activeCategory === category.slug
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
              title={category.label}
            >
              {category.name}
            </button>
          ))}
        </div>
      )}

      {/* Emoji сетка */}
      <div className="max-h-64 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : emojis.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? 'Emoji не найдены' : 'Нет emoji в этой категории'}
          </div>
        ) : (
          <div className="grid grid-cols-8 gap-1">
            {emojis.map((emoji) => (
              <button
                key={emoji.slug}
                onClick={() => {
                  onEmojiSelect(emoji.character)
                  onClose()
                }}
                className="text-2xl hover:bg-muted rounded p-1 transition-colors"
                title={emoji.unicodeName}
              >
                {emoji.character}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
