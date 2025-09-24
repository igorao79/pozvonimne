import { useRef, useCallback, useEffect, useState } from 'react'
import useSupabaseStore from '@/store/useSupabaseStore'
import useCallStore from '@/store/useCallStore'

interface RingtoneState {
  audioElement: HTMLAudioElement | null
  soundUrl: string | null
  isPlaying: boolean
  userHasInteracted: boolean
}

// Глобальный счетчик экземпляров для диагностики
let ringtoneInstanceCounter = 0

// Глобальный флаг активного рингтона - предотвращает одновременное воспроизведение
let globalRingtoneActive = false

// Время последнего принудительного останова рингтона
let lastForcedStopTime = 0

export const useRingtone = () => {
  const instanceId = useRef(++ringtoneInstanceCounter)

  // Диагностика создания экземпляра
  useEffect(() => {
    console.log(`🔔 СОЗДАН ЭКЗЕМПЛЯР РИНГТОНА [${instanceId.current}]`)
    return () => {
      console.log(`🗑️ УДАЛЕН ЭКЗЕМПЛЯР РИНГТОНА [${instanceId.current}]`)
    }
  }, [])
  const { supabase } = useSupabaseStore()
  const { isReceivingCall } = useCallStore()

  const [state, setState] = useState<RingtoneState>({
    audioElement: null,
    soundUrl: null,
    isPlaying: false,
    userHasInteracted: false
  })

  // Ref для хранения ID таймаута повторения сигнала
  const ringtoneTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  // Ref для текущего состояния звонка (чтобы избежать stale closures)
  const isReceivingCallRef = useRef(isReceivingCall)

  // Обновляем ref при изменении состояния звонка
  useEffect(() => {
    isReceivingCallRef.current = isReceivingCall
  }, [isReceivingCall])

  // Загружаем рингтон из Supabase storage
  useEffect(() => {
    console.log('🔔 Начинаем загрузку рингтона...')

    const loadRingtoneFile = async () => {
      try {
        console.log('🔔 Пробуем загрузить ringtone.mp3 из Supabase storage...')

        // Пробуем получить публичный URL
        const { data: publicUrlData } = supabase.storage
          .from('sounds')
          .getPublicUrl('ringtone.mp3')

        console.log('🔔 Public URL result:', publicUrlData)
        let audioUrl = publicUrlData?.publicUrl

        // Если публичный URL не работает, пробуем signed URL
        if (!audioUrl) {
          console.log('🔔 Пробуем получить signed URL...')
          const { data: signedData, error: signedError } = await supabase.storage
            .from('sounds')
            .createSignedUrl('ringtone.mp3', 3600)

          console.log('🔔 Signed URL result:', { signedData, signedError })

          if (signedError) {
            console.warn('⚠️ Ошибка получения signed URL:', signedError)
            // Fallback - создаем простой рингтон через Web Audio API
            createFallbackRingtone()
            return
          }

          audioUrl = signedData?.signedUrl
        }

        if (audioUrl) {
          console.log('🔔 Создаем Audio элемент с URL:', audioUrl)
          const audio = new Audio(audioUrl)
          audio.preload = 'auto'
          audio.volume = 0.3 // Уменьшаем громкость для комфортного прослушивания
          audio.loop = true // Зацикливаем рингтон

          // Проверяем, что файл действительно загрузился
          audio.addEventListener('canplaythrough', () => {
            console.log('🔔 Рингтон загружен из Supabase')
          })

          audio.addEventListener('error', (e) => {
            console.warn('⚠️ Ошибка загрузки рингтона:', e)
            createFallbackRingtone()
          })

          setState(prev => ({
            ...prev,
            audioElement: audio,
            soundUrl: audioUrl
          }))

          console.log('🔔 Рингтон готов для использования')
        } else {
          console.warn('⚠️ Не удалось получить URL рингтона, используем fallback')
          createFallbackRingtone()
        }
      } catch (error) {
        console.error('❌ Ошибка загрузки рингтона:', error)
        createFallbackRingtone()
      }
    }

    // Создаем простой рингтон через Web Audio API как fallback
    const createFallbackRingtone = () => {
      try {
        // Создаем простой синтезированный рингтон
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

        const createRingtone = () => {
          const oscillator = audioContext.createOscillator()
          const gainNode = audioContext.createGain()

          oscillator.connect(gainNode)
          gainNode.connect(audioContext.destination)

          // Создаем мелодию рингтона (простая последовательность)
          const frequencies = [800, 600, 800, 600, 800, 600]
          let noteIndex = 0

          const playNote = () => {
            if (noteIndex < frequencies.length) {
              oscillator.frequency.setValueAtTime(frequencies[noteIndex], audioContext.currentTime)
              gainNode.gain.setValueAtTime(0.5, audioContext.currentTime)
              gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)

              setTimeout(() => {
                noteIndex++
                if (noteIndex < frequencies.length) {
                  playNote()
                } else {
                  // Повторяем мелодию через паузу
                  setTimeout(createRingtone, 800)
                }
              }, 200)
            }
          }

          oscillator.start(audioContext.currentTime)
          playNote()
        }

        // Создаем mock audio element с функциями play/stop
        const mockAudio = {
          currentTime: 0,
          loop: true,
          play: async () => {
            if (audioContext.state === 'suspended') {
              await audioContext.resume()
            }
            createRingtone()
            return Promise.resolve()
          },
          pause: () => {
            // Останавливаем oscillator
            if (audioContext) {
              audioContext.close()
            }
          }
        }

        setState(prev => ({
          ...prev,
          audioElement: mockAudio as HTMLAudioElement,
          soundUrl: 'fallback-web-audio-ringtone'
        }))

        console.log('🔔 Использован fallback рингтон через Web Audio API')
      } catch (fallbackError) {
        console.error('❌ Не удалось создать fallback рингтон:', fallbackError)
      }
    }

    // Сначала создаем fallback рингтон, потом пробуем загрузить настоящий
    createFallbackRingtone()

    // Пробуем загрузить настоящий рингтон (асинхронно)
    loadRingtoneFile()
  }, [supabase])

  // Проверяем, взаимодействовал ли пользователь со страницей (глобальная проверка)
  useEffect(() => {
    // Проверяем, был ли уже активирован AudioContext (означает взаимодействие)
    const checkAudioContext = () => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        // Если контекст уже running, значит пользователь взаимодействовал
        if (audioContext.state === 'running') {
          setState(prev => ({ ...prev, userHasInteracted: true }))
          console.log('🎵 AudioContext уже активирован - пользователь взаимодействовал ранее')
          return true
        }
        // Пробуем активировать контекст
        if (audioContext.state === 'suspended') {
          audioContext.resume().then(() => {
            setState(prev => ({ ...prev, userHasInteracted: true }))
            console.log('🎵 AudioContext активирован - пользователь взаимодействовал')
          }).catch(() => {
            console.log('🎵 AudioContext не активирован - ждем взаимодействия')
          })
        }
        return false
      } catch (error) {
        console.log('🎵 Не удалось проверить AudioContext')
        return false
      }
    }

    // Если AudioContext уже активирован, считаем что пользователь взаимодействовал
    const alreadyInteracted = checkAudioContext()

    // Если не активирован, добавляем обработчики для различных типов взаимодействий
    if (!alreadyInteracted) {
      const handleFirstInteraction = () => {
        setState(prev => ({ ...prev, userHasInteracted: true }))
        console.log('👆 Пользователь взаимодействовал со страницей - рингтон разрешен')

        // Удаляем обработчики после первого взаимодействия
        document.removeEventListener('click', handleFirstInteraction)
        document.removeEventListener('keydown', handleFirstInteraction)
        document.removeEventListener('touchstart', handleFirstInteraction)
      }

      // Добавляем обработчики для различных типов взаимодействий
      document.addEventListener('click', handleFirstInteraction)
      document.addEventListener('keydown', handleFirstInteraction)
      document.addEventListener('touchstart', handleFirstInteraction)
    }
  }, [])

  // Защита от двойного воспроизведения
  const playInProgressRef = useRef(false)

  // Ref для отслеживания последнего состояния звонка
  const lastReceivingCallRef = useRef(isReceivingCall)

  // Основная логика управления рингтоном
  useEffect(() => {
    const { audioElement } = state

    if (!audioElement) {
      return
    }

    // Отмечаем изменение состояния звонка для следующего вызова
    lastReceivingCallRef.current = isReceivingCall

    // Проверяем, не был ли рингтон остановлен принудительно недавно (за последние 2 секунды)
    const timeSinceLastStop = Date.now() - lastForcedStopTime
    const recentlyStopped = timeSinceLastStop < 2000

    if (isReceivingCall && !state.isPlaying && !globalRingtoneActive && !recentlyStopped) {
      const callStack = new Error().stack?.split('\n').slice(1, 5).map(line => line.trim()).join(' -> ')
      console.log(`🔔🔥 ЭКЗЕМПЛЯР [${instanceId.current}]: Начинаем воспроизведение рингтона - входящий звонок`, {
        timestamp: new Date().toLocaleTimeString(),
        instanceId: instanceId.current,
        isReceivingCall,
        isPlaying: state.isPlaying,
        playInProgress: playInProgressRef.current,
        globalRingtoneActive,
        recentlyStopped,
        timeSinceLastStop,
        soundUrl: state.soundUrl,
        callStack
      })

      // Сбрасываем флаги перед новым запуском
      playInProgressRef.current = false
      globalRingtoneActive = true

      // Устанавливаем флаг что воспроизведение в процессе
      playInProgressRef.current = true

      // Очищаем предыдущий таймаут, если он существует
      if (ringtoneTimeoutRef.current) {
        clearTimeout(ringtoneTimeoutRef.current)
        ringtoneTimeoutRef.current = null
      }

      // Всегда пытаемся воспроизвести рингтон, независимо от "взаимодействия"
      // Если браузер заблокирует, используем fallback через Web Audio API
      console.log(`🔔 ЭКЗЕМПЛЯР [${instanceId.current}]: Запуск HTML5 Audio воспроизведения`)
      audioElement.play().then(() => {
        setState(prev => ({ ...prev, isPlaying: true }))
        console.log(`🔔 ЭКЗЕМПЛЯР [${instanceId.current}]: HTML5 Audio воспроизводится успешно`)
      }).catch((error) => {
        console.warn('🔔 HTML5 Audio заблокирован браузером, используем Web Audio API fallback:', error)

        // Fallback через Web Audio API - он не требует дополнительного взаимодействия
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

          // Активируем контекст если нужно
          if (audioContext.state === 'suspended') {
            audioContext.resume().catch(() => {
              console.warn('🔔 Не удалось активировать AudioContext')
            })
          }

          const playRingtoneBeep = () => {
            console.log(`🔔 ЭКЗЕМПЛЯР [${instanceId.current}]: Web Audio API сигнал в ${new Date().toLocaleTimeString()}`)
            // Проверяем актуальное состояние через ref, чтобы избежать stale closures
            if (!isReceivingCallRef.current) return // Прекращаем если звонок уже завершен

            const oscillator = audioContext.createOscillator()
            const gainNode = audioContext.createGain()

            oscillator.connect(gainNode)
            gainNode.connect(audioContext.destination)

            oscillator.frequency.value = 800
            gainNode.gain.setValueAtTime(0, audioContext.currentTime)
            gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.05)
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

            oscillator.start(audioContext.currentTime)
            oscillator.stop(audioContext.currentTime + 0.3)

            // Повторяем сигнал каждые 1.5 секунды, но только если все еще идет звонок
            ringtoneTimeoutRef.current = setTimeout(() => {
              if (isReceivingCallRef.current) {
                playRingtoneBeep()
              }
            }, 1500)
          }

          setState(prev => ({ ...prev, isPlaying: true }))
          playRingtoneBeep()
          console.log(`🔔 ЭКЗЕМПЛЯР [${instanceId.current}]: Web Audio API fallback запущен`)

        } catch (fallbackError) {
          console.error('❌ Fallback рингтон тоже не работает:', fallbackError)
        }
      })
    } else if (!isReceivingCall && state.isPlaying) {
      // Останавливаем воспроизведение рингтона
      console.log('🔔 Останавливаем рингтон - звонок завершен')

      // Очищаем таймаут повторения сигнала
      if (ringtoneTimeoutRef.current) {
        clearTimeout(ringtoneTimeoutRef.current)
        ringtoneTimeoutRef.current = null
      }

      audioElement.pause()
      audioElement.currentTime = 0
      setState(prev => ({ ...prev, isPlaying: false }))
      playInProgressRef.current = false // Сбрасываем флаг
      globalRingtoneActive = false // Сбрасываем глобальный флаг
      console.log(`🔔 ЭКЗЕМПЛЯР [${instanceId.current}]: Рингтон остановлен`)
    }
  }, [isReceivingCall, state.audioElement, state.isPlaying, state.soundUrl])


  // Функция для принудительной остановки рингтона
  const stopRingtone = useCallback(() => {
    const { audioElement } = state
    if (audioElement && state.isPlaying) {
      console.log(`🔔 ЭКЗЕМПЛЯР [${instanceId.current}]: Принудительная остановка рингтона`)
      // Запоминаем время принудительной остановки
      lastForcedStopTime = Date.now()

      // Очищаем таймаут повторения сигнала
      if (ringtoneTimeoutRef.current) {
        clearTimeout(ringtoneTimeoutRef.current)
        ringtoneTimeoutRef.current = null
      }

      audioElement.pause()
      audioElement.currentTime = 0
      setState(prev => ({ ...prev, isPlaying: false }))
      playInProgressRef.current = false // Сбрасываем флаг
      globalRingtoneActive = false // Сбрасываем глобальный флаг
    }
  }, [state.audioElement, state.isPlaying])

  // Очистка при размонтировании компонента
  useEffect(() => {
    return () => {
      console.log('🔔 Очистка рингтона при размонтировании')

      // Очищаем таймаут повторения сигнала
      if (ringtoneTimeoutRef.current) {
        clearTimeout(ringtoneTimeoutRef.current)
        ringtoneTimeoutRef.current = null
      }

      const { audioElement } = state
      if (audioElement) {
        audioElement.pause()
        audioElement.src = ''
      }

      // Сбрасываем флаг воспроизведения
      playInProgressRef.current = false
      globalRingtoneActive = false // Сбрасываем глобальный флаг
    }
  }, [state.audioElement])

  return {
    stopRingtone,
    isPlaying: state.isPlaying,
    soundLoaded: !!state.audioElement,
    userHasInteracted: state.userHasInteracted
  }
}
