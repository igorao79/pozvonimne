import React, { useState, useRef, useImperativeHandle, forwardRef, useCallback } from 'react'
import { EmojiPicker } from './EmojiPicker'
import { EmojiAutocomplete } from './EmojiAutocomplete'
import { useTyping } from '@/hooks/useTyping'
import { VoiceMessageInput } from '@/components/Chat/ChatInterface/VoiceMessageInput'

interface MessageInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  onVoiceSubmit?: (audioBlob: Blob, duration: number) => void
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
  onVoiceSubmit,
  sending,
  disabled = false,
  chatId
}, ref) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isVoiceMode, setIsVoiceMode] = useState(false)

  // 🚀 МГНОВЕННЫЙ ОТКЛИК: Локальное состояние для UI
  const [localValue, setLocalValue] = useState(value)

  // Синхронизация с внешним значением при изменении извне
  React.useEffect(() => {
    setLocalValue(value)
  }, [value])

  // 🚀 ОПТИМИЗАЦИЯ: Мемоизируем тяжелые значения
  const inputDisabled = sending || disabled
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Используем простой typing hook с отложенным значением
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
    
    console.log(`📨 [MessageInput] Отправляем сообщение: "${localValue}"`)

    // Преобразуем emoji shortcodes в emoji перед отправкой
    const convertedValue = convertEmojiShortcodes(localValue)

    // Если текст изменился после преобразования, обновляем значение
    if (convertedValue !== localValue) {
      setLocalValue(convertedValue)
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

  // 🚀 МГНОВЕННЫЙ ОБРАБОТЧИК: UI обновляется сразу, typing асинхронно
  const handleInputChangeInternal = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value

    // 🚀 ПРИОРИТЕТ 1: Мгновенное обновление UI (локальное состояние)
    setLocalValue(newValue)

    // 🚀 ПРИОРИТЕТ 2: Обновление внешнего состояния (синхронно)
    onChange(newValue)

    // 🚀 ПРИОРИТЕТ 3: Typing обновляется асинхронно (не блокирует UI)
    handleTypingChange(newValue)
  }, [onChange, handleTypingChange])


  // Мемоизированные обработчики для предотвращения ненужных ререндеров
  const handleEmojiSelect = useCallback((emoji: string) => {
    const newValue = localValue + emoji
    setLocalValue(newValue)
    onChange(newValue)

    // Фокус на input после выбора emoji
    if (inputRef.current) {
      inputRef.current.focus()
      // Установка курсора в конец
      const len = newValue.length
      inputRef.current.setSelectionRange(len, len)
    }
  }, [localValue, onChange])

  const handleAutocompleteEmojiSelect = useCallback((emoji: string) => {
    // Заменяем последний :shortcode: на emoji
    const colonMatch = localValue.match(/:([^:\s]+)$/)
    if (colonMatch) {
      const shortcode = colonMatch[0]
      const newValue = localValue.replace(shortcode, emoji)
      setLocalValue(newValue)
      onChange(newValue)

      // Фокус на input
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }
  }, [localValue, onChange])

  const toggleEmojiPicker = useCallback(() => {
    // Emoji picker toggle
    setShowEmojiPicker(!showEmojiPicker)
  }, [showEmojiPicker])

  const toggleVoiceMode = useCallback(() => {
    setIsVoiceMode(!isVoiceMode)
    setShowEmojiPicker(false) // Закрываем emoji picker при переключении
  }, [isVoiceMode])


  return (
    <div className="p-4 bg-card border-t border-border relative">
      {isVoiceMode && onVoiceSubmit ? (
        <VoiceMessageInput
          onVoiceSubmit={(audioBlob: Blob, duration: number) => {
            if (onVoiceSubmit) {
              onVoiceSubmit(audioBlob, duration)
              setIsVoiceMode(false) // Возвращаемся в текстовый режим после отправки
            }
          }}
          disabled={inputDisabled}
          chatId={chatId}
        />
      ) : (
        <form onSubmit={handleSubmit} className="flex space-x-2">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={localValue}
            onChange={handleInputChangeInternal}
            placeholder="Напишите сообщение..."
            disabled={inputDisabled}
            className="w-full px-4 py-2 pr-12 border border-border bg-background text-foreground rounded-lg focus:ring-0 focus:border-border placeholder:text-muted-foreground disabled:opacity-50"
          />

          {/* Кнопка emoji */}
          <button
            type="button"
            onClick={toggleEmojiPicker}
            disabled={inputDisabled}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground hover:bg-secondary/50 hover:ring-1 hover:ring-secondary/30 transition-all duration-200 p-1 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
        </div>

        {/* Кнопка переключения режима */}
        <button
          type="button"
          onClick={toggleVoiceMode}
          disabled={inputDisabled}
          className="px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all duration-200 rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          title={isVoiceMode ? "Переключить на текстовый режим" : "Переключить на голосовой режим"}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </button>

        <button
          type="submit"
          disabled={!localValue.trim() || inputDisabled}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 hover:ring-2 hover:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
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
      )}

      {/* Emoji Autocomplete */}
      <EmojiAutocomplete
        inputValue={localValue}
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