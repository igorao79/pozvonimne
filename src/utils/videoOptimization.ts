'use client'

/**
 * Утилиты для оптимизации качества видеопотока WebRTC
 * Управление битрейтом, адаптация качества, мониторинг производительности
 */

interface BitrateConstraints {
  minBitrate: number
  maxBitrate: number
  startBitrate?: number
}

interface VideoQualitySettings {
  width: number
  height: number
  frameRate: number
  bitrate: BitrateConstraints
}

/**
 * Предустановки качества видео для разных сценариев
 */
export const VIDEO_QUALITY_PRESETS = {
  // Максимальное качество для мощных систем
  ULTRA: {
    width: 1920,
    height: 1080,
    frameRate: 60,
    bitrate: {
      minBitrate: 4000000, // 4 Mbps
      maxBitrate: 10000000, // 10 Mbps
      startBitrate: 6000000 // 6 Mbps
    }
  },
  // Высокое качество для обычных систем
  HIGH: {
    width: 1920,
    height: 1080,
    frameRate: 30,
    bitrate: {
      minBitrate: 2000000, // 2 Mbps
      maxBitrate: 6000000, // 6 Mbps
      startBitrate: 4000000 // 4 Mbps
    }
  },
  // Среднее качество для слабых систем/сетей
  MEDIUM: {
    width: 1280,
    height: 720,
    frameRate: 30,
    bitrate: {
      minBitrate: 1000000, // 1 Mbps
      maxBitrate: 3000000, // 3 Mbps
      startBitrate: 2000000 // 2 Mbps
    }
  },
  // Низкое качество для очень слабых систем
  LOW: {
    width: 854,
    height: 480,
    frameRate: 15,
    bitrate: {
      minBitrate: 500000, // 0.5 Mbps
      maxBitrate: 1500000, // 1.5 Mbps
      startBitrate: 1000000 // 1 Mbps
    }
  }
} as const

/**
 * Применяет ограничения битрейта к RTCRtpSender
 */
export const applyBitrateConstraints = async (
  peer: any,
  constraints: BitrateConstraints
): Promise<boolean> => {
  try {
    if (!peer || peer.destroyed) {
      console.warn('📺 Cannot apply bitrate constraints - peer not available')
      return false
    }

    const pc = peer._pc
    if (!pc || typeof pc.getSenders !== 'function') {
      console.warn('📺 Cannot apply bitrate constraints - RTCPeerConnection not available')
      return false
    }

    const senders = pc.getSenders()
    let applied = false

    for (const sender of senders) {
      if (sender.track && sender.track.kind === 'video') {
        try {
          const params = sender.getParameters()
          
          if (!params.encodings) {
            params.encodings = [{}]
          }

          // Применяем ограничения битрейта к каждому encoding
          params.encodings.forEach((encoding: any) => {
            encoding.minBitrate = constraints.minBitrate
            encoding.maxBitrate = constraints.maxBitrate
            if (constraints.startBitrate) {
              encoding.startBitrate = constraints.startBitrate
            }
            // Дополнительные оптимизации
            encoding.priority = 'high'
            encoding.networkPriority = 'high'
          })

          await sender.setParameters(params)
          console.log('📺 Applied bitrate constraints:', constraints)
          applied = true
        } catch (err) {
          console.warn('📺 Failed to apply bitrate constraints to sender:', err)
        }
      }
    }

    return applied
  } catch (err) {
    console.error('📺 Error applying bitrate constraints:', err)
    return false
  }
}

/**
 * Получает текущие статистики качества видео
 */
export const getVideoQualityStats = async (peer: any): Promise<any> => {
  try {
    if (!peer || peer.destroyed) return null

    const pc = peer._pc
    if (!pc || typeof pc.getStats !== 'function') return null

    const stats = await pc.getStats()
    const videoStats: any = {}

    stats.forEach((report: any) => {
      if (report.type === 'outbound-rtp' && report.kind === 'video') {
        videoStats.outbound = {
          bytesSent: report.bytesSent,
          packetsSent: report.packetsSent,
          packetsLost: report.packetsLost,
          bitrate: report.bytesSent ? (report.bytesSent * 8) / report.timestamp * 1000 : 0,
          frameWidth: report.frameWidth,
          frameHeight: report.frameHeight,
          framesPerSecond: report.framesPerSecond,
          qualityLimitationReason: report.qualityLimitationReason
        }
      }
      
      if (report.type === 'inbound-rtp' && report.kind === 'video') {
        videoStats.inbound = {
          bytesReceived: report.bytesReceived,
          packetsReceived: report.packetsReceived,
          packetsLost: report.packetsLost,
          bitrate: report.bytesReceived ? (report.bytesReceived * 8) / report.timestamp * 1000 : 0,
          frameWidth: report.frameWidth,
          frameHeight: report.frameHeight,
          framesPerSecond: report.framesPerSecond,
          framesDropped: report.framesDropped
        }
      }
    })

    return videoStats
  } catch (err) {
    console.error('📺 Error getting video quality stats:', err)
    return null
  }
}

/**
 * Автоматическая адаптация качества на основе производительности
 */
