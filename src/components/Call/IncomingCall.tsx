'use client'

import { useEffect, useRef, useState } from 'react'
import useCallStore from '@/store/useCallStore'
import { createClient } from '@/utils/supabase/client'
import { sendCallAcceptedSignal, sendCallRejectedSignal } from '@/utils/callSignaling'

interface CallerInfo {
  id: string
  username: string
  display_name: string
  avatar_url?: string
}

const IncomingCall = () => {
  const {
    callerId,
    callerName,
    acceptCall,
    rejectCall,
    userId
  } = useCallStore()

  const supabase = createClient()
  const [callerInfo, setCallerInfo] = useState<CallerInfo | null>(null)

  // Загружаем информацию о звонящем при изменении callerId
  useEffect(() => {
    const fetchCallerInfo = async () => {
      if (!callerId) {
        setCallerInfo(null)
        return
      }

      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('id, username, display_name, avatar_url')
          .eq('id', callerId)
          .single()

        if (error) {
          console.warn('Error fetching caller info:', error)
          setCallerInfo(null)
        } else {
          setCallerInfo(data)
        }
      } catch (err) {
        console.warn('Error fetching caller info:', err)
        setCallerInfo(null)
      }
    }

    fetchCallerInfo()
  }, [callerId, supabase])

  const handleAccept = async () => {
    try {
      console.log('📞 Accepting call...')

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

      // Отправляем сигнал принятия звонка через надежную утилиту
      if (callerId && userId) {
        console.log('🎯 IncomingCall: Sending accept signal to caller...')

        try {
          const signalSent = await sendCallAcceptedSignal(
            callerId,
            userId,
            'Пользователь' // Можно добавить настоящее имя если нужно
          )

          if (signalSent) {
            console.log('✅ IncomingCall: Call accept signal sent successfully')
          } else {
            console.warn('⚠️ IncomingCall: Failed to send accept signal, but continuing')
          }
        } catch (signalError) {
          console.warn('🎯 IncomingCall: Error sending accept signal:', signalError)
          // Продолжаем даже при ошибке отправки сигнала
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
      console.log('📞 Rejecting call...')
      console.log('🎯 IncomingCall: Rejecting call from:', callerId)

      // Отправляем сигнал отклонения звонка через надежную утилиту
      if (callerId && userId) {
        try {
          const signalSent = await sendCallRejectedSignal(
            callerId,
            userId,
            'Пользователь' // Можно добавить настоящее имя если нужно
          )

          if (signalSent) {
            console.log('✅ IncomingCall: Call reject signal sent successfully')
          } else {
            console.warn('⚠️ IncomingCall: Failed to send reject signal, but continuing')
          }
        } catch (signalError) {
          console.warn('🎯 IncomingCall: Error sending reject signal:', signalError)
          // Продолжаем даже при ошибке отправки сигнала
        }
      }

      rejectCall()
    } catch (err) {
      console.error('🎯 IncomingCall: Error rejecting call:', err)
      // Still reject locally even if signaling fails
      rejectCall()
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="bg-card rounded-xl shadow-2xl p-8 max-w-sm w-full text-center border border-border">
        <div className="mb-6">
          <div className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center overflow-hidden">
            {callerInfo?.avatar_url ? (
              <img
                src={callerInfo.avatar_url}
                alt={callerInfo.display_name || callerInfo.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <span className="text-white font-medium text-xl">
                  {(callerInfo?.display_name || callerInfo?.username || callerName || '?').charAt(0)?.toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Входящий звонок
          </h2>
          <p className="text-lg text-muted-foreground">
            {callerInfo?.display_name || callerName || `Пользователь ${callerId?.slice(0, 8)}...`}
          </p>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={handleReject}
            className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold py-4 px-6 rounded-full transition-all duration-200 flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-destructive/50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 9l6 6m0-6l-6 6"/>
            </svg>
          </button>

          <button
            onClick={handleAccept}
            className="flex-1 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white font-semibold py-4 px-6 rounded-full transition-all duration-200 flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-green-400/50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
            </svg>
          </button>
        </div>

        <div className="mt-6">
          <div className="animate-pulse flex justify-center">
            <div className="w-4 h-4 bg-primary rounded-full mx-1"></div>
            <div className="w-4 h-4 bg-primary rounded-full mx-1 animation-delay-75"></div>
            <div className="w-4 h-4 bg-primary rounded-full mx-1 animation-delay-150"></div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default IncomingCall