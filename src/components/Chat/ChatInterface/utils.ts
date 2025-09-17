// Форматирование времени сообщения
export const formatMessageTime = (timestamp: string) => {
  const messageDate = new Date(timestamp)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const msgDate = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate())

  if (msgDate.getTime() === today.getTime()) {
    return messageDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }

  const diffInDays = Math.floor((today.getTime() - msgDate.getTime()) / (1000 * 60 * 60 * 24))
  if (diffInDays === 1) {
    return `вчера ${messageDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
  }

  return messageDate.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}



