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
    <div className="flex items-center justify-center my-4">
      <div className="bg-muted/50 border border-muted rounded-full px-4 py-1">
        <span className="text-sm text-muted-foreground font-medium">
          {displayText}
        </span>
      </div>
    </div>
  )
}
