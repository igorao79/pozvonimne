import React from 'react'
import { Message, Chat } from './types'
import { formatMessageTime } from './utils'
import { MessageContextMenu } from './MessageContextMenu'
import { SimpleMessageStatus } from './SimpleMessageStatus'
import { VoiceMessageItem } from './VoiceMessageItem'
import { useMessageVisibility, useMessageReadTracking } from '@/hooks/useMessageVisibility'
import { useSinglePremiumData } from '@/hooks/usePremiumData'
import { PremiumNickname } from '@/components/ui'
import LinkRenderer from '../MessageContent/LinkRenderer'
// CallMessage импортируется в MessagesArea, а не здесь

interface MessageItemProps {
  message: Message
  chat: Chat
  userId?: string
  onClick?: () => void
  onEdit?: (messageId: string, currentContent: string) => void
  onDelete?: (messageId: string) => void
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  chat,
  userId,
  onClick,
  onEdit,
  onDelete
}) => {
  const isOwn = message.sender_id === userId
  
  // Получаем премиум данные для отправителя сообщения
  const { premiumData: senderPremiumData } = useSinglePremiumData(
    !isOwn ? message.sender_id : null
  )

  // Отслеживание видимости сообщения для пометки как прочитанное
  const { elementRef, isVisible } = useMessageVisibility({
    threshold: 0.5, // 50% сообщения должно быть видно
    rootMargin: '0px 0px -20px 0px', // Небольшой отступ снизу
    triggerOnce: true // Пометить как прочитанное только один раз
  })

  // Пометка сообщения как прочитанного при его видимости
  useMessageReadTracking({
    messageId: message.id,
    isOwn,
    isVisible,
    userId,
    chatId: chat.id
  })

  // ВРЕМЕННО ОТКЛЮЧЕНО: Проверка статуса прочтения
  // const isReadByOtherUser = () => {
  //   if (!message.read_by || isOwn) return false
  //   
  //   // Для приватных чатов проверяем прочитал ли собеседник
  //   if (chat.type === 'private' && chat.other_participant_id) {
  //     return Boolean(message.read_by[chat.other_participant_id])
  //   }
  //   
  //   // Для групповых чатов проверяем прочитал ли хотя бы один участник
  //   return Object.keys(message.read_by).length > 0
  // }

  // Форматирование времени редактирования
  const formatEditTime = (editedAt: string) => {
    const date = new Date(editedAt)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return 'только что'
    if (diffInMinutes < 60) return `${diffInMinutes} мин назад`

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours} ч назад`

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays} д назад`

    return date.toLocaleDateString('ru-RU')
  }



  // Удаленные сообщения
  if (message.is_deleted) {
    return (
      <div
        key={`${message.id}-${message.updated_at}`}
        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
        onClick={onClick}
      >
    <div className={`max-w-[70vw] min-w-[120px] px-4 py-2 rounded-lg break-words overflow-hidden ${
      isOwn
        ? 'bg-primary/50 text-primary-foreground/50'
        : 'bg-muted text-muted-foreground border border-border/50'
    }`}>
          <p className="text-sm italic message-content">[Сообщение удалено]</p>
          <p className={`text-xs mt-1 ${
            isOwn ? 'text-indigo-200/50 dark:text-indigo-100/50' : 'text-muted-foreground/50'
          }`}>
            {formatMessageTime(message.created_at)}
          </p>
        </div>
      </div>
    )
  }

  // Обычные сообщения с контекстным меню
  const messageContent = (
    <div className={`max-w-[70vw] min-w-[120px] px-4 py-2 rounded-lg break-words overflow-hidden ${
      isOwn
        ? 'self-message-bg bg-primary text-primary-foreground'
        : 'other-message-bg bg-card text-foreground border border-border'
    }`}>
      {!isOwn && chat.type === 'group' && (
        <div className="mb-1">
          <PremiumNickname 
            displayName={message.sender_name}
            premiumData={senderPremiumData}
            showIcon={true}
            showGlow={false}
            className="text-xs"
          />
        </div>
      )}

      {/* Рендеринг содержимого в зависимости от типа сообщения */}
      {message.type === 'voice' ? (
        <VoiceMessageItem
          audioUrl={message.metadata?.audio_url || ''}
          duration={message.metadata?.duration || 0}
          isOwn={isOwn}
        />
      ) : (
        <LinkRenderer
          content={message.content}
          isOwn={isOwn}
        />
      )}

      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center space-x-2">
          {/* Статус сообщения с галочками */}
          <SimpleMessageStatus
            isOwn={isOwn}
            sentAt={formatMessageTime(message.created_at)}
            deliveredAt={message.delivered_at}
            readAt={message.read_at}
          />
        </div>

        {/* Метка редактирования */}
        {message.edited_at && (
          <p className={`text-xs ${
            isOwn ? 'text-indigo-200/70 dark:text-indigo-100/70' : 'text-muted-foreground/70'
          }`}>
            (ред. {formatEditTime(message.edited_at)})
          </p>
        )}
      </div>
    </div>
  )

  return (
    <MessageContextMenu
      key={message.id}
      message={message}
      userId={userId}
      onEdit={onEdit}
      onDelete={onDelete}
    >
      <div
        ref={elementRef}
        id={message.id} // Добавляем ID для отладки
        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
        onClick={onClick}
      >
        {messageContent}
      </div>
    </MessageContextMenu>
  )
}



