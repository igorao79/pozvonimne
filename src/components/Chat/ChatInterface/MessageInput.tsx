import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react'
import { EmojiPicker } from './EmojiPicker'
import { EmojiAutocomplete } from './EmojiAutocomplete'
import { useTyping } from '@/hooks/useTyping'

interface MessageInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  sending: boolean
  disabled?: boolean
  chatId: string
}

export interface MessageInputRef {
  focus: () => void
}

export const MessageInput = forwardRef<MessageInputRef, MessageInputProps>(({
  value,
  onChange,
  onSubmit,
  sending,
  disabled = false,
  chatId
}, ref) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Используем простой typing hook
  const { handleInputChange: handleTypingChange, handleSubmit: handleTypingSubmit } = useTyping({
    chatId,
    enabled: !disabled
  })

  // Экспортируем метод focus наружу
  useImperativeHandle(ref, () => ({
    focus: () => {
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }
  }))

  // Преобразование emoji shortcodes в emoji
  const convertEmojiShortcodes = (text: string) => {
    // Простая замена известных shortcodes
    const shortcodeMap: { [key: string]: string } = {
      'smile': '😊',
      'heart': '❤️',
      'thumbs_up': '👍',
      'laughing': '😂',
      'wink': '😉',
      'fire': '🔥',
      'star': '⭐',
      'cry': '😢',
      'thinking': '🤔',
      'cool': '😎',
      'hi': '👋',
      'bye': '👋',
      'yes': '✅',
      'no': '❌',
      'love': '😍',
      'angry': '😠',
      'surprised': '😮',
      'sleep': '😴',
      'coffee': '☕',
      'pizza': '🍕'
    }

    let convertedText = text

    // Заменяем все найденные shortcodes
    Object.entries(shortcodeMap).forEach(([shortcode, emoji]) => {
      const regex = new RegExp(`:${shortcode}:`, 'g')
      convertedText = convertedText.replace(regex, emoji)
    })

    return convertedText
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    console.log('📨 [MessageInput] Отправка сообщения, останавливаем typing')

    // Останавливаем typing при отправке сообщения
    handleTypingSubmit()
    
    console.log(`📨 [MessageInput] Отправляем сообщение: "${value}"`)

    // Преобразуем emoji shortcodes в emoji перед отправкой
    const convertedValue = convertEmojiShortcodes(value)

    // Если текст изменился после преобразования, обновляем значение
    if (convertedValue !== value) {
      onChange(convertedValue)
    }

    // Создаем правильное синтетическое событие
    const syntheticEvent = {
      ...e,
      preventDefault: () => {}, // Добавляем функцию preventDefault
      target: { value: convertedValue } as HTMLInputElement,
      currentTarget: { value: convertedValue } as HTMLInputElement
    } as React.FormEvent

    onSubmit(syntheticEvent)
  }

  // Обработчик изменения текста с typing logic
  const handleInputChangeInternal = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    console.log(`📝 [MessageInput] handleInputChangeInternal: "${newValue}"`)
    onChange(newValue)

    // Обрабатываем typing через новый хук
    console.log(`📝 [MessageInput] Вызываем handleTypingChange`)
    handleTypingChange(newValue)
  }

  const handleEmojiSelect = (emoji: string) => {
    const newValue = value + emoji
    onChange(newValue)

    // Фокус на input после выбора emoji
    if (inputRef.current) {
      inputRef.current.focus()
      // Установка курсора в конец
      const len = newValue.length
      inputRef.current.setSelectionRange(len, len)
    }
  }

  const handleAutocompleteEmojiSelect = (emoji: string) => {
    // Заменяем последний :shortcode: на emoji
    const colonMatch = value.match(/:([^:\s]+)$/)
    if (colonMatch) {
      const shortcode = colonMatch[0]
      const newValue = value.replace(shortcode, emoji)
      onChange(newValue)

      // Фокус на input
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }
  }

  const toggleEmojiPicker = () => {
    // Emoji picker toggle
    setShowEmojiPicker(!showEmojiPicker)
  }

  return (
    <div className="p-4 bg-card border-t border-border relative">
      <form onSubmit={handleSubmit} className="flex space-x-2">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleInputChangeInternal}
            placeholder="Напишите сообщение..."
            disabled={sending || disabled}
            className="w-full px-4 py-2 pr-12 border border-border bg-background text-foreground rounded-lg focus:ring-0 focus:border-border placeholder:text-muted-foreground disabled:opacity-50"
          />

          {/* Кнопка emoji */}
          <button
            type="button"
            onClick={toggleEmojiPicker}
            disabled={sending || disabled}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
        </div>

        <button
          type="submit"
          disabled={!value.trim() || sending || disabled}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {sending ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </form>

      {/* Emoji Autocomplete */}
      <EmojiAutocomplete
        inputValue={value}
        onEmojiSelect={handleAutocompleteEmojiSelect}
        onClose={() => {}} // Автоматически закрывается при выборе
      />

      {/* Emoji Picker */}
      <div data-emoji-picker>
        <EmojiPicker
          onEmojiSelect={handleEmojiSelect}
          isOpen={showEmojiPicker}
          onClose={() => setShowEmojiPicker(false)}
        />
      </div>
    </div>
  )
})

MessageInput.displayName = 'MessageInput'