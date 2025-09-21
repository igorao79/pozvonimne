import { useRef, useCallback, useEffect, useState } from 'react'
import useSupabaseStore from '@/store/useSupabaseStore'
import useCallStore from '@/store/useCallStore'

interface SoundNotificationState {
  isTabVisible: boolean
  lastNotificationTime: number
  currentChatId: string | null
  audioElement: HTMLAudioElement | null
  soundUrl: string | null
  userHasInteracted: boolean
}

export const useSoundNotifications = () => {
  const { supabase } = useSupabaseStore()
  const { userId } = useCallStore()
  
  const [state, setState] = useState<SoundNotificationState>({
    isTabVisible: true,
    lastNotificationTime: 0,
    currentChatId: null,
    audioElement: null,
    soundUrl: null,
    userHasInteracted: false
  })

  // Загружаем звуковой файл из Supabase storage
  useEffect(() => {
    console.log('🔊 Начинаем загрузку звукового файла...')
    
    const loadSoundFile = async () => {
      try {
        console.log('🔊 Пробуем загрузить звук из Supabase storage...')
        
        // Пробуем получить публичный URL
        const { data: publicUrlData } = supabase.storage
          .from('sounds')
          .getPublicUrl('message.wav')

        console.log('🔊 Public URL result:', publicUrlData)
        let audioUrl = publicUrlData?.publicUrl

        // Если публичный URL не работает, пробуем signed URL
        if (!audioUrl) {
          console.log('🔊 Пробуем получить signed URL...')
          const { data: signedData, error: signedError } = await supabase.storage
            .from('sounds')
            .createSignedUrl('message.wav', 3600)

          console.log('🔊 Signed URL result:', { signedData, signedError })

          if (signedError) {
            console.warn('⚠️ Ошибка получения signed URL:', signedError)
            // Fallback - создаем простой звук через Web Audio API
            createFallbackSound()
            return
          }

          audioUrl = signedData?.signedUrl
        }

        if (audioUrl) {
          console.log('🔊 Создаем Audio элемент с URL:', audioUrl)
          const audio = new Audio(audioUrl)
          audio.preload = 'auto'
          audio.volume = 0.7
          
          // Проверяем, что файл действительно загрузился
          audio.addEventListener('canplaythrough', () => {
            console.log('🔊 Звуковой файл уведомлений загружен из Supabase')
          })

          audio.addEventListener('error', (e) => {
            console.warn('⚠️ Ошибка загрузки аудио файла:', e)
            createFallbackSound()
          })
          
          setState(prev => ({
            ...prev,
            audioElement: audio,
            soundUrl: audioUrl
          }))
          
          console.log('🔊 Звуковой файл готов для использования')
        } else {
          console.warn('⚠️ Не удалось получить URL звукового файла, используем fallback')
          createFallbackSound()
        }
      } catch (error) {
        console.error('❌ Ошибка загрузки звукового файла:', error)
        createFallbackSound()
      }
    }

    // Создаем простой звук через Web Audio API как fallback
    const createFallbackSound = () => {
      try {
        // Создаем простой синтезированный звук уведомления
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        
        const createBeep = () => {
          const oscillator = audioContext.createOscillator()
          const gainNode = audioContext.createGain()
          
          oscillator.connect(gainNode)
          gainNode.connect(audioContext.destination)
          
          oscillator.frequency.value = 800 // Частота звука
          gainNode.gain.setValueAtTime(0, audioContext.currentTime)
          gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1)
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
          
          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 0.5)
        }
        
        // Создаем mock audio element с функцией воспроизведения
        const mockAudio = {
          currentTime: 0,
          play: async () => {
            if (audioContext.state === 'suspended') {
              await audioContext.resume()
            }
            createBeep()
            return Promise.resolve()
          }
        }
        
        setState(prev => ({
          ...prev,
          audioElement: mockAudio as HTMLAudioElement,
          soundUrl: 'fallback-web-audio'
        }))
        
        console.log('🔊 Использован fallback звук через Web Audio API')
        console.log('🔊 Fallback звук готов для использования')
      } catch (fallbackError) {
        console.error('❌ Не удалось создать fallback звук:', fallbackError)
      }
    }

    // Сначала создаем fallback звук, потом пробуем загрузить из Supabase
    createFallbackSound()
    
    // Пробуем загрузить настоящий звук (асинхронно)
    loadSoundFile()
  }, [supabase])

  // Отслеживание видимости вкладки
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden
      setState(prev => ({ ...prev, isTabVisible: isVisible }))
      
      console.log('👁️ Вкладка:', isVisible ? 'видимая' : 'скрытая')
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Проверяем начальное состояние
    handleVisibilityChange()

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Отслеживание первого взаимодействия пользователя для разрешения автоматического воспроизведения
  useEffect(() => {
    const handleFirstInteraction = () => {
      setState(prev => ({ ...prev, userHasInteracted: true }))
      console.log('👆 Пользователь взаимодействовал со страницей - звуковые уведомления разрешены')
      
      // Удаляем обработчики после первого взаимодействия
      document.removeEventListener('click', handleFirstInteraction)
      document.removeEventListener('keydown', handleFirstInteraction)
      document.removeEventListener('touchstart', handleFirstInteraction)
    }

    // Добавляем обработчики для различных типов взаимодействий
    document.addEventListener('click', handleFirstInteraction)
    document.addEventListener('keydown', handleFirstInteraction)
    document.addEventListener('touchstart', handleFirstInteraction)

    return () => {
      document.removeEventListener('click', handleFirstInteraction)
      document.removeEventListener('keydown', handleFirstInteraction)
      document.removeEventListener('touchstart', handleFirstInteraction)
    }
  }, [])

  // Функция для установки текущего чата
  const setCurrentChat = useCallback((chatId: string | null) => {
    setState(prev => ({ ...prev, currentChatId: chatId }))
    console.log('💬 Текущий активный чат:', chatId?.slice(0, 8) || 'нет')
  }, [])

  // Функция для воспроизведения звука
  const playNotificationSound = useCallback(async () => {
    const { audioElement, userHasInteracted } = state
    
    if (!audioElement) {
      console.warn('🔇 Звуковой файл не загружен')
      return false
    }

    if (!userHasInteracted) {
      console.warn('🔇 Звук не может быть воспроизведен - пользователь еще не взаимодействовал со страницей')
      return false
    }

    try {
      // Сброс на начало для возможности повторного воспроизведения
      audioElement.currentTime = 0
      await audioElement.play()
      console.log('🔊 Звуковое уведомление воспроизведено')
      return true
    } catch (error) {
      // Обрабатываем различные типы ошибок
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          console.warn('🔇 Воспроизведение заблокировано браузером - требуется взаимодействие пользователя')
        } else if (error.name === 'NotSupportedError') {
          console.warn('🔇 Формат звукового файла не поддерживается')
        } else {
          console.warn('🔇 Ошибка воспроизведения звука:', error.message)
        }
      } else {
        console.error('❌ Неизвестная ошибка воспроизведения звука:', error)
      }
      return false
    }
  }, [state.audioElement, state.userHasInteracted])

  // Основная функция для проверки условий и воспроизведения уведомления
  const maybePlayNotification = useCallback((messageData: {
    chatId: string
    senderId: string
    content: string
  }) => {
    const now = Date.now()
    const { isTabVisible, lastNotificationTime, currentChatId, userHasInteracted } = state
    
    // Проверяем, что сообщение не от нас
    if (messageData.senderId === userId) {
      console.log('🚫 Сообщение от нас самих - уведомление не нужно')
      return false
    }

    // Проверяем, взаимодействовал ли пользователь со страницей
    if (!userHasInteracted) {
      console.log('🔇 Звуковое уведомление пропущено - пользователь еще не взаимодействовал со страницей')
      return false
    }

    // Проверяем интервал между уведомлениями (10 секунд)
    if (now - lastNotificationTime < 10000) {
      console.log('⏱️ Слишком рано для нового уведомления (менее 10 сек)')
      return false
    }

    // ОСНОВНОЕ ПРАВИЛО: НЕ воспроизводим звук ТОЛЬКО если пользователь находится в том же чате, откуда пришло сообщение
    if (isTabVisible && currentChatId && currentChatId === messageData.chatId) {
      console.log('🔇 Пользователь в активном чате, откуда пришло сообщение - уведомление НЕ нужно')
      return false
    }

    // ВО ВСЕХ ОСТАЛЬНЫХ СЛУЧАЯХ воспроизводим звук:
    let reason = ''
    if (!isTabVisible) {
      reason = 'Пользователь не на вкладке сайта'
    } else if (!currentChatId) {
      reason = 'Пользователь на сайте, но не в чате'
    } else if (currentChatId !== messageData.chatId) {
      reason = 'Пользователь в другом чате'
    }

    console.log(`🔊 Воспроизводим звук: ${reason}`)
    console.log(`🔊 Детали: isTabVisible=${isTabVisible}, currentChatId=${currentChatId?.slice(0, 8)}, messageFromChat=${messageData.chatId?.slice(0, 8)}`)
    
    playNotificationSound()
    setState(prev => ({ ...prev, lastNotificationTime: now }))
    return true
  }, [state, userId, playNotificationSound])

  // Функция для тестирования звука
  const testSound = useCallback(async () => {
    console.log('🧪 Тестирование звука уведомлений')
    const success = await playNotificationSound()
    console.log('🧪 Результат теста:', success ? 'успешно' : 'ошибка')
    return success
  }, [playNotificationSound])

  return {
    setCurrentChat,
    maybePlayNotification,
    testSound,
    isTabVisible: state.isTabVisible,
    currentChatId: state.currentChatId,
    soundLoaded: !!state.audioElement,
    userHasInteracted: state.userHasInteracted
  }
}
