'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import useCallStore from '@/store/useCallStore'
import useThemeStore from '@/store/useThemeStore'
import CallControls from '../CallControls'

interface ScreenSharingWindowProps {
  isScreenFullscreen: boolean
  screenWindowPosition: { x: number; y: number }
  screenWindowSize: { width: number; height: number }
  onMouseDown: (e: React.MouseEvent, type: 'drag' | 'resize') => void
  onToggleFullscreen: () => void
  onStopVideo: () => void
  onResetPosition: () => void
}

const ScreenSharingWindow = ({
  isScreenFullscreen,
  screenWindowPosition,
  screenWindowSize,
  onMouseDown,
  onToggleFullscreen,
  onStopVideo,
  onResetPosition
}: ScreenSharingWindowProps) => {
  const screenVideoRef = useRef<HTMLVideoElement>(null)
  const { theme } = useThemeStore()
  const {
    screenStream,
    remoteScreenStream,
    isCallActive,
    isReceivingCall,
    isInCall
  } = useCallStore()

  // Theme-based button styles
  const getButtonStyles = () => {
    if (theme === 'dark') {
      return {
        background: 'bg-slate-800/70 hover:bg-slate-700/80',
        text: 'text-slate-200 hover:text-white'
      }
    } else {
      return {
        background: 'bg-black/50 hover:bg-black/75',
        text: 'text-white'
      }
    }
  }

  const buttonStyles = getButtonStyles()

  // Убираем всю сложную логику - простая схема: есть стрим = показываем видео

  // Простая логика назначения stream на video элемент
  useEffect(() => {
    const videoElement = screenVideoRef.current
    if (!videoElement) return

    // Выбираем stream: remote имеет приоритет
    const streamToShow = remoteScreenStream || screenStream
    
    if (streamToShow) {
      console.log('📺 Setting stream to video element:', streamToShow.id)
      videoElement.srcObject = streamToShow
      videoElement.play().catch(console.error)
    } else {
      console.log('📺 No stream - clearing video')
      videoElement.srcObject = null
    }
  }, [screenStream, remoteScreenStream])



  // Проверяем есть ли активные video треки
  const hasActiveScreenStream = screenStream?.getVideoTracks()?.some(track =>
    track.readyState === 'live' && track.enabled
  ) || false

  const hasActiveRemoteScreenStream = remoteScreenStream?.getVideoTracks()?.some(track =>
    track.readyState === 'live' && track.enabled
  ) || false

  // Additional check: only show if call is active and user is connected
  const shouldShow = (hasActiveScreenStream || hasActiveRemoteScreenStream || !!remoteScreenStream) &&
                    (isCallActive || isReceivingCall || isInCall)

  console.log('📺 Should show screen window:', {
    shouldShow,
    hasActiveScreenStream,
    hasActiveRemoteScreenStream,
    hasRemoteScreenStream: !!remoteScreenStream,
    remoteScreenStreamTracks: remoteScreenStream?.getVideoTracks()?.length || 0,
    isCallActive,
    isReceivingCall,
    isInCall
  })

  if (!shouldShow) return null

  return (
    <div
      className="fixed z-50"
      style={{
        left: isScreenFullscreen ? 0 : screenWindowPosition.x,
        top: isScreenFullscreen ? 0 : screenWindowPosition.y,
        width: isScreenFullscreen ? '100vw' : screenWindowSize.width,
        height: isScreenFullscreen ? '100vh' : screenWindowSize.height
      }}
    >
      {/* Control buttons */}
      {!isScreenFullscreen && (
        <div className="absolute top-2 right-2 flex space-x-1 z-10">
          {(screenStream || remoteScreenStream) && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onStopVideo()
              }}
              className={`w-6 h-6 ${buttonStyles.background} ${buttonStyles.text} rounded flex items-center justify-center text-xs transition-colors`}
              title="Остановить просмотр"
            >
              ⏸️
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleFullscreen()
            }}
            className={`w-6 h-6 ${buttonStyles.background} ${buttonStyles.text} rounded flex items-center justify-center text-xs transition-colors`}
            title="На весь экран"
          >
            ⛶
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onResetPosition()
            }}
            className={`w-6 h-6 ${buttonStyles.background} ${buttonStyles.text} rounded flex items-center justify-center text-xs transition-colors`}
            title="Сбросить позицию"
          >
            ↻
          </button>
        </div>
      )}

      {isScreenFullscreen && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center space-x-6 z-50">
          {/* Оригинальные кнопки управления звонком */}
          <CallControls />

          {/* Выйти из полноэкранного режима */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleFullscreen()
            }}
            className={`px-6 py-3 rounded-lg flex items-center justify-center text-sm font-medium transition-colors shadow-lg ${
              theme === 'dark'
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-blue-500 bg-opacity-90 hover:bg-blue-600 text-white'
            }`}
            title="Выйти из полноэкранного режима"
          >
            🪟 Окно
          </button>

          {/* Остановить демонстрацию экрана */}
          {(screenStream || remoteScreenStream) && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onStopVideo()
              }}
              className={`px-6 py-3 rounded-lg flex items-center justify-center text-sm font-medium transition-colors shadow-lg ${
                theme === 'dark'
                  ? 'bg-slate-600 hover:bg-slate-700 text-slate-200'
                  : 'bg-gray-500 bg-opacity-90 hover:bg-gray-600 text-white'
              }`}
              title="Остановить демонстрацию экрана"
            >
              ⏸️ Стоп
            </button>
          )}
        </div>
      )}

      {/* Drag handle для маленького окошка */}
      {!isScreenFullscreen && (
        <div
          className={`absolute top-0 left-0 right-0 h-8 cursor-move rounded-t-lg z-40 transition-opacity ${
            theme === 'dark'
              ? 'bg-slate-800/60 hover:bg-slate-700/80'
              : 'bg-black/40 hover:bg-black/60'
          }`}
          onMouseDown={(e) => onMouseDown(e, 'drag')}
          title="Переместить окно (зажмите и тяните)"
        />
      )}

      {/* Простая логика: есть стрим - показываем видео */}
      {(screenStream || remoteScreenStream) ? (
          // Video element
          <video
            ref={screenVideoRef}
            autoPlay={true}
            playsInline
            controls={false}
            muted={false}
            className={`w-full h-full object-contain bg-black border-2 rounded-lg ${
              theme === 'dark' ? 'border-purple-400' : 'border-green-500'
            }`}
            style={{
              borderRadius: isScreenFullscreen ? 0 : '8px',
              // Принудительные стили для диагностики серого экрана
              minWidth: '100px',
              minHeight: '100px',
              backgroundColor: '#000000', // Черный фон для контраста
              objectFit: 'contain' // Гарантируем что видео не обрезается
            }}
            onPlay={() => {
              const videoElement = screenVideoRef.current
              const srcObject = videoElement?.srcObject
              const srcObjectTracks = (srcObject && 'getVideoTracks' in srcObject)
                ? srcObject.getVideoTracks().length
                : 0

              console.log('📺 Screen video started playing', {
                hasSrcObject: !!srcObject,
                srcObjectTracks,
                videoWidth: videoElement?.videoWidth,
                videoHeight: videoElement?.videoHeight,
                readyState: videoElement?.readyState,
                currentTime: videoElement?.currentTime,
                paused: videoElement?.paused,
                muted: videoElement?.muted,
                streamActive: srcObject ? (srcObject as MediaStream).active : false,
                trackDetails: srcObject ? (srcObject as MediaStream).getVideoTracks().map(track => ({
                  id: track.id,
                  enabled: track.enabled,
                  muted: track.muted,
                  readyState: track.readyState
                })) : []
              })
            }}
            onPause={() => console.log('📺 Screen video paused')}
            onEmptied={() => {
              console.log('📺 Screen video emptied')
              // Video очищен
            }}
            onEnded={() => {
              console.log('📺 Screen video ended')
                // Track заменился - это нормально
            }}
            onLoadStart={() => console.log('📺 Screen video load start')}
            onCanPlay={() => {
              const videoElement = screenVideoRef.current
              console.log('📺 Screen video can play', {
                readyState: videoElement?.readyState,
                videoSize: `${videoElement?.videoWidth}x${videoElement?.videoHeight}`,
                duration: videoElement?.duration,
                paused: videoElement?.paused,
                srcObject: !!videoElement?.srcObject
              })
              // Video загружен
              
              // Принудительно пытаемся запустить воспроизведение если видео на паузе
              if (videoElement && videoElement.paused && videoElement.srcObject) {
                console.log('📺 Video is paused but should be playing, attempting to start')
                videoElement.play().catch(error => {
                  console.warn('📺 Failed to auto-play from onCanPlay:', error)
                })
              }
            }}
            onCanPlayThrough={() => {
              const videoElement = screenVideoRef.current
              console.log('📺 Screen video can play through', {
                readyState: videoElement?.readyState,
                videoSize: `${videoElement?.videoWidth}x${videoElement?.videoHeight}`,
                buffered: videoElement?.buffered.length || 0,
                networkState: videoElement?.networkState
              })
              
              // Еще одна попытка запустить воспроизведение
              if (videoElement && videoElement.paused && videoElement.srcObject) {
                console.log('📺 Video can play through but is paused, forcing play')
                videoElement.play().catch(error => {
                  console.warn('📺 Failed to auto-play from onCanPlayThrough:', error)
                })
              }
            }}
            onLoadedData={() => {
              console.log('📺 Screen video loaded data')
              // Video загружен
            }}
            onLoadedMetadata={() => {
              const videoElement = screenVideoRef.current
              console.log('📺 Screen video metadata loaded', {
                videoWidth: videoElement?.videoWidth,
                videoHeight: videoElement?.videoHeight,
                duration: videoElement?.duration,
                readyState: videoElement?.readyState,
                srcObject: !!videoElement?.srcObject,
                streamId: videoElement?.srcObject ? (videoElement.srcObject as MediaStream).id : null
              })
              // Video загружен
            }}
            onResize={() => {
              const videoElement = screenVideoRef.current
              console.log('📺 Screen video resized', {
                videoWidth: videoElement?.videoWidth,
                videoHeight: videoElement?.videoHeight,
                naturalSize: `${videoElement?.videoWidth}x${videoElement?.videoHeight}`,
                displaySize: videoElement ? `${videoElement.clientWidth}x${videoElement.clientHeight}` : 'unknown'
              })
            }}
            onTimeUpdate={() => {
              // Логируем только каждые 5 секунд для избежания спама
              const videoElement = screenVideoRef.current
              if (videoElement && Math.floor(videoElement.currentTime) % 5 === 0) {
                console.log('📺 Screen video time update', {
                  currentTime: videoElement.currentTime,
                  duration: videoElement.duration,
                  buffered: videoElement.buffered.length > 0 ? `${videoElement.buffered.start(0)}-${videoElement.buffered.end(0)}` : 'none',
                  videoSize: `${videoElement.videoWidth}x${videoElement.videoHeight}`,
                  playing: !videoElement.paused
                })
                
                // Дополнительная диагностика для серого экрана
                if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
                  console.warn('📺 Video has zero dimensions - possible gray screen issue')
                  
                  // Пытаемся перезагрузить stream
                  const srcObject = videoElement.srcObject as MediaStream
                  if (srcObject && remoteScreenStream) {
                    console.log('📺 Attempting to fix zero dimension issue by reassigning stream')
                    videoElement.srcObject = null
                    setTimeout(() => {
                      videoElement.srcObject = remoteScreenStream
                      videoElement.load()
                    }, 100)
                  }
                }
              }
            }}
            onError={(e) => {
              const target = e.currentTarget as HTMLVideoElement
              const error = target.error
              console.error('📺 Screen video error:', {
                code: error?.code,
                message: error?.message,
                networkState: target.networkState,
                readyState: target.readyState,
                srcObject: !!target.srcObject,
                videoSize: `${target.videoWidth}x${target.videoHeight}`
              })
              
              // Пытаемся восстановить видео если ошибка не критическая
              if (error?.code === MediaError.MEDIA_ERR_NETWORK && target.srcObject) {
                console.log('📺 Network error, trying to reload video')
                setTimeout(() => {
                  if (target.srcObject && target.paused) {
                    target.load()
                    target.play().catch(console.error)
                  }
                }, 1000)
              }
              
              // If video fails to load, show "No signal" state
              // Video загружен
            }}
          />
      ) : null}
    </div>
  )
}

export default ScreenSharingWindow
