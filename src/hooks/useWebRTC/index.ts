// Основной хук
export { default } from './useWebRTC'

// Типы
export type {
  SignalMessage,
  KeepAliveMessage,
  WebRTCHooks,
  PeerRefs,
  IceServerConfig,
  PeerConfig,
  OfferOptions,
  AnswerOptions,
  SimplePeerConfig
} from './types'

// Функции конфигурации
export {
  getIceServers,
  getPeerConfig,
  getOfferOptions,
  getAnswerOptions,
  getChannelConfig,
  getAudioConstraints
} from './peerConfig'

// Функции обработки сигналов
export {
  processBufferedSignals,
  bufferSignal,
  handleIncomingSignal,
  sendSignal
} from './signalHandlers'

// Keep-alive функции
export {
  startKeepAlive,
  stopKeepAlive,
  handleKeepAliveMessage,
  checkKeepAliveActivity
} from './keepAlive'

// Функции мониторинга соединения
export {
  startConnectionMonitoring,
  stopConnectionMonitoring
} from './connectionMonitor'

// Функции переподключения
export {
  attemptReconnection,
  resetReconnectionCounter,
  handlePeerError,
  handlePeerClose
} from './reconnection'

// Функции инициализации peer
export { initializePeer } from './peerInitialization'
