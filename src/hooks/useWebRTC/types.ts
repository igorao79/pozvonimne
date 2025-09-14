import SimplePeer from 'simple-peer'

export interface SignalMessage {
  signal: any
  from: string
}

export interface KeepAliveMessage {
  type: 'keep_alive' | 'keep_alive_response'
  timestamp: number
  from: string
  originalTimestamp?: number
}

export interface WebRTCHooks {
  peer: SimplePeer.Instance | null
}

export interface PeerRefs {
  peerRef: React.MutableRefObject<SimplePeer.Instance | null>
  signalBufferRef: React.MutableRefObject<SignalMessage[]>
  keepAliveIntervalRef: React.MutableRefObject<NodeJS.Timeout | null>
  connectionCheckIntervalRef: React.MutableRefObject<NodeJS.Timeout | null>
  reconnectTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>
  lastKeepAliveRef: React.MutableRefObject<number>
  reconnectAttemptsRef: React.MutableRefObject<number>
}

export interface IceServerConfig {
  urls: string | string[]
  username?: string
  credential?: string
}

export interface PeerConfig {
  iceServers: IceServerConfig[]
  iceTransportPolicy: 'all' | 'relay'
  bundlePolicy: 'balanced' | 'max-bundle' | 'max-compat'
  rtcpMuxPolicy?: 'require'
  iceCandidatePoolSize: number
  certificates?: RTCCertificate[]
}

export interface OfferOptions {
  offerToReceiveAudio: boolean
  offerToReceiveVideo: boolean
}

export interface AnswerOptions {
  offerToReceiveAudio: boolean
  offerToReceiveVideo: boolean
}

export interface SimplePeerConfig {
  initiator: boolean
  trickle: boolean
  stream: MediaStream
  config: PeerConfig
  offerOptions: OfferOptions
  answerOptions: AnswerOptions
  allowHalfTrickle: boolean
  objectMode: boolean
  channelConfig: RTCDataChannelInit
  channelName: string
}
