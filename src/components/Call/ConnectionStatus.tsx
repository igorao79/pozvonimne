'use client'

import { useEffect, useState } from 'react'
import useCallStore from '@/store/useCallStore'

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
      return 'text-green-600'
    } else if (stats.connectionState === 'connecting' || stats.iceConnectionState === 'connecting') {
      return 'text-yellow-600'
    } else if (stats.connectionState === 'failed' || stats.iceConnectionState === 'failed') {
      return 'text-red-600'
    } else {
      return 'text-gray-600'
    }
  }

  const getConnectionIcon = () => {
    if (stats.connectionState === 'connected' && stats.iceConnectionState === 'connected') {
      return '🟢'
    } else if (stats.connectionState === 'connecting' || stats.iceConnectionState === 'connecting') {
      return '🟡'
    } else if (stats.connectionState === 'failed' || stats.iceConnectionState === 'failed') {
      return '🔴'
    } else {
      return '⚪'
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
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-3 min-w-[200px]">
        {/* Основной индикатор */}
        <div 
          className="flex items-center space-x-2 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className="text-lg">{getConnectionIcon()}</span>
          <div className="flex-1">
            <div className={`font-medium text-sm ${getConnectionColor()}`}>
              {getStatusText()}
            </div>
            {stats.connected && (
              <div className="text-xs text-gray-500">
                💓 Keep-alive активен
              </div>
            )}
          </div>
          <button className="text-gray-400 hover:text-gray-600 transition-colors">
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>

        {/* Расширенная информация */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="font-medium text-gray-600">Соединение:</div>
                <div className={getConnectionColor()}>{stats.connectionState}</div>
              </div>
              <div>
                <div className="font-medium text-gray-600">ICE:</div>
                <div className={getConnectionColor()}>{stats.iceConnectionState}</div>
              </div>
            </div>
            
            <div>
              <div className="font-medium text-gray-600">ICE сбор:</div>
              <div className="text-gray-800">{stats.iceGatheringState}</div>
            </div>
            
            <div>
              <div className="font-medium text-gray-600">Data Channel:</div>
              <div className={stats.connected ? 'text-green-600' : 'text-red-600'}>
                {stats.connected ? 'Активен' : 'Неактивен'}
              </div>
            </div>

            {stats.reconnectAttempts > 0 && (
              <div>
                <div className="font-medium text-gray-600">Попытки переподключения:</div>
                <div className="text-orange-600">{stats.reconnectAttempts}/3</div>
              </div>
            )}

            <div className="text-xs text-gray-500 mt-2">
              Обновлено: {new Date().toLocaleTimeString()}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ConnectionStatus
