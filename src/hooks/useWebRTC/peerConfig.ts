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
  iceCandidatePoolSize: 15, // Увеличиваем пул для лучшего соединения
  certificates: undefined // Автогенерация сертификата
})

// Получить конфигурацию для offer
export const getOfferOptions = () => ({
  offerToReceiveAudio: true,
  offerToReceiveVideo: true  // Всегда разрешаем получать video (для screen sharing)
})

// Получить конфигурацию для answer
export const getAnswerOptions = () => ({
  offerToReceiveAudio: true,
  offerToReceiveVideo: true  // Всегда разрешаем получать video (для screen sharing)
})

// Получить конфигурацию data channel
export const getChannelConfig = (): RTCDataChannelInit => ({
  ordered: true,
  maxRetransmits: 30
})

// Получить конфигурацию аудио потока
export const getAudioConstraints = () => ({
  video: false,
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    googEchoCancellation: true,
    googAutoGainControl: true,
    googNoiseSuppression: true,
    googHighpassFilter: true,
    googTypingNoiseDetection: true,
    sampleRate: 48000, // Высокое качество звука
    sampleSize: 16,
    channelCount: 1, // Моно для экономии трафика
    latency: 0.01, // Минимальная задержка
    volume: 1.0
  }
})
