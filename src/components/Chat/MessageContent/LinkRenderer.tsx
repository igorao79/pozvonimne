'use client'

import React from 'react'
import { ExternalLink } from 'lucide-react'
import useThemeStore from '@/store/useThemeStore'

interface LinkRendererProps {
  content: string
  isOwn: boolean
  className?: string
}

const LinkRenderer: React.FC<LinkRendererProps> = ({ content, isOwn, className = '' }) => {
  const { theme } = useThemeStore()

  // Функция для преобразования текста в элементы React с ссылками
  const renderContentWithLinks = (text: string) => {
    if (!text) return text

    // Более простое и надежное регулярное выражение для URL
    const urlRegex = /(https?:\/\/[^\s]+)|(\b[a-zA-Z0-9][-a-zA-Z0-9]*[a-zA-Z0-9]*\.)+[a-zA-Z]{2,}\b/g
    
    const elements: React.ReactNode[] = []
    let lastIndex = 0
    let match

    // Используем exec для поиска всех совпадений
    while ((match = urlRegex.exec(text)) !== null) {
      // Добавляем текст перед ссылкой
      if (match.index > lastIndex) {
        elements.push(
          <span key={`text-${lastIndex}`}>
            {text.slice(lastIndex, match.index)}
          </span>
        )
      }

      // Обрабатываем найденную ссылку
      const foundUrl = match[0]
      let normalizedUrl = foundUrl

      // Нормализуем URL (добавляем протокол если отсутствует)
      if (!foundUrl.startsWith('http://') && !foundUrl.startsWith('https://')) {
        normalizedUrl = `https://${foundUrl}`
      }

      // Проверяем, является ли ссылка внешней
      const isExternalLink = !normalizedUrl.includes('pozvonimne.vercel.app')

      elements.push(
        <a
          key={`link-${match.index}`}
          href={normalizedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`
            inline-flex items-center gap-1 underline decoration-2 underline-offset-2
            transition-colors duration-200 hover:no-underline
            ${isOwn 
              ? `text-blue-100 hover:text-white decoration-blue-200 hover:decoration-white
                 ${theme === 'dark' ? 'hover:bg-blue-600/20' : 'hover:bg-blue-700/20'}`
              : `text-blue-600 hover:text-blue-800 decoration-blue-400 hover:decoration-blue-600
                 ${theme === 'dark' 
                   ? 'dark:text-blue-400 dark:hover:text-blue-300 dark:decoration-blue-500 dark:hover:decoration-blue-400' 
                   : ''
                 }`
            }
            rounded px-1 -mx-1
          `}
          // Добавляем атрибут для модального окна внешних ссылок
          data-external-allowed={isExternalLink ? "false" : "true"}
        >
          <span className="break-all">{foundUrl}</span>
          {isExternalLink && (
            <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-75" />
          )}
        </a>
      )

      lastIndex = match.index + match[0].length
    }

    // Добавляем оставшийся текст после последней ссылки
    if (lastIndex < text.length) {
      elements.push(
        <span key={`text-${lastIndex}`}>
          {text.slice(lastIndex)}
        </span>
      )
    }

    // Если ссылки не найдены, возвращаем исходный текст
    return elements.length > 0 ? elements : text
  }

  return (
    <span className={`text-sm message-content ${className}`}>
      {renderContentWithLinks(content)}
    </span>
  )
}

export default LinkRenderer
