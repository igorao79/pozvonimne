'use client'

import { useState } from 'react'
import useCallStore from '@/store/useCallStore'
import { createClient } from '@/utils/supabase/client'

const DialPad = () => {
  const [inputUserId, setInputUserId] = useState('')
  const [micPermission, setMicPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown')
  const {
    userId,
    startCall,
    isInCall,
    isCalling,
    setError,
    setIsLoading,
    isLoading
  } = useCallStore()
  
  const supabase = createClient()

  const testMicrophone = async () => {
    try {
      console.log('Testing microphone access...')
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      })
      console.log('Microphone access granted:', stream)
      setMicPermission('granted')
      
      // Stop the test stream
      stream.getTracks().forEach(track => track.stop())
      setError(null)
    } catch (err) {
      console.error('Microphone access denied:', err)
      setMicPermission('denied')
      setError('Доступ к микрофону отклонен. Проверьте настройки браузера.')
    }
  }

  const handleCall = async () => {
    if (!inputUserId.trim()) {
      setError('Введите ID пользователя')
      return
    }

    if (inputUserId === userId) {
      setError('Нельзя позвонить самому себе')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Check if user exists (this would need a users table)
      // For now, we'll just proceed with the call
      
      // Send call signal to the target user
      const callChannel = supabase.channel(`calls:${inputUserId}`)
      
      // Subscribe to channel first
      await callChannel.subscribe()
      
      // Wait a bit for subscription to be ready
      await new Promise(resolve => setTimeout(resolve, 100))
      
      await callChannel.send({
        type: 'broadcast',
        event: 'incoming_call',
        payload: {
          caller_id: userId,
          caller_name: `User ${userId?.slice(0, 8)}...` // Short version of ID
        }
      })

      console.log('Call signal sent to user:', inputUserId)
      startCall(inputUserId)
      setInputUserId('') // Clear input after call
      
    } catch (err) {
      setError('Ошибка при совершении звонка')
      console.error('Call error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white shadow-xl rounded-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center">
        Позвонить пользователю
      </h2>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-2">
            ID пользователя
          </label>
          <input
            id="userId"
            type="text"
            value={inputUserId}
            onChange={(e) => setInputUserId(e.target.value)}
            placeholder="Введите ID пользователя"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
            disabled={isInCall}
          />
        </div>
        
        {/* Микрофон тест */}
        <div className="mb-4">
          <button
            onClick={testMicrophone}
            className={`w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium ${
              micPermission === 'granted' 
                ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                : micPermission === 'denied'
                ? 'bg-red-100 text-red-800 hover:bg-red-200'
                : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            {micPermission === 'granted' 
              ? 'Микрофон доступен ✓' 
              : micPermission === 'denied'
              ? 'Микрофон заблокирован ✗'
              : 'Проверить микрофон'
            }
          </button>
        </div>

        <button
          onClick={handleCall}
          disabled={isInCall || isLoading || !inputUserId.trim() || micPermission !== 'granted'}
          className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-white font-medium bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Соединение...
            </div>
          ) : isCalling ? (
            <div className="flex items-center">
              <div className="animate-pulse w-3 h-3 bg-white rounded-full mr-2"></div>
              Вызов...
            </div>
          ) : micPermission !== 'granted' ? (
            'Сначала проверьте микрофон'
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21L6.16 11.37a11.045 11.045 0 005.516 5.516l1.983-4.064a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Позвонить
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default DialPad
