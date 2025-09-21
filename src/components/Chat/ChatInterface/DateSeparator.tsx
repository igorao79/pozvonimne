import React, { useState, useEffect } from 'react'

interface DateSeparatorProps {
  date: string // ISO string даты
}

export const DateSeparator: React.FC<DateSeparatorProps> = ({ date }) => {
  // Состояние для принудительного обновления компонента
  const [, forceUpdate] = useState(0)

  // Обновляем компонент для корректного отображения "Сегодня"/"Вчера"
  useEffect(() => {
    const now = new Date()
    const minutesUntilMidnight = (24 * 60) - (now.getHours() * 60 + now.getMinutes())

    // Если до полуночи меньше 30 минут, обновляем каждую минуту
    // Иначе обновляем каждые 10 минут
    const updateInterval = minutesUntilMidnight <= 30 ? 60 * 1000 : 10 * 60 * 1000

    const interval = setInterval(() => {
      forceUpdate(prev => prev + 1)
    }, updateInterval)

    return () => clearInterval(interval)
  }, [])
  // Форматируем дату в формат DD.MM.YYYY
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()

    return `${day}.${month}.${year}`
  }

  // Получаем стабильную дату на основе клиентского времени
  const getClientLocalDateString = (dateString: string) => {
    const clientDate = new Date(dateString)
    const year = clientDate.getFullYear()
    const month = String(clientDate.getMonth() + 1).padStart(2, '0')
    const day = String(clientDate.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Проверяем, является ли дата сегодняшней (клиентское время)
  const isToday = (dateString: string) => {
    const messageDate = getClientLocalDateString(dateString)
    const todayDate = getClientLocalDateString(new Date().toISOString())
    
    return messageDate === todayDate
  }

  // Проверяем, является ли дата вчерашней (клиентское время)
  const isYesterday = (dateString: string) => {
    const messageDate = getClientLocalDateString(dateString)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayDate = getClientLocalDateString(yesterday.toISOString())
    
    return messageDate === yesterdayDate
  }

  // Получаем читаемое представление даты
  const getDisplayDate = (dateString: string) => {
    const todayCheck = isToday(dateString)
    const yesterdayCheck = isYesterday(dateString)

    if (todayCheck) {
      return 'Сегодня'
    }

    if (yesterdayCheck) {
      return 'Вчера'
    }

    return formatDate(dateString)
  }

  const displayText = getDisplayDate(date)

  // Всегда отображаем плашку с соответствующим текстом

  return (
    <div className="flex items-center justify-center my-6 px-4">
      {/* Левая разделительная линия */}
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-400 dark:via-slate-700 to-transparent"></div>

      {/* Центральный элемент с текстом */}
      <div className="mx-4 bg-white/70 dark:bg-slate-900/70 border border-slate-300 dark:border-slate-600 rounded-full px-4 py-1.5 shadow-sm backdrop-blur-sm">
        <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold tracking-wide uppercase">
          {displayText}
        </span>
      </div>

      {/* Правая разделительная линия */}
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-400 dark:via-slate-700 to-transparent"></div>
    </div>
  )
}
