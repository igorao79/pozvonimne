'use client'

import { useEffect, useRef, useState } from 'react'
import useCallStore from '@/store/useCallStore'
import { createClient } from '@/utils/supabase/client'
import { ringtoneAPI } from '@/config/api'

const IncomingCall = () => {
  const {
    callerId,
    callerName,
    acceptCall,
    rejectCall,
    userId
  } = useCallStore()

  const [ringtoneUrl, setRingtoneUrl] = useState<string | null>(null)
  const ringtoneRef = useRef<HTMLAudioElement>(null)
  const supabase = createClient()
  const cleanupFunctionRef = useRef<(() => void) | null>(null)
  const hasUserInteracted = useRef(false)

  // Загружаем и воспроизводим рингтон
  useEffect(() => {
    let isPlaying = false

    const loadAndPlayRingtone = async (): Promise<(() => void) | null> => {
      if (!userId || isPlaying) return null

      try {
        console.log('🎵 Starting ringtone loading...')
        isPlaying = true

        // Получаем ссылку на рингтон пользователя через backend
        const result = await ringtoneAPI.get(userId)

        if (result.success && result.url) {
          console.log('🎵 Custom ringtone URL loaded:', result.url)
          setRingtoneUrl(result.url)

          // Воспроизводим пользовательский рингтон
          if (ringtoneRef.current) {
            // Останавливаем предыдущее воспроизведение перед установкой нового источника
            try {
              ringtoneRef.current.pause()
              ringtoneRef.current.currentTime = 0
              ringtoneRef.current.src = ''
            } catch (err: any) {
              console.log('Error stopping previous ringtone:', err?.message || err)
            }

            ringtoneRef.current.src = result.url
            ringtoneRef.current.loop = true
            ringtoneRef.current.volume = 0.7

            try {
              // Проверяем разрешение на autoplay
              if (!hasUserInteracted.current) {
                console.log('⚠️ No user interaction detected, trying to play anyway...')
              }

              await ringtoneRef.current.play()
              console.log('🎵 Custom ringtone started playing successfully')

              return () => {
                isPlaying = false
                if (ringtoneRef.current) {
                  try {
                    ringtoneRef.current.pause()
                    ringtoneRef.current.currentTime = 0
                    ringtoneRef.current.src = ''
                  } catch (err) {
                    console.error('Error stopping custom ringtone:', err)
                  }
                }
              }
            } catch (err: any) {
              console.error('❌ Error playing custom ringtone:', err)

              if (err.name === 'NotAllowedError') {
                console.log('🚫 Autoplay blocked, will try again after user interaction')
                // Ждем пользовательского взаимодействия
                const tryPlayAfterInteraction = () => {
                  if (ringtoneRef.current && hasUserInteracted.current && !isPlaying) {
                    console.log('🎵 Retrying custom ringtone after user interaction')
                    ringtoneRef.current.play().catch(e =>
                      console.error('Still failed to play after interaction:', e)
                    )
                  }
                }

                // Добавляем обработчик для повторной попытки
                const handleInteraction = () => {
                  document.removeEventListener('click', handleInteraction)
                  document.removeEventListener('touchstart', handleInteraction)
                  setTimeout(tryPlayAfterInteraction, 100)
                }

                document.addEventListener('click', handleInteraction, { once: true })
                document.addEventListener('touchstart', handleInteraction, { once: true })
              }

              isPlaying = false
              // Используем стандартный рингтон если кастомный не загрузился
              return playDefaultRingtone()
            }
          }
        }

        // Используем стандартный рингтон
        console.log('🎵 Using default ringtone')
        return playDefaultRingtone()

      } catch (error) {
        console.error('Error loading ringtone:', error)
        isPlaying = false
        return playDefaultRingtone()
      }
    }

    const playDefaultRingtone = () => {
      // Создаем простой стандартный рингтон без повторений
      if (typeof window === 'undefined') return () => {}

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContextClass) {
        console.warn('Web Audio API not supported')
        return () => {}
      }

      try {
        const audioContext = new AudioContextClass()
        let isPlaying = true

        // Простой одиночный звук вместо повторяющегося паттерна
        const playSimpleTone = () => {
          if (!isPlaying) return

          const oscillator = audioContext.createOscillator()
          const gainNode = audioContext.createGain()

          oscillator.connect(gainNode)
          gainNode.connect(audioContext.destination)

          oscillator.frequency.value = 800 // Один тон
          oscillator.type = 'sine'

          // Плавное нарастание и затухание звука
          gainNode.gain.setValueAtTime(0, audioContext.currentTime)
          gainNode.gain.linearRampToValueAtTime(0.4, audioContext.currentTime + 0.1)
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.5)

          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 1.5)
        }

        // Играем один простой звук
        playSimpleTone()

        // Функция очистки
        return () => {
          isPlaying = false
          if (audioContext.state !== 'closed') {
            audioContext.close().catch(console.error)
          }
        }
      } catch (err) {
        console.error('Error creating default ringtone:', err)
        return () => {}
      }
    }

    const loadAndPlayRingtoneWrapper = async () => {
      // Останавливаем предыдущий рингтон перед запуском нового
      if (cleanupFunctionRef.current) {
        cleanupFunctionRef.current()
        cleanupFunctionRef.current = null
      }

      cleanupFunctionRef.current = await loadAndPlayRingtone()
    }

    loadAndPlayRingtoneWrapper()

    // Очищаем при размонтировании компонента
    return () => {
      stopRingtone()
    }
  }, [userId])

  // Отслеживаем пользовательское взаимодействие для предотвращения ошибок autoplay
  useEffect(() => {
    // Проверяем, взаимодействовал ли пользователь ранее
    const hasInteractedBefore = sessionStorage.getItem('userHasInteracted') === 'true'
    if (hasInteractedBefore) {
      hasUserInteracted.current = true
      console.log('👆 User has interacted before - audio should work')
    }

    const handleUserInteraction = () => {
      hasUserInteracted.current = true
      sessionStorage.setItem('userHasInteracted', 'true')
      console.log('👆 User interaction detected - audio should work')
    }

    // Добавляем обработчики для различных типов взаимодействия
    const events = ['click', 'touchstart', 'keydown', 'scroll']
    events.forEach(event => {
      document.addEventListener(event, handleUserInteraction, { once: true })
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserInteraction)
      })
    }
  }, [])

  // Предотвращаем браузерные уведомления при получении входящего звонка
  useEffect(() => {
    if (callerId) {
      console.log('📞 Incoming call detected - preventing browser notifications')

      // Пытаемся предотвратить браузерные звуки уведомлений
      try {
        // Отключаем фокус для предотвращения звуков уведомлений
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur()
        }

        // Создаем временный audio context для захвата аудио потока
        if (typeof window !== 'undefined') {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
          if (AudioContextClass) {
            const tempContext = new AudioContextClass()
            // Небольшая задержка для инициализации
            setTimeout(() => {
              if (tempContext.state === 'suspended') {
                tempContext.resume().catch(err =>
                  console.log('Audio context resume:', err.message)
                )
              }
            }, 50)
          }
        }
      } catch (err: any) {
        console.log('Browser notification prevention attempt:', err.message)
      }
    }
  }, [callerId])

  // Останавливаем рингтон при принятии или отклонении звонка
  const stopRingtone = () => {
    console.log('🛑 Stopping ALL ringtones...')

    // Останавливаем пользовательский рингтон
    if (ringtoneRef.current) {
      try {
        ringtoneRef.current.pause()
        ringtoneRef.current.currentTime = 0
        ringtoneRef.current.src = ''
        console.log('🛑 Custom ringtone stopped')
      } catch (err: any) {
        console.error('Error stopping custom ringtone:', err)
      }
    }

    // Также останавливаем стандартный рингтон если он играет
    if (cleanupFunctionRef.current) {
      try {
        cleanupFunctionRef.current()
        console.log('🛑 Default ringtone stopped')
      } catch (err) {
        console.error('Error stopping default ringtone:', err)
      }
      cleanupFunctionRef.current = null
    }

    // Попытка остановить любые другие звуки (включая браузерные уведомления)
    try {
      // Создаем и немедленно останавливаем пустой audio context для сброса
      if (typeof window !== 'undefined') {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
        if (AudioContextClass) {
          const tempContext = new AudioContextClass()
          // Небольшая задержка перед закрытием для обеспечения остановки
          setTimeout(() => {
            if (tempContext.state !== 'closed') {
              tempContext.close().catch(err =>
                console.log('Temp audio context cleanup:', err.message)
              )
            }
          }, 100)
        }
      }
      } catch (err: any) {
        console.log('Browser sound cleanup attempt:', err.message)
      }
  }

  const handleAccept = async () => {
    try {
      console.log('📞 Accepting call, stopping ALL ringtones and notifications...')

      // Множественная остановка для гарантии
      stopRingtone()

      // Дополнительная остановка через небольшую задержку
      setTimeout(() => {
        stopRingtone()
      }, 100)

      // Пытаемся остановить любые системные звуки
      try {
        // Создаем и сразу уничтожаем audio элемент для сброса
        const tempAudio = new Audio()
        tempAudio.volume = 0
        tempAudio.play().catch(() => {
          // Игнорируем ошибки
        })
        setTimeout(() => {
          tempAudio.pause()
          tempAudio.src = ''
        }, 50)
      } catch (err: any) {
        console.log('System sound cleanup attempt:', err.message)
      }

      console.log('🎯 IncomingCall: Accepting call from:', callerId)
      console.log('🎯 IncomingCall: Current state before accept:', {
        callerId,
        userId,
        isReceivingCall: useCallStore.getState().isReceivingCall,
        isInCall: useCallStore.getState().isInCall,
        isCalling: useCallStore.getState().isCalling,
        isCallActive: useCallStore.getState().isCallActive
      })
      
      // Send accept signal back to caller - используем существующий канал или создаем новый
      if (callerId) {
        console.log('🎯 IncomingCall: Sending accept signal to caller...')
        
        // Используем broadcast на канале звонящего
        const callerChannelId = `calls:${callerId}`
        
        try {
          // Попробуем найти существующий канал или создать новый
          let callerChannel = supabase.getChannels().find(ch => ch.topic === callerChannelId)
          
          if (!callerChannel) {
            console.log('🎯 Creating new caller channel for accept signal')
            callerChannel = supabase.channel(callerChannelId)
            
            // Моментальная подписка для максимальной скорости
            await new Promise((resolve) => {
              const timeout = setTimeout(() => {
                console.warn('🎯 Accept signal subscription timeout, trying anyway')
                resolve('timeout')
              }, 100) // Минимум для моментальной работы

              callerChannel?.subscribe((status) => {
                clearTimeout(timeout)
                console.log('🎯 IncomingCall: Caller channel subscription status:', status)
                
                if (status === 'SUBSCRIBED') {
                  resolve(status)
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                  console.warn('🎯 Subscription failed, but continuing:', status)
                  resolve(status) // Продолжаем даже при ошибке
                }
              })
            })
          }
        
          // Пытаемся отправить сигнал принятия
          const result = await callerChannel?.send({
            type: 'broadcast',
            event: 'call_accepted',
            payload: {
              accepter_id: userId,
              timestamp: Date.now()
            }
          })
          
          console.log('🎯 IncomingCall: Call accept signal sent to:', callerId, 'Result:', result)
          
          // Убираем автоматическую очистку канала - пусть система сама управляет
          
        } catch (channelError) {
          console.warn('🎯 Error with caller channel, continuing anyway:', channelError)
        }
      }
      
      console.log('🎯 IncomingCall: Calling acceptCall() function...')
      acceptCall()
      
      console.log('🎯 IncomingCall: State after acceptCall():', {
        isReceivingCall: useCallStore.getState().isReceivingCall,
        isInCall: useCallStore.getState().isInCall,
        isCalling: useCallStore.getState().isCalling,
        isCallActive: useCallStore.getState().isCallActive,
        targetUserId: useCallStore.getState().targetUserId
      })
    } catch (err) {
      console.error('🎯 IncomingCall: Error accepting call:', err)
      // Still try to accept the call locally even if signaling fails
      acceptCall()
    }
  }

  const handleReject = async () => {
    try {
      console.log('📞 Rejecting call, stopping ringtone...')
      stopRingtone() // Останавливаем рингтон
      console.log('🎯 IncomingCall: Rejecting call from:', callerId)
      
      // Send reject signal back to caller
      if (callerId) {
        const callerChannel = supabase.channel(`calls:${callerId}`)
        
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Call reject subscription timeout'))
          }, 3000)

          callerChannel.subscribe((status) => {
            clearTimeout(timeout)
            console.log('🎯 IncomingCall: Reject channel subscription status:', status)
            
            if (status === 'SUBSCRIBED') {
              resolve(status)
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              reject(new Error(`Call reject subscription failed: ${status}`))
            }
          })
        })
        
        const result = await callerChannel.send({
          type: 'broadcast',
          event: 'call_rejected',
          payload: {
            rejector_id: userId,
            timestamp: Date.now()
          }
        })
        
        console.log('🎯 IncomingCall: Call reject signal sent:', result)
        
        // Clean up channel
        setTimeout(() => {
          callerChannel.unsubscribe()
        }, 500)
      }
      
      rejectCall()
    } catch (err) {
      console.error('🎯 IncomingCall: Error rejecting call:', err)
      // Still reject locally even if signaling fails
      rejectCall()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full text-center">
        <div className="mb-6">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Входящий звонок
          </h2>
          <p className="text-lg text-gray-600">
            {callerName || `Пользователь ${callerId?.slice(0, 8)}...`}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            ID: {callerId}
          </p>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={handleReject}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-4 px-6 rounded-full transition-colors duration-200 flex items-center justify-center"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <button
            onClick={handleAccept}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-4 px-6 rounded-full transition-colors duration-200 flex items-center justify-center"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
        </div>

        <div className="mt-6">
          <div className="animate-pulse flex justify-center">
            <div className="w-4 h-4 bg-blue-500 rounded-full mx-1"></div>
            <div className="w-4 h-4 bg-blue-500 rounded-full mx-1 animation-delay-75"></div>
            <div className="w-4 h-4 bg-blue-500 rounded-full mx-1 animation-delay-150"></div>
          </div>
        </div>

        {/* Скрытый audio элемент для воспроизведения пользовательского рингтона */}
        <audio
          ref={ringtoneRef}
          preload="auto"
          onError={(e) => {
            console.error('Audio element error:', e)
            // Если пользовательский рингтон не загрузился, воспроизведем стандартный
            if (cleanupFunctionRef.current) {
              cleanupFunctionRef.current()
            }
          }}
        />
      </div>
    </div>
  )
}

export default IncomingCall
