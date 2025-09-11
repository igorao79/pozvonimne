'use client'

import { useState, useRef, useEffect } from 'react'
import useAudioAnalyzer from '@/hooks/useAudioAnalyzer'

const MicrophoneTest = () => {
  const [isTestActive, setIsTestActive] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)

  // Use audio analyzer for speaking detection
  const { isSpeaking } = useAudioAnalyzer({ 
    stream, 
    isActive: isTestActive 
  })

  const startMicTest = async () => {
    try {
      console.log('Starting microphone test...')
      
      // Get microphone access
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })

      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // Create source from microphone
      const source = audioContext.createMediaStreamSource(micStream)
      
      // Create gain node for volume control
      const gainNode = audioContext.createGain()
      gainNode.gain.setValueAtTime(0.5, audioContext.currentTime) // 50% volume
      
      // Connect: microphone -> gain -> speakers
      source.connect(gainNode)
      gainNode.connect(audioContext.destination)

      // Store references
      audioContextRef.current = audioContext
      gainNodeRef.current = gainNode
      setStream(micStream)
      setIsTestActive(true)
      setError(null)
      
      console.log('Microphone test started successfully')
    } catch (err: any) {
      console.error('Microphone test error:', err)
      setError(`Ошибка доступа к микрофону: ${err.message}`)
      setIsTestActive(false)
    }
  }

  const stopMicTest = () => {
    console.log('Stopping microphone test...')
    
    // Stop audio context
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    
    // Stop stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    
    gainNodeRef.current = null
    setIsTestActive(false)
    setError(null)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isTestActive) {
        stopMicTest()
      }
    }
  }, [])

  // Volume control
  const adjustVolume = (volume: number) => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.setValueAtTime(volume / 100, audioContextRef.current!.currentTime)
    }
  }

  return (
    <div className="bg-white shadow-xl rounded-lg p-6 mb-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center">
        Тест микрофона
      </h2>
      
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="text-center">
        {!isTestActive ? (
          <button
            onClick={startMicTest}
            className="flex items-center justify-center mx-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            Начать тест микрофона
          </button>
        ) : (
          <div className="space-y-4">
            {/* Speaking indicator */}
            <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 ${
              isSpeaking 
                ? 'bg-green-500 ring-4 ring-green-300 ring-opacity-75 animate-pulse' 
                : 'bg-gray-300'
            }`}>
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>

            <p className={`text-sm font-medium ${isSpeaking ? 'text-green-600' : 'text-gray-500'}`}>
              {isSpeaking ? 'Говорите - вас слышно!' : 'Скажите что-нибудь...'}
            </p>

            {/* Volume control */}
            <div className="max-w-xs mx-auto">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Громкость прослушивания
              </label>
              <input
                type="range"
                min="0"
                max="100"
                defaultValue="50"
                onChange={(e) => adjustVolume(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Warning */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex">
                <svg className="w-5 h-5 text-yellow-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div className="text-sm text-yellow-700">
                  <p className="font-medium">Используйте наушники!</p>
                  <p>Без наушников может возникнуть эхо и обратная связь.</p>
                </div>
              </div>
            </div>

            <button
              onClick={stopMicTest}
              className="flex items-center justify-center mx-auto px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
              Остановить тест
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default MicrophoneTest
