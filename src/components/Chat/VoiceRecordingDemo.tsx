'use client'

import React, { useState } from 'react'
import { VoiceRecordingIndicator, VoiceRecordingIcon, VoiceRecordingIndicators } from './VoiceRecordingIndicator'
import { useVoiceRecording } from '@/hooks/useVoiceRecording'
import { useVoiceRecordingUsers, useIsUserRecording } from '@/hooks/useVoiceRecordingSelectors'
import useCallStore from '@/store/useCallStore'

interface VoiceRecordingDemoProps {
  chatId: string
}

export const VoiceRecordingDemo: React.FC<VoiceRecordingDemoProps> = ({ chatId }) => {
  const { userId } = useCallStore()
  const [isRecording, setIsRecording] = useState(false)

  // Хук для управления записью
  const { startRecording, stopRecording } = useVoiceRecording({
    chatId,
    enabled: true
  })

  // Селекторы для отображения состояния
  const recordingUsers = useVoiceRecordingUsers(chatId)
  const isCurrentUserRecording = useIsUserRecording(chatId, userId || '')
  const isAnyoneRecording = recordingUsers.length > 0

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording()
      setIsRecording(false)
    } else {
      startRecording()
      setIsRecording(true)
    }
  }

  return (
    <div className="p-6 space-y-6 bg-card rounded-lg border">
      <h3 className="text-lg font-semibold">Демо системы записи голосовых сообщений</h3>
      
      {/* Управление записью */}
      <div className="space-y-4">
        <h4 className="font-medium">Управление:</h4>
        <div className="flex items-center space-x-4">
          <button
            onClick={handleToggleRecording}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isRecording
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {isRecording ? 'Остановить запись' : 'Начать запись'}
          </button>
          
          {isRecording && (
            <div className="flex items-center space-x-2 text-red-500">
              <VoiceRecordingIcon size="sm" />
              <span className="text-sm font-medium">Записываем...</span>
            </div>
          )}
        </div>
      </div>

      {/* Индикаторы */}
      <div className="space-y-4">
        <h4 className="font-medium">Индикаторы:</h4>
        <div className="space-y-3">
          <div className="flex items-center space-x-4">
            <span className="text-sm w-20">Полный:</span>
            <VoiceRecordingIndicator size="md" />
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm w-20">Иконка:</span>
            <VoiceRecordingIcon size="md" />
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm w-20">Микрофон:</span>
            <VoiceRecordingIcon size="md" />
          </div>
        </div>
      </div>

      {/* Статус */}
      <div className="space-y-4">
        <h4 className="font-medium">Статус чата:</h4>
        <div className="bg-muted p-4 rounded-lg space-y-2">
          <div>
            <span className="text-sm font-medium">Записывают пользователей: </span>
            <span className="text-sm">{recordingUsers.length}</span>
          </div>
          
          <div>
            <span className="text-sm font-medium">Кто-то записывает: </span>
            <span className="text-sm">{isAnyoneRecording ? 'Да' : 'Нет'}</span>
          </div>
          
          <div>
            <span className="text-sm font-medium">Текущий пользователь записывает: </span>
            <span className="text-sm">{isCurrentUserRecording ? 'Да' : 'Нет'}</span>
          </div>
          
          <div>
            <span className="text-sm font-medium">ID записывающих: </span>
            <span className="text-xs font-mono">{JSON.stringify(recordingUsers)}</span>
          </div>
        </div>
      </div>

      {/* Тест VoiceRecordingIndicators компонента */}
      <div className="space-y-4">
        <h4 className="font-medium">Тест VoiceRecordingIndicators:</h4>
        <div className="space-y-3">
          <div className="flex items-center space-x-4">
            <span className="text-sm w-40">Исключая текущего:</span>
            <VoiceRecordingIndicators
              chatId={chatId}
              excludeCurrentUser={true}
              currentUserId={userId || undefined}
              size="sm"
            />
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-sm w-40">Включая всех:</span>
            <VoiceRecordingIndicators
              chatId={chatId}
              excludeCurrentUser={false}
              currentUserId={userId || undefined}
              size="sm"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
