'use client'

import { useEffect, useState } from 'react'
import useCallStore from '@/store/useCallStore'

interface AudioDiagnosticsProps {
  onClose: () => void
}

const AudioDiagnostics = ({ onClose }: AudioDiagnosticsProps) => {
  const { localStream, remoteStream, peer } = useCallStore()
  const [localAudioInfo, setLocalAudioInfo] = useState<any>(null)
  const [remoteAudioInfo, setRemoteAudioInfo] = useState<any>(null)
  const [peerInfo, setPeerInfo] = useState<any>(null)

  useEffect(() => {
    const updateDiagnostics = () => {
      // Local stream info
      if (localStream) {
        const audioTracks = localStream.getAudioTracks()
        setLocalAudioInfo({
          id: localStream.id,
          active: localStream.active,
          tracks: audioTracks.map(track => ({
            id: track.id,
            kind: track.kind,
            label: track.label,
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState,
            settings: track.getSettings(),
            constraints: track.getConstraints()
          }))
        })
      }

      // Remote stream info
      if (remoteStream) {
        const audioTracks = remoteStream.getAudioTracks()
        setRemoteAudioInfo({
          id: remoteStream.id,
          active: remoteStream.active,
          tracks: audioTracks.map(track => ({
            id: track.id,
            kind: track.kind,
            label: track.label,
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState,
            settings: track.getSettings(),
            constraints: track.getConstraints()
          }))
        })
      }

      // Peer connection info
      if (peer && !peer.destroyed) {
        try {
          const peerConnection = (peer as any)._pc
          if (peerConnection) {
            setPeerInfo({
              connectionState: peerConnection.connectionState,
              iceConnectionState: peerConnection.iceConnectionState,
              iceGatheringState: peerConnection.iceGatheringState,
              signalingState: peerConnection.signalingState,
              localDescription: peerConnection.localDescription?.type,
              remoteDescription: peerConnection.remoteDescription?.type
            })
          }
        } catch (err) {
          console.error('Error getting peer info:', err)
        }
      }
    }

    updateDiagnostics()
    const interval = setInterval(updateDiagnostics, 1000)

    return () => clearInterval(interval)
  }, [localStream, remoteStream, peer])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Диагностика аудио</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Local Stream */}
            <div className="border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3 text-green-600">Локальный поток</h3>
              {localAudioInfo ? (
                <div className="space-y-2 text-sm">
                  <div><strong>ID:</strong> {localAudioInfo.id}</div>
                  <div><strong>Активен:</strong> {localAudioInfo.active ? 'Да' : 'Нет'}</div>
                  <div><strong>Треки:</strong> {localAudioInfo.tracks.length}</div>
                  {localAudioInfo.tracks.map((track: any, index: number) => (
                    <div key={index} className="ml-4 p-2 bg-gray-50 rounded">
                      <div><strong>Включен:</strong> {track.enabled ? 'Да' : 'Нет'}</div>
                      <div><strong>Заглушен:</strong> {track.muted ? 'Да' : 'Нет'}</div>
                      <div><strong>Состояние:</strong> {track.readyState}</div>
                      <div><strong>Настройки:</strong></div>
                      <pre className="text-xs bg-gray-100 p-1 rounded overflow-x-auto">
                        {JSON.stringify(track.settings, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Нет данных</p>
              )}
            </div>

            {/* Remote Stream */}
            <div className="border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3 text-blue-600">Удаленный поток</h3>
              {remoteAudioInfo ? (
                <div className="space-y-2 text-sm">
                  <div><strong>ID:</strong> {remoteAudioInfo.id}</div>
                  <div><strong>Активен:</strong> {remoteAudioInfo.active ? 'Да' : 'Нет'}</div>
                  <div><strong>Треки:</strong> {remoteAudioInfo.tracks.length}</div>
                  {remoteAudioInfo.tracks.map((track: any, index: number) => (
                    <div key={index} className="ml-4 p-2 bg-gray-50 rounded">
                      <div><strong>Включен:</strong> {track.enabled ? 'Да' : 'Нет'}</div>
                      <div><strong>Заглушен:</strong> {track.muted ? 'Да' : 'Нет'}</div>
                      <div><strong>Состояние:</strong> {track.readyState}</div>
                      <div><strong>Настройки:</strong></div>
                      <pre className="text-xs bg-gray-100 p-1 rounded overflow-x-auto">
                        {JSON.stringify(track.settings, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Нет данных</p>
              )}
            </div>

            {/* Peer Connection */}
            <div className="border rounded-lg p-4 md:col-span-2">
              <h3 className="text-lg font-semibold mb-3 text-purple-600">Соединение</h3>
              {peerInfo ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <div><strong>Состояние:</strong> {peerInfo.connectionState}</div>
                    <div><strong>ICE соединение:</strong> {peerInfo.iceConnectionState}</div>
                  </div>
                  <div>
                    <div><strong>ICE сбор:</strong> {peerInfo.iceGatheringState}</div>
                    <div><strong>Сигнализация:</strong> {peerInfo.signalingState}</div>
                  </div>
                  <div>
                    <div><strong>Локальное описание:</strong> {peerInfo.localDescription || 'Нет'}</div>
                    <div><strong>Удаленное описание:</strong> {peerInfo.remoteDescription || 'Нет'}</div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">Нет данных о соединении</p>
              )}
            </div>
          </div>

          <div className="mt-6 text-sm text-gray-600">
            <p><strong>Обновляется каждую секунду</strong></p>
            <p>Если удаленный поток показывает треки, но нет звука - проверьте настройки браузера и autoplay.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AudioDiagnostics
