'use client'

import { useEffect, useState } from 'react'

interface ExternalLinkModalState {
  isOpen: boolean
  url: string
}

export const useExternalLinks = () => {
  const [modalState, setModalState] = useState<ExternalLinkModalState>({
    isOpen: false,
    url: ''
  })

  const isExternalLink = (url: string): boolean => {
    try {
      const link = new URL(url, window.location.origin)
      const currentDomain = window.location.hostname
      
      // Проверяем, является ли ссылка внешней
      return link.hostname !== currentDomain && 
             !link.hostname.endsWith('.pozvonimne.vercel.app') &&
             link.hostname !== 'pozvonimne.vercel.app'
    } catch {
      // Если URL невалидный, считаем его внутренним
      return false
    }
  }

  const handleLinkClick = (event: Event) => {
    const target = event.target as HTMLElement
    const link = target.closest('a')
    
    if (!link || !link.href) return
    
    // Пропускаем ссылки с data-external-allowed="true" 
    if (link.dataset.externalAllowed === 'true') {
      return
    }

    // Для ссылок в сообщениях чата, показываем модальное окно только для внешних ссылок
    if (link.dataset.externalAllowed === 'false' && isExternalLink(link.href)) {
      // Продолжаем обработку - покажем модальное окно
    } else if (link.target === '_blank' || link.rel.includes('noopener')) {
      // Пропускаем ссылки, которые уже настроены на открытие в новой вкладке
      return
    }

    if (isExternalLink(link.href)) {
      event.preventDefault()
      event.stopPropagation()
      
      setModalState({
        isOpen: true,
        url: link.href
      })
    }
  }

  const closeModal = () => {
    setModalState({
      isOpen: false,
      url: ''
    })
  }

  const confirmNavigation = () => {
    if (modalState.url) {
      window.open(modalState.url, '_blank', 'noopener,noreferrer')
    }
    closeModal()
  }

  useEffect(() => {
    // Добавляем обработчик событий для всех кликов по ссылкам
    const handleClick = (event: Event) => {
      handleLinkClick(event)
    }

    // Используем capture phase для перехвата событий раньше других обработчиков
    document.addEventListener('click', handleClick, true)

    return () => {
      document.removeEventListener('click', handleClick, true)
    }
  }, [])

  return {
    modalState,
    closeModal,
    confirmNavigation,
    isExternalLink
  }
}
