'use client'

import { useEffect, useState } from 'react'
import useCallStore from '@/store/useCallStore'
import { Wifi, WifiOff, AlertCircle, CheckCircle, Clock } from 'lucide-react'

interface ConnectionStats {
  connectionState: string
  iceConnectionState: string
  iceGatheringState: string
  connected: boolean
  lastKeepAlive: number
  reconnectAttempts: number
}

const ConnectionStatus = () => {
  const { peer, isCallActive } = useCallStore()
  const [stats, setStats] = useState<ConnectionStats>({
    connectionState: 'new',
    iceConnectionState: 'new', 
    iceGatheringState: 'new',
    connected: false,
    lastKeepAlive: 0,
    reconnectAttempts: 0
  })
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    if (!peer || !isCallActive) return

    const updateStats = () => {
      const pc = (peer as any)._pc
      if (pc) {
        setStats({
          connectionState: pc.connectionState || 'unknown',
          iceConnectionState: pc.iceConnectionState || 'unknown',
          iceGatheringState: pc.iceGatheringState || 'unknown',
          connected: peer.connected || false,
          lastKeepAlive: Date.now(), // Обновляется при каждом вызове
          reconnectAttempts: 0
        })
      }
    }

    // Обновляем статистику каждые 2 секунды
    updateStats()
    const interval = setInterval(updateStats, 2000)

    return () => clearInterval(interval)
  }, [peer, isCallActive])

  if (!isCallActive) return null

  const getConnectionColor = () => {
    if (stats.connectionState === 'connected' && stats.iceConnectionState === 'connected') {
      return 'text-green-600 dark:text-green-400'
    } else if (stats.connectionState === 'connecting' || stats.iceConnectionState === 'connecting') {
      return 'text-yellow-600'
    } else if (stats.connectionState === 'failed' || stats.iceConnectionState === 'failed') {
      return 'text-destructive'
    } else {
      return 'text-muted-foreground'
    }
  }

  const getConnectionIcon = () => {
    if (stats.connectionState === 'connected' && stats.iceConnectionState === 'connected') {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    } else if (stats.connectionState === 'connecting' || stats.iceConnectionState === 'connecting') {
      return <Clock className="h-4 w-4 text-yellow-500" />
    } else if (stats.connectionState === 'failed' || stats.iceConnectionState === 'failed') {
      return <AlertCircle className="h-4 w-4 text-red-500" />
    } else {
      return <WifiOff className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusText = () => {
    if (stats.connectionState === 'connected' && stats.iceConnectionState === 'connected') {
      return 'Подключено'
    } else if (stats.connectionState === 'connecting' || stats.iceConnectionState === 'connecting') {
      return 'Подключение...'
    } else if (stats.connectionState === 'failed' || stats.iceConnectionState === 'failed') {
      return 'Ошибка соединения'
    } else if (stats.connectionState === 'disconnected' || stats.iceConnectionState === 'disconnected') {
      return 'Переподключение...'
    } else {
      return 'Инициализация...'
    }
  }

  return (
    <div className="fixed top-16 right-4 z-50">
      <div className="bg-card/95 backdrop-blur-md rounded-lg shadow-lg border border-border p-2 min-w-[180px]">
        {/* Основной индикатор */}
        <div
          className="flex items-center space-x-2 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {getConnectionIcon()}
          <div className="flex-1 min-w-0">
            <div className={`font-medium text-xs ${getConnectionColor()}`}>
              {getStatusText()}
            </div>
            {stats.connected && (
              <div className="text-xs text-muted-foreground flex items-center space-x-1">
                <Wifi className="h-3 w-3" />
                <span>Keep-alive</span>
              </div>
            )}
          </div>
          <button className="text-muted-foreground hover:text-foreground transition-colors p-0.5">
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>

        {/* Расширенная информация */}
        {isExpanded && (
          <div className="mt-2 pt-2 border-t border-border space-y-1.5 text-xs">
            <div className="grid grid-cols-1 gap-1">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Соединение:</span>
                <span className={getConnectionColor()}>{stats.connectionState}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">ICE:</span>
                <span className={getConnectionColor()}>{stats.iceConnectionState}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">ICE сбор:</span>
                <span className="text-foreground">{stats.iceGatheringState}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Data Channel:</span>
                <span className={stats.connected ? 'text-green-600 dark:text-green-400' : 'text-destructive'}>
                  {stats.connected ? 'Активен' : 'Неактивен'}
                </span>
              </div>
            </div>

            {stats.reconnectAttempts > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Переподключения:</span>
                <span className="text-orange-600">{stats.reconnectAttempts}/3</span>
              </div>
            )}

            <div className="text-xs text-muted-foreground pt-1 border-t border-border">
              {new Date().toLocaleTimeString()}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ConnectionStatus
