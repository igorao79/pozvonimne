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
  soundLoaded: boolean // Флаг, что настоящий звук загружен
}

// Глобальный кэш для звукового файла - загружается только один раз за сессию
interface SoundCache {
  audioElement: HTMLAudioElement | null
  soundUrl: string | null
  isLoading: boolean
  isLoaded: boolean
  promise: Promise<void> | null
  fallbackAudio: HTMLAudioElement | null // Fallback звук для немедленного использования
  isInitialized: boolean // Флаг, что инициализация уже прошла
}

// Кэш для звука завершения звонка
interface EndCallSoundCache {
  audioElement: HTMLAudioElement | null
  soundUrl: string | null
  isLoading: boolean
  isLoaded: boolean
  promise: Promise<void> | null
  isInitialized: boolean
}

const globalSoundCache: SoundCache = {
  audioElement: null,
  soundUrl: null,
  isLoading: false,
  isLoaded: false,
  promise: null,
  fallbackAudio: null,
  isInitialized: false
}

const globalEndCallSoundCache: EndCallSoundCache = {
  audioElement: null,
  soundUrl: null,
  isLoading: false,
  isLoaded: false,
  promise: null,
  isInitialized: false
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
    userHasInteracted: false,
    soundLoaded: false
  })

  // 🔥 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: ФОРСИРОВАННАЯ инициализация звуков с детальной отладкой
  useEffect(() => {
    const initStartTime = performance.now()
    console.log('🔊🔥 НАЧАЛО ИНИЦИАЛИЗАЦИИ звуковых уведомлений:', new Date().toLocaleTimeString())
    
    // Если уже инициализировано глобально - просто используем кэш
    if (globalSoundCache.isInitialized) {
      console.log('🔊 Звуковая система уже инициализирована, используем кэш')
      setState(prev => ({
        ...prev,
        audioElement: globalSoundCache.fallbackAudio,
        soundUrl: 'fallback-web-audio',
        userHasInteracted: true // 🔥 ПРИНУДИТЕЛЬНО активируем звук!
      }))
      console.log('🔊✅ Звуковые уведомления ГОТОВЫ из кэша за:', Math.round(performance.now() - initStartTime), 'мс')
      return
    }

    // Первая инициализация за сессию
    console.log('🔊🔥 ПЕРВИЧНАЯ инициализация звуковых уведомлений...')
    globalSoundCache.isInitialized = true

    // Создаем fallback звук (Web Audio API) для немедленного использования
    createFallbackSound(true) // true = сохранить в кэш
    
    // 🔥 ПРИНУДИТЕЛЬНО активируем звуки сразу!
    setState(prev => ({
      ...prev,
      userHasInteracted: true
    }))

    // Загружаем звук завершения звонка
    loadEndCallSound()

    console.log('🔊✅ Звуковые уведомления ПРИНУДИТЕЛЬНО АКТИВИРОВАНЫ за:', Math.round(performance.now() - initStartTime), 'мс')
  }, [])

  // Ленивая загрузка настоящего звука только после первого взаимодействия пользователя
  useEffect(() => {
    if (state.userHasInteracted && !globalSoundCache.isLoaded && !globalSoundCache.isLoading) {
      console.log('🔊 Пользователь взаимодействовал - начинаем загрузку настоящего звука...')

      const loadRealSound = async () => {
        globalSoundCache.isLoading = true

        try {
          console.log('🔊 Пробуем загрузить настоящий звук из Supabase storage bucket "sounds"...')
          
          let audioUrl: string | null = null
          let loadMethod = 'unknown'

          // 1. Сначала пробуем прямой URL (самый надежный способ)
          // Получаем базовый URL через API getPublicUrl
          const { data: tempUrlData } = supabase.storage.from('sounds').getPublicUrl('temp')
          const baseUrl = tempUrlData?.publicUrl?.replace('/storage/v1/object/public/sounds/temp', '') || 'https://uasoayoovlureephzkns.supabase.co'
          const directUrl = `${baseUrl}/storage/v1/object/public/sounds/message.wav`
          console.log('🔊 Пробуем прямой URL:', directUrl)
          console.log('🔊 Извлечённый базовый URL:', baseUrl)
          
          try {
            const directResponse = await fetch(directUrl, { method: 'HEAD' })
            console.log('🔊 Проверка прямого URL:', {
              status: directResponse.status,
              statusText: directResponse.statusText,
              contentType: directResponse.headers.get('content-type')
            })
            
            if (directResponse.ok) {
              audioUrl = directUrl
              loadMethod = 'direct URL'
              console.log('✅ Прямой URL работает!')
            }
          } catch (directError) {
            console.log('⚠️ Прямой URL не работает:', directError)
          }

          // 2. Если прямой URL не работает, пробуем API getPublicUrl
          if (!audioUrl) {
            console.log('🔊 Пробуем API getPublicUrl...')
            const { data: publicUrlData } = supabase.storage
              .from('sounds')
              .getPublicUrl('message.wav')

            console.log('🔊 API Public URL result:', publicUrlData)
            
            if (publicUrlData?.publicUrl) {
              audioUrl = publicUrlData.publicUrl
              loadMethod = 'API public URL'
              console.log('✅ Получен API публичный URL:', audioUrl.substring(0, 80) + '...')
            }
          }

          // 3. Попытка через signed URL
          if (!audioUrl) {
            console.log('🔊 Пробуем signed URL...')
            const { data: signedData, error: signedError } = await supabase.storage
              .from('sounds')
              .createSignedUrl('message.wav', 3600)

            console.log('🔊 Signed URL result:', { signedData, signedError })
            
            if (signedData?.signedUrl) {
              audioUrl = signedData.signedUrl
              loadMethod = 'signed URL'
              console.log('✅ Получен signed URL:', audioUrl.substring(0, 80) + '...')
            }
          }

          // 4. Последний шанс - фиксированный URL (который точно работает)
          if (!audioUrl) {
            console.log('🔊 Последняя попытка - фиксированный URL...')
            const fixedUrl = 'https://uasoayoovlureephzkns.supabase.co/storage/v1/object/public/sounds/message.wav'
            
            try {
              const fixedResponse = await fetch(fixedUrl, { method: 'HEAD' })
              if (fixedResponse.ok) {
                audioUrl = fixedUrl
                loadMethod = 'fixed URL'
                console.log('✅ Фиксированный URL работает!')
              } else {
                console.error('❌ Даже фиксированный URL не работает:', fixedResponse.status)
              }
            } catch (fixedError) {
              console.error('❌ Ошибка фиксированного URL:', fixedError)
            }
          }

          if (!audioUrl) {
            console.error('❌ Исчерпаны все способы получения URL звукового файла')
            globalSoundCache.isLoading = false
            return
          }

          console.log(`🔊 Используем ${loadMethod} для загрузки звука:`, audioUrl.substring(0, 80) + '...')

          if (audioUrl) {
            console.log('🔊 Создаем настоящий Audio элемент с URL:', audioUrl.substring(0, 50) + '...')
            const audio = new Audio(audioUrl)
            audio.preload = 'auto'
            audio.volume = 1.0 // Максимальная громкость
            
            console.log('🔊 Настройки Audio элемента:', {
              src: audioUrl.substring(0, 80),
              volume: audio.volume,
              muted: audio.muted,
              preload: audio.preload
            })

            // Детальная диагностика загрузки
            const loadTimeout = setTimeout(() => {
              console.warn('⚠️ Таймаут загрузки звука (5 сек), возможно файл недоступен')
              globalSoundCache.isLoading = false
            }, 5000)

            // Проверяем, что файл действительно загрузился
            audio.addEventListener('canplaythrough', () => {
              console.log('✅ Настоящий звуковой файл загружен успешно из Supabase!')
              clearTimeout(loadTimeout)

              // Успешная загрузка - заменяем fallback на настоящий звук
              globalSoundCache.audioElement = audio
              globalSoundCache.soundUrl = audioUrl
              globalSoundCache.isLoaded = true
              globalSoundCache.isLoading = false
              
              console.log('🔊 КРИТИЧЕСКАЯ ДИАГНОСТИКА: Глобальный кэш обновлен:', {
                'globalSoundCache.audioElement': globalSoundCache.audioElement ? 'УСТАНОВЛЕН' : 'НЕТ',
                'globalSoundCache.soundUrl': globalSoundCache.soundUrl,
                'globalSoundCache.isLoaded': globalSoundCache.isLoaded,
                'audio.src': audio.src,
                'audio.readyState': audio.readyState
              })

              // Обновляем состояние компонента - заменяем fallback на настоящий звук
              setState(prev => ({
                ...prev,
                audioElement: audio, // Заменяем fallback на настоящий звук
                soundUrl: audioUrl,
                soundLoaded: true
              }))
              
              console.log('🔊 Состояние обновлено: fallback заменен на настоящий звук')

              console.log('🔊 Настоящий звуковой файл готов для использования и закэширован')
            })

            audio.addEventListener('loadstart', () => {
              console.log('🔄 Началась загрузка звукового файла...')
            })

            audio.addEventListener('progress', () => {
              console.log('📊 Загрузка звукового файла в процессе...')
            })

            audio.addEventListener('error', (e) => {
              console.warn('❌ Ошибка загрузки настоящего аудио файла:', {
                error: e,
                url: audioUrl.substring(0, 50) + '...',
                networkState: audio.networkState,
                readyState: audio.readyState,
                errorCode: audio.error?.code,
                errorMessage: audio.error?.message
              })
              clearTimeout(loadTimeout)
              globalSoundCache.isLoading = false
            })

            audio.addEventListener('abort', () => {
              console.warn('⚠️ Загрузка звукового файла была прервана')
              clearTimeout(loadTimeout)
              globalSoundCache.isLoading = false
            })
          } else {
            console.warn('⚠️ Не удалось получить URL настоящего звукового файла')
            globalSoundCache.isLoading = false
          }
        } catch (error) {
          console.error('❌ Ошибка загрузки настоящего звукового файла:', error)
          globalSoundCache.isLoading = false
        }
      }

      loadRealSound()
    }
  }, [state.userHasInteracted, supabase])

  // Создаем fallback звук через Web Audio API
  const createFallbackSound = useCallback((saveToCache = false) => {
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

      if (saveToCache) {
        // Сохраняем в глобальный кэш как fallback
        globalSoundCache.fallbackAudio = mockAudio as HTMLAudioElement
      }

      // НЕ перезаписываем состояние, если настоящий звук уже загружен
      if (!globalSoundCache.isLoaded) {
        setState(prev => ({
          ...prev,
          audioElement: mockAudio as HTMLAudioElement,
          soundUrl: 'fallback-web-audio'
        }))
        console.log('🔊 Fallback звук установлен в состояние (настоящий звук ещё не загружен)')
      } else {
        console.log('🔊 Fallback звук НЕ установлен в состояние (настоящий звук уже загружен)')
      }

      console.log('🔊 Использован fallback звук через Web Audio API')
      console.log('🔊 Fallback звук готов для использования')
    } catch (fallbackError) {
      console.error('❌ Не удалось создать fallback звук:', fallbackError)
    }
  }, [])

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
    const callStack = new Error().stack?.split('\n').slice(1, 4).map(line => line.trim()).join(' -> ')
    console.log('🔊🔥 ЗВУК: playNotificationSound вызван! Стек вызовов:', callStack)
    
    // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Приоритетно используем настоящий звук из кэша
    console.log('🔊 Диагностика звукового кэша:', {
      'globalSoundCache.audioElement': globalSoundCache.audioElement ? 'есть' : 'нет',
      'globalSoundCache.isLoaded': globalSoundCache.isLoaded,
      'globalSoundCache.soundUrl': globalSoundCache.soundUrl ? globalSoundCache.soundUrl.substring(0, 50) + '...' : 'нет',
      'state.audioElement': state.audioElement ? 'есть' : 'нет',
      'state.soundLoaded': state.soundLoaded
    })
    
    let audioElement = globalSoundCache.audioElement // Настоящий звук из Supabase
    let soundSource = 'Supabase audio file'
    
    // Если настоящий звук не загружен, используем fallback
    if (!audioElement && state.audioElement) {
      audioElement = state.audioElement
      soundSource = 'fallback Web Audio API'
    }
    
    if (!audioElement) {
      console.warn('🔇 Ни настоящий, ни fallback звук не доступны')
      return false
    }

    console.log('🔊 Используем звук:', soundSource)

    try {
      // Сброс на начало для возможности повторного воспроизведения
      audioElement.currentTime = 0
      
      console.log('🔊 Попытка воспроизведения:', {
        soundSource,
        currentTime: audioElement.currentTime,
        volume: audioElement.volume || 'N/A',
        muted: audioElement.muted || 'N/A', 
        readyState: audioElement.readyState || 'N/A',
        paused: audioElement.paused || 'N/A'
      })
      
      await audioElement.play()
      console.log('🔊✅ Звуковое уведомление УСПЕШНО воспроизведено из:', soundSource)
      return true
    } catch (error) {
      // Обрабатываем различные типы ошибок
      if (error instanceof Error) {
        console.error('🔇 Ошибка воспроизведения', soundSource + ':', {
          errorName: error.name,
          errorMessage: error.message,
          audioElement: audioElement ? 'есть' : 'нет'
        })
        
        if (error.name === 'NotAllowedError') {
          console.warn('🔇 Воспроизведение заблокировано браузером')
          
          // Используем Web Audio API как fallback ТОЛЬКО если это не настоящий Supabase звук
          if (soundSource !== 'Supabase audio file') {
            console.log('🔊 Пробуем fallback через Web Audio API...')
            try {
              const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
              
              // Пытаемся активировать контекст
              if (audioContext.state === 'suspended') {
                await audioContext.resume()
              }
              
              // Создаем простой звуковой сигнал
              const oscillator = audioContext.createOscillator()
              const gainNode = audioContext.createGain()
              
              oscillator.connect(gainNode)
              gainNode.connect(audioContext.destination)
              
              oscillator.frequency.value = 800
              gainNode.gain.setValueAtTime(0, audioContext.currentTime)
              gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1)
              gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
              
              oscillator.start(audioContext.currentTime)
              oscillator.stop(audioContext.currentTime + 0.5)
              
              console.log('🔊 Fallback звуковое уведомление воспроизведено')
              return true
            } catch (fallbackError) {
              console.warn('🔇 Fallback звук тоже не работает:', fallbackError)
              return false
            }
          } else {
            console.warn('🔇 Supabase звук заблокирован браузером, не используем fallback')
            return false
          }
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
  }, [state.audioElement])

  // Основная функция для проверки условий и воспроизведения уведомления
  const maybePlayNotification = useCallback((messageData: {
    chatId: string
    senderId: string
    content: string
    fullPayload?: any
  }) => {
    const callStack = new Error().stack?.split('\n').slice(1, 4).map(line => line.trim()).join(' -> ')
    console.log('🔊🔥 УВЕДОМЛЕНИЕ: maybePlayNotification вызван!', {
      chatId: messageData.chatId?.slice(0, 8),
      senderId: messageData.senderId?.slice(0, 8),
      content: messageData.content?.slice(0, 20),
      stack: callStack
    })
    const now = Date.now()
    const { isTabVisible, lastNotificationTime, currentChatId, userHasInteracted } = state
    
    // Проверяем, что сообщение не от нас
    if (messageData.senderId === userId) {
      console.log('🚫 Сообщение от нас самих - уведомление не нужно')
      return false
    }

    // Проверяем, является ли это сообщением звонка (системное сообщение)
    const metadata = messageData.fullPayload?.metadata
    if (metadata && metadata.status && ['started', 'active', 'ended', 'missed', 'rejected'].includes(metadata.status)) {
      console.log('🚫 Это сообщение звонка - звуковое уведомление не нужно', {
        status: metadata.status,
        chatId: messageData.chatId?.slice(0, 8)
      })
      return false
    }

    // 🔥 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Звуки должны работать сразу!
    // ПОЛНОСТЬЮ убираем проверку userHasInteracted для немедленных уведомлений
    console.log('🔊 НЕМЕДЛЕННЫЕ уведомления активны - звук будет работать сразу при загрузке!')

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

  // Функция для установки взаимодействия пользователя (нужно вызывать при первом клике/тапе)
  const setUserInteraction = useCallback(() => {
    console.log('👆 Пользователь взаимодействовал - разблокируем звук')
    setState(prev => ({ ...prev, userHasInteracted: true }))
  }, [])

  // Функция для тестирования звука
  const testSound = useCallback(async () => {
    console.log('🧪 Тестирование звука уведомлений')
    const success = await playNotificationSound()
    console.log('🧪 Результат теста:', success ? 'успешно' : 'ошибка')
    return success
  }, [playNotificationSound])

  // Функция для форсированной загрузки звука из Supabase
  const forceLoadSoundFromSupabase = useCallback(async () => {
    console.log('🔊 Форсированная загрузка звука из Supabase...')

    // Сбрасываем кэш
    globalSoundCache.isLoaded = false
    globalSoundCache.isLoading = false
    globalSoundCache.audioElement = null
    globalSoundCache.soundUrl = null

    // Обновляем состояние
    setState(prev => ({
      ...prev,
      soundLoaded: false,
      audioElement: globalSoundCache.fallbackAudio,
      soundUrl: 'fallback-web-audio'
    }))

    // Ждем немного и пытаемся загрузить снова
    setTimeout(() => {
      if (state.userHasInteracted) {
        console.log('🔊 Повторная попытка загрузки после сброса кэша')
        // Это вызовет useEffect для загрузки
      }
    }, 100)

    return true
  }, [state.userHasInteracted])

  // Загрузка звука завершения звонка
  const loadEndCallSound = useCallback(async () => {
    if (globalEndCallSoundCache.isInitialized) return
    globalEndCallSoundCache.isInitialized = true

    console.log('🔊 Загружаем звук завершения звонка...')

    const endCallUrl = 'https://uasoayoovlureephzkns.supabase.co/storage/v1/object/public/sounds/endcall.mp3'

    try {
      const audio = new Audio(endCallUrl)
      audio.preload = 'auto'
      audio.volume = 0.8 // Чуть тише, чем уведомления

      // Ждем загрузки
      await new Promise((resolve, reject) => {
        audio.addEventListener('canplaythrough', () => {
          console.log('✅ Звук завершения звонка загружен успешно!')
          globalEndCallSoundCache.audioElement = audio
          globalEndCallSoundCache.soundUrl = endCallUrl
          globalEndCallSoundCache.isLoaded = true
          resolve(void 0)
        })

        audio.addEventListener('error', (e) => {
          console.warn('❌ Ошибка загрузки звука завершения звонка:', e)
          reject(e)
        })

        // Таймаут 10 секунд
        setTimeout(() => reject(new Error('Timeout')), 10000)
      })
    } catch (error) {
      console.warn('❌ Не удалось загрузить звук завершения звонка:', error)
      // Создаем fallback звук для завершения звонка
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const createEndCallBeep = () => {
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        oscillator.frequency.value = 600 // Низкая частота для завершения
        gainNode.gain.setValueAtTime(0, audioContext.currentTime)
        gainNode.gain.linearRampToValueAtTime(0.4, audioContext.currentTime + 0.1)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8)

        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.8)
      }

      const mockAudio = {
        play: async () => {
          if (audioContext.state === 'suspended') {
            await audioContext.resume()
          }
          createEndCallBeep()
          return Promise.resolve()
        }
      } as HTMLAudioElement

      globalEndCallSoundCache.audioElement = mockAudio
      globalEndCallSoundCache.soundUrl = 'fallback-end-call'
      globalEndCallSoundCache.isLoaded = true
      console.log('🔊 Использован fallback звук для завершения звонка')
    }
  }, [])

  // Функция для воспроизведения звука завершения звонка
  const playEndCallSound = useCallback(async () => {
    console.log('🔊 Воспроизведение звука завершения звонка')

    if (!globalEndCallSoundCache.audioElement) {
      console.warn('🔇 Звук завершения звонка не загружен')
      return false
    }

    try {
      // Сброс на начало для возможности повторного воспроизведения
      globalEndCallSoundCache.audioElement.currentTime = 0

      await globalEndCallSoundCache.audioElement.play()
      console.log('🔊✅ Звук завершения звонка воспроизведен успешно')
      return true
    } catch (error) {
      console.error('🔇 Ошибка воспроизведения звука завершения звонка:', error)
      return false
    }
  }, [])

  return {
    setCurrentChat,
    setUserInteraction,
    maybePlayNotification,
    testSound,
    forceLoadSoundFromSupabase,
    playEndCallSound,
    isTabVisible: state.isTabVisible,
    currentChatId: state.currentChatId,
    soundLoaded: state.soundLoaded,
    userHasInteracted: state.userHasInteracted
  }
}
