'use client'

import { useEffect, useState, useRef } from 'react'

interface AudioAnalyzerProps {
  stream: MediaStream | null
  isActive: boolean
}

export const useAudioAnalyzer = ({ stream, isActive }: AudioAnalyzerProps) => {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const analyzerRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const animationFrameRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!stream || !isActive) {
      setIsSpeaking(false)
      return
    }

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const analyzer = audioContext.createAnalyser()
    const microphone = audioContext.createMediaStreamSource(stream)
    
    analyzer.fftSize = 256
    analyzer.smoothingTimeConstant = 0.9
    microphone.connect(analyzer)

    audioContextRef.current = audioContext
    analyzerRef.current = analyzer

    const dataArray = new Uint8Array(analyzer.frequencyBinCount)

    const checkAudioLevel = () => {
      if (!analyzerRef.current) return

      analyzerRef.current.getByteFrequencyData(dataArray)
      
      // Calculate average volume
      const average = dataArray.reduce((acc, value) => acc + value, 0) / dataArray.length
      
      // Threshold for detecting speech (adjust as needed)
      const threshold = 15
      setIsSpeaking(average > threshold)

      animationFrameRef.current = requestAnimationFrame(checkAudioLevel)
    }

    checkAudioLevel()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [stream, isActive])

  return { isSpeaking }
}

export default useAudioAnalyzer
