import type { IceServerConfig, PeerConfig } from './types'

// Максимально оптимизированная конфигурация ICE серверов
export const getIceServers = (): IceServerConfig[] => [
  // Основные быстрые STUN серверы Google
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },

  // Надежные TURN серверы для сложных сетей
  {
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
      'turns:openrelay.metered.ca:443'
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },

  // Дополнительные TURN серверы для надежности
  {
    urls: [
      'turn:relay.backups.cz',
      'turn:relay.backups.cz:443'
    ],
    username: 'webrtc',
    credential: 'webrtc'
  },

  // Альтернативные STUN серверы
  { urls: 'stun:stun.freeswitch.org' },
  { urls: 'stun:stun.voip.blackberry.com:3478' },
  { urls: 'stun:stun.sipgate.net:3478' },
  { urls: 'stun:stun.ekiga.net' },
  { urls: 'stun:stun.ideasip.com' }
]

// Получить базовую конфигурацию peer connection
export const getPeerConfig = (): PeerConfig => ({
  iceServers: getIceServers(),
  iceTransportPolicy: 'all',
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require' as const,
  iceCandidatePoolSize: 10, // Оптимизируем для стабильности
  certificates: undefined // Автогенерация сертификата
})

// Получить конфигурацию для offer
export const getOfferOptions = () => ({
  offerToReceiveAudio: true,
  offerToReceiveVideo: true,  // Всегда разрешаем получать video (для screen sharing)
  // Оптимизация для высокого качества видео
  voiceActivityDetection: false, // Отключаем VAD для стабильности
  iceRestart: false
})

// Получить конфигурацию для answer
export const getAnswerOptions = () => ({
  offerToReceiveAudio: true,
  offerToReceiveVideo: true,  // Всегда разрешаем получать video (для screen sharing)
  // Оптимизация для высокого качества видео
  voiceActivityDetection: false // Отключаем VAD для стабильности
})

// Получить конфигурацию data channel
export const getChannelConfig = (): RTCDataChannelInit => ({
  ordered: true,
  maxRetransmits: 30
})

// Импорт мобильных утилит
import { isMobileDevice, isIOSDevice, isAndroidDevice } from '@/utils/mobileAudioFix'

// РАДИКАЛЬНОЕ РЕШЕНИЕ: Минимум ограничений, браузер сам выбирает настройки
export const getAudioConstraints = () => {
  console.log('🔥 RADICAL SOLUTION: Using absolute minimal constraints')
  
  // САМЫЕ ПРОСТЫЕ настройки - просто audio: true
  // Браузер сам выберет лучшие параметры
  const absoluteMinimal = {
    video: false,
    audio: true  // ВСЁ! Никаких дополнительных параметров!
  }

  console.log('🔥 Constraints:', absoluteMinimal)
  return absoluteMinimal
}

// Новая функция для диагностики кодеков и совместимости
export const diagnoseCodecCompatibility = async () => {
  try {
    const audioCapabilities = RTCRtpSender.getCapabilities('audio')
    const receiverCapabilities = RTCRtpReceiver.getCapabilities('audio')
    
    console.log('🔍 Supported audio send codecs:', audioCapabilities?.codecs?.map(c => c.mimeType))
    console.log('🔍 Supported audio receive codecs:', receiverCapabilities?.codecs?.map(c => c.mimeType))
    
    // Проверяем совместимые кодеки
    const compatibleCodecs = audioCapabilities?.codecs?.filter(sendCodec =>
      receiverCapabilities?.codecs?.some(recvCodec => 
        recvCodec.mimeType === sendCodec.mimeType
      )
    )
    
    console.log('🎯 Compatible audio codecs:', compatibleCodecs?.map(c => c.mimeType))
    
    return {
      sendCodecs: audioCapabilities?.codecs || [],
      receiveCodecs: receiverCapabilities?.codecs || [],
      compatibleCodecs: compatibleCodecs || [],
      platform: isMobileDevice() ? 'mobile' : 'desktop',
      deviceType: isIOSDevice() ? 'iOS' : isAndroidDevice() ? 'Android' : 'Desktop'
    }
  } catch (error) {
    console.error('🔍 Codec compatibility check failed:', error)
    return null
  }
}

// Функция для установки предпочтительных кодеков для совместимости
export const setCompatibleCodecPreferences = async (peer: any, transceivers?: any[]) => {
  try {
    console.log('🎯 Setting compatible codec preferences for cross-platform calls...')
    
    // Получаем поддерживаемые кодеки
    const capabilities = RTCRtpReceiver.getCapabilities('audio')
    if (!capabilities || !capabilities.codecs) {
      console.warn('🎯 No audio capabilities available')
      return
    }
    
    // Приоритетные кодеки для максимальной совместимости
    const preferredCodecOrder = [
      'audio/opus',     // Лучший выбор для WebRTC
      'audio/PCMU',     // G.711 μ-law - универсальный
      'audio/PCMA',     // G.711 A-law - универсальный
      'audio/G722',     // Хорошее качество
      'audio/telephone-event' // Для DTMF
    ]
    
    // Фильтруем и сортируем кодеки по приоритету
    const sortedCodecs = preferredCodecOrder.flatMap(mimeType =>
      capabilities.codecs.filter(codec => codec.mimeType === mimeType)
    ).concat(
      // Добавляем остальные кодеки в конце
      capabilities.codecs.filter(codec => 
        !preferredCodecOrder.includes(codec.mimeType)
      )
    )
    
    console.log('🎯 Preferred codec order:', sortedCodecs.map(c => c.mimeType))
    
    // Применяем к существующим трансиверам
    const allTransceivers = transceivers || peer?.getTransceivers?.() || []
    
    for (const transceiver of allTransceivers) {
      if (transceiver && transceiver.receiver?.track?.kind === 'audio') {
        try {
          transceiver.setCodecPreferences(sortedCodecs)
          console.log('🎯 Codec preferences set for audio transceiver')
        } catch (err) {
          console.warn('🎯 Failed to set codec preferences:', err)
        }
      }
    }
    
    return sortedCodecs
    
  } catch (error) {
    console.error('🎯 Error setting codec preferences:', error)
    return null
  }
}

// Функция для создания peer connection с оптимизированными настройками
export const getOptimizedPeerConfig = (): PeerConfig => {
  const baseConfig = getPeerConfig()
  
  // Дополнительные оптимизации для решения проблем компьютер→телефон
  return {
    ...baseConfig,
    // Более агрессивное собирание кандидатов
    iceCandidatePoolSize: 15,
    // Принудительное использование bundle для лучшей совместимости
    bundlePolicy: 'max-bundle',
    // Требуем RTCP multiplexing для стабильности
    rtcpMuxPolicy: 'require',
    // Дополнительные настройки для мобильной совместимости
    iceTransportPolicy: 'all' // Разрешаем все типы соединений
  }
}
