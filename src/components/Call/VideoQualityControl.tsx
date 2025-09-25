'use client'

import { useState, useEffect, useCallback } from 'react'
import { Settings, Monitor, Zap, Eye, BarChart3 } from 'lucide-react'
import { VIDEO_QUALITY_PRESETS, getVideoQualityStats, applyBitrateConstraints } from '@/utils/videoOptimization'
import useCallStore from '@/store/useCallStore'
import useThemeStore from '@/store/useThemeStore'

interface VideoQualityControlProps {
  peer?: any
  className?: string
}

const VideoQualityControl = ({ peer, className = '' }: VideoQualityControlProps) => {
  const { theme } = useThemeStore()
  const { isScreenSharing } = useCallStore()
  
  const [isOpen, setIsOpen] = useState(false)
  const [currentQuality, setCurrentQuality] = useState<keyof typeof VIDEO_QUALITY_PRESETS>('HIGH')
  const [stats, setStats] = useState<any>(null)
  const [autoAdapt, setAutoAdapt] = useState(true)

  // Получение статистик видео каждые 2 секунды
  useEffect(() => {
    if (!peer || !isScreenSharing) return

    const interval = setInterval(async () => {
      const videoStats = await getVideoQualityStats(peer)
      setStats(videoStats)
    }, 2000)

    return () => clearInterval(interval)
  }, [peer, isScreenSharing])

  // Применение выбранного качества
  const applyQuality = useCallback(async (quality: keyof typeof VIDEO_QUALITY_PRESETS) => {
    if (!peer) return

    try {
      const qualitySettings = VIDEO_QUALITY_PRESETS[quality]
      const applied = await applyBitrateConstraints(peer, qualitySettings.bitrate)
      
      if (applied) {
        setCurrentQuality(quality)
        console.log(`📺 Manual quality change applied: ${quality}`)
      }
    } catch (err) {
      console.error('📺 Failed to apply quality settings:', err)
    }
  }, [peer])

  // Форматирование битрейта для отображения
  const formatBitrate = (bitrate: number) => {
    if (bitrate >= 1000000) {
      return `${Math.round(bitrate / 100000) / 10} Mbps`
    }
    return `${Math.round(bitrate / 1000)} Kbps`
  }

  // Получение индикатора качества
  const getQualityIndicator = () => {
    if (!stats?.outbound) return { color: 'gray', text: 'Нет данных' }
    
    const fps = stats.outbound.framesPerSecond || 0
    const qualityLimitation = stats.outbound.qualityLimitationReason

    if (qualityLimitation === 'cpu') {
      return { color: 'red', text: 'Ограничено CPU' }
    } else if (qualityLimitation === 'bandwidth') {
      return { color: 'orange', text: 'Ограничено сетью' }
    } else if (fps >= 55) {
      return { color: 'green', text: 'Отлично' }
    } else if (fps >= 25) {
      return { color: 'yellow', text: 'Хорошо' }
    } else {
      return { color: 'red', text: 'Плохо' }
    }
  }

  const qualityIndicator = getQualityIndicator()

  // Стили для кнопок в зависимости от темы
  const getButtonStyles = (isActive = false) => {
    if (theme === 'dark') {
      return `${isActive 
        ? 'bg-purple-600 text-white border-purple-500' 
        : 'bg-slate-700/80 text-slate-200 border-slate-600 hover:bg-slate-600/80'
      } border backdrop-blur-sm transition-colors`
    } else {
      return `${isActive 
        ? 'bg-blue-600 text-white border-blue-500' 
        : 'bg-white/80 text-gray-700 border-gray-300 hover:bg-white/90'
      } border backdrop-blur-sm transition-colors`
    }
  }

  const getContainerStyles = () => {
    if (theme === 'dark') {
      return 'bg-slate-800/90 border-slate-600 text-slate-200'
    } else {
      return 'bg-white/90 border-gray-300 text-gray-800'
    }
  }

  // Если нет screen sharing, не показываем контрол
  if (!isScreenSharing || !peer) {
    return null
  }

  return (
    <div className={`relative ${className}`}>
      {/* Кнопка открытия панели */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-lg ${getButtonStyles()} flex items-center space-x-2`}
        title="Настройки качества видео"
      >
        <Settings className="w-4 h-4" />
        <div className={`w-2 h-2 rounded-full bg-${qualityIndicator.color}-500`} />
      </button>

      {/* Панель управления качеством */}
      {isOpen && (
        <div className={`absolute bottom-full right-0 mb-2 p-4 rounded-lg border backdrop-blur-md min-w-80 z-50 ${getContainerStyles()}`}>
          {/* Заголовок */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium flex items-center space-x-2">
              <Monitor className="w-4 h-4" />
              <span>Качество видео</span>
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700 text-xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Текущие статистики */}
          {stats?.outbound && (
            <div className="mb-4 p-3 rounded-lg bg-black/10 border border-gray-200 dark:border-slate-600">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">FPS:</span>
                  <span className="ml-1 font-mono">{Math.round(stats.outbound.framesPerSecond || 0)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Битрейт:</span>
                  <span className="ml-1 font-mono">{formatBitrate(stats.outbound.bitrate || 0)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Разрешение:</span>
                  <span className="ml-1 font-mono">
                    {stats.outbound.frameWidth}×{stats.outbound.frameHeight}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-500">Статус:</span>
                  <div className="ml-1 flex items-center space-x-1">
                    <div className={`w-2 h-2 rounded-full bg-${qualityIndicator.color}-500`} />
                    <span className="text-xs">{qualityIndicator.text}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Переключатель автоадаптации */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm flex items-center space-x-2">
              <Zap className="w-4 h-4" />
              <span>Автоадаптация</span>
            </span>
            <button
              onClick={() => setAutoAdapt(!autoAdapt)}
              className={`w-10 h-5 rounded-full border-2 flex items-center transition-colors ${
                autoAdapt 
                  ? 'bg-green-500 border-green-500' 
                  : 'bg-gray-300 border-gray-300 dark:bg-slate-600 dark:border-slate-600'
              }`}
            >
              <div className={`w-3 h-3 bg-white rounded-full transition-transform ${
                autoAdapt ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Предустановки качества */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center space-x-2">
              <BarChart3 className="w-3 h-3" />
              <span>Предустановки</span>
            </h4>
            
            {Object.entries(VIDEO_QUALITY_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => !autoAdapt && applyQuality(key as keyof typeof VIDEO_QUALITY_PRESETS)}
                disabled={autoAdapt}
                className={`w-full p-2 rounded text-left transition-colors ${
                  currentQuality === key 
                    ? getButtonStyles(true)
                    : getButtonStyles(false)
                } ${autoAdapt ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-sm">{key}</div>
                    <div className="text-xs opacity-70">
                      {preset.width}×{preset.height} • {preset.frameRate} FPS
                    </div>
                  </div>
                  <div className="text-xs opacity-70">
                    {formatBitrate(preset.bitrate.maxBitrate)}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Справка */}
          <div className="mt-4 p-2 rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <div className="text-xs text-blue-700 dark:text-blue-300 flex items-start space-x-2">
              <Eye className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium">Автоадаптация включена</div>
                <div className="opacity-80">
                  Качество автоматически подстраивается под производительность системы и сети
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default VideoQualityControl
