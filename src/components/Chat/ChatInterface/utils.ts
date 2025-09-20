// Форматирование времени сообщения (только время без даты)
export const formatMessageTime = (timestamp: string) => {
  const messageDate = new Date(timestamp)
  return messageDate.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  })
}