export const adaptVideoQuality = async (
  peer: any,
  currentQuality: keyof typeof VIDEO_QUALITY_PRESETS
): Promise<keyof typeof VIDEO_QUALITY_PRESETS | null> => {
  try {
    const stats = await getVideoQualityStats(peer)
    if (!stats) return null

    const outbound = stats.outbound
    if (!outbound) return null

    // Анализируем причины ограничения качества
    const qualityLimitation = outbound.qualityLimitationReason

    console.log('📺 Video quality analysis:', {
      currentQuality,
      qualityLimitation,
      actualFps: outbound.framesPerSecond,
      actualBitrate: Math.round(outbound.bitrate / 1000000 * 10) / 10, // Mbps
      resolution: `${outbound.frameWidth}x${outbound.frameHeight}`
    })

    // Если качество ограничено процессором или пропускной способностью
    if (qualityLimitation === 'cpu' || qualityLimitation === 'bandwidth') {
      // Понижаем качество
      switch (currentQuality) {
        case 'ULTRA':
          console.log('📺 Adapting quality: ULTRA → HIGH (CPU/bandwidth limitation)')
          return 'HIGH'
        case 'HIGH':
          console.log('📺 Adapting quality: HIGH → MEDIUM (CPU/bandwidth limitation)')
          return 'MEDIUM'
        case 'MEDIUM':
          console.log('📺 Adapting quality: MEDIUM → LOW (CPU/bandwidth limitation)')
          return 'LOW'
        case 'LOW':
          console.log('📺 Already at lowest quality')
          return null
      }
    }

    // Если ограничений нет и FPS стабильный, можно попробовать повысить
    if (qualityLimitation === 'none' && outbound.framesPerSecond >= 25) {
      switch (currentQuality) {
        case 'LOW':
          console.log('📺 Adapting quality: LOW → MEDIUM (good performance)')
          return 'MEDIUM'
        case 'MEDIUM':
          console.log('📺 Adapting quality: MEDIUM → HIGH (good performance)')
          return 'HIGH'
        case 'HIGH':
          // Только если FPS действительно высокий
          if (outbound.framesPerSecond >= 55) {
            console.log('📺 Adapting quality: HIGH → ULTRA (excellent performance)')
            return 'ULTRA'
          }
          return null
        case 'ULTRA':
          return null
      }
    }

    return null
  } catch (err) {
    console.error('📺 Error adapting video quality:', err)
    return null
  }
}

/**
 * Мониторинг производительности видеопотока
 */
export class VideoPerformanceMonitor {
  private peer: any = null
  private monitoringInterval: NodeJS.Timeout | null = null
  private currentQuality: keyof typeof VIDEO_QUALITY_PRESETS = 'HIGH'
  private onQualityChange?: (quality: keyof typeof VIDEO_QUALITY_PRESETS) => void

  constructor(peer: any, initialQuality: keyof typeof VIDEO_QUALITY_PRESETS = 'HIGH') {
    this.peer = peer
    this.currentQuality = initialQuality
  }

  setQualityChangeCallback(callback: (quality: keyof typeof VIDEO_QUALITY_PRESETS) => void) {
    this.onQualityChange = callback
  }

  start() {
    console.log('📺 Starting video performance monitoring')
    
    // Мониторинг каждые 5 секунд
    this.monitoringInterval = setInterval(async () => {
      try {
        const newQuality = await adaptVideoQuality(this.peer, this.currentQuality)
        
        if (newQuality && newQuality !== this.currentQuality) {
          console.log(`📺 Quality adapted: ${this.currentQuality} → ${newQuality}`)
          this.currentQuality = newQuality
          
          // Применяем новые ограничения битрейта
          const qualitySettings = VIDEO_QUALITY_PRESETS[newQuality]
          await applyBitrateConstraints(this.peer, qualitySettings.bitrate)
          
          // Уведомляем о смене качества
          if (this.onQualityChange) {
            this.onQualityChange(newQuality)
          }
        }
      } catch (err) {
        console.error('📺 Error in performance monitoring:', err)
      }
    }, 5000)
  }

  stop() {
    console.log('📺 Stopping video performance monitoring')
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
  }

  getCurrentQuality() {
    return this.currentQuality
  }

  async forceQuality(quality: keyof typeof VIDEO_QUALITY_PRESETS) {
    console.log(`📺 Forcing video quality to: ${quality}`)
    this.currentQuality = quality
    const qualitySettings = VIDEO_QUALITY_PRESETS[quality]
    return await applyBitrateConstraints(this.peer, qualitySettings.bitrate)
  }
}

/**
 * Детектор системных возможностей для выбора оптимального качества
 */
export const detectOptimalQuality = (): keyof typeof VIDEO_QUALITY_PRESETS => {
  try {
    // Анализируем характеристики системы
    const userAgent = navigator.userAgent.toLowerCase()
    const platform = navigator.platform.toLowerCase()
    
    // Примерная оценка мощности системы
    let systemPower = 'medium'
    
    // Проверяем мобильное устройство
    const isMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
    if (isMobile) {
      systemPower = 'low'
    }
    
    // Проверяем процессор (приблизительно)
    const hardwareConcurrency = navigator.hardwareConcurrency || 4
    const memory = (navigator as any).deviceMemory || 4
    
    if (hardwareConcurrency >= 8 && memory >= 8 && !isMobile) {
      systemPower = 'high'
    } else if (hardwareConcurrency >= 4 && memory >= 4) {
      systemPower = 'medium'
    } else {
      systemPower = 'low'
    }
    
    // Выбираем качество на основе оценки
    switch (systemPower) {
      case 'high':
        return 'ULTRA'
      case 'medium':
        return 'HIGH'
      case 'low':
      default:
        return 'MEDIUM'
    }
  } catch (err) {
    console.warn('📺 Error detecting optimal quality, using HIGH as default:', err)
    return 'HIGH'
  }
}
