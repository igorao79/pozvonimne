'use client'

import { useState, useRef, useEffect } from 'react'
import useCallStore from '@/store/useCallStore'
import { ringtoneAPI } from '@/config/api'

interface RingtoneSettingsProps {
  onClose: () => void
}

const RingtoneSettings = ({ onClose }: RingtoneSettingsProps) => {
  const [loading, setLoading] = useState(false)
  const [currentRingtone, setCurrentRingtone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioPreviewRef = useRef<HTMLAudioElement>(null)
  const { userId } = useCallStore()

  // Загружаем текущий рингтон при открытии настроек
  useEffect(() => {
    const loadCurrentRingtone = async () => {
      if (!userId) return

      try {
        console.log('🔊 Loading ringtone for user:', userId)
        const result = await ringtoneAPI.get(userId)
        console.log('🔊 Ringtone API result:', result)

        if (result.success && result.url) {
          console.log('🔊 Setting ringtone URL:', result.url)
          setCurrentRingtone(result.url)

          // Устанавливаем src только после небольшой задержки
          setTimeout(() => {
            if (audioPreviewRef.current) {
              console.log('🔊 Setting audio src to:', result.url)
              audioPreviewRef.current.src = result.url
            }
          }, 100)
        } else {
          console.log('🔊 No ringtone URL in result:', result)
        }
      } catch (err: any) {
        console.error('❌ Error loading current ringtone:', err)
        // Не показываем ошибку пользователю, если рингтона просто нет
        if (!err.message?.includes('404')) {
          setError('Ошибка загрузки текущего рингтона')
        }
      }
    }

    loadCurrentRingtone()
  }, [userId])

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !userId) return

    // Проверяем тип файла
    if (!file.type.startsWith('audio/')) {
      setError('Можно загружать только аудиофайлы')
      return
    }

    // Проверяем размер файла (максимум 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Размер файла не должен превышать 10MB')
      return
    }

    try {
      setLoading(true)
      setError(null)
      setSuccess(null)
      setUploadProgress(0)

      // Отправляем файл на backend
      const result = await ringtoneAPI.upload(userId, file)
      setCurrentRingtone(result.url)
      setSuccess('Рингтон успешно загружен!')
      
      // Воспроизводим предварительный просмотр
      if (audioPreviewRef.current && result.url) {
        console.log('🔊 Setting preview audio src after upload:', result.url)
        audioPreviewRef.current.src = result.url
      }

    } catch (err: any) {
      console.error('Error uploading ringtone:', err)
      setError(err.message || 'Не удалось загрузить рингтон')
    } finally {
      setLoading(false)
      setUploadProgress(0)
    }
  }

  const handleTestRingtone = async () => {
    console.log('🎵 handleTestRingtone called')
    console.log('🎵 currentRingtone:', currentRingtone)
    console.log('🎵 audioPreviewRef.current:', audioPreviewRef.current)

    if (!audioPreviewRef.current) {
      console.error('❌ Audio element not found')
      setError('Аудио элемент не найден')
      return
    }

    if (!currentRingtone) {
      console.error('❌ No ringtone URL')
      setError('Рингтон не найден')
      return
    }

    // Проверяем валидность URL
    try {
      new URL(currentRingtone)
    } catch (e) {
      console.error('❌ Invalid URL:', currentRingtone)
      setError('Неверный URL рингтона')
      return
    }

    try {
      setError(null)

      // Специальная обработка для разных типов ссылок
      if (currentRingtone.includes('mega.nz')) {
        console.log('🔍 Mega.nz URL detected, skipping availability check')
      } else if (currentRingtone.includes('idrivee2') || currentRingtone.includes('X-Amz-')) {
        console.log('🔍 IDrive E2 / S3 signed URL detected, skipping HEAD check')
        // Для signed URLs пропускаем HEAD проверку, так как они часто возвращают 403
      } else {
        console.log('🔍 Checking file availability...')
        // Проверяем доступность файла перед воспроизведением
        const response = await fetch(currentRingtone, { method: 'HEAD' })
        console.log('🔍 File check response:', response.status)

        if (!response.ok) {
          throw new Error(`Файл недоступен: ${response.status}`)
        }

        const contentType = response.headers.get('content-type')
        console.log('🔍 Audio file content-type:', contentType)
      }

      // Очищаем предыдущий src
      audioPreviewRef.current.src = ''
      audioPreviewRef.current.load()

      // Устанавливаем новый источник
      console.log('🔄 Setting audio src...')

      // Для Mega.nz ссылок используем потоковое API
      let audioSrc = currentRingtone
      if (currentRingtone.includes('mega.nz')) {
        console.log('🔄 Processing Mega.nz URL via streaming API...')
        // Используем наш API endpoint для потокового воспроизведения
        const encodedUrl = encodeURIComponent(currentRingtone)
        audioSrc = `/api/ringtones/${userId}?action=stream&url=${encodedUrl}`
        console.log('🔄 Using streaming URL:', audioSrc)
      }

      audioPreviewRef.current.src = audioSrc
      audioPreviewRef.current.preload = 'metadata'

      // Ждем загрузки метаданных
      console.log('⏳ Waiting for metadata...')
      await new Promise((resolve, reject) => {
        const onLoadedMetadata = () => {
          console.log('✅ Metadata loaded successfully')
          audioPreviewRef.current?.removeEventListener('loadedmetadata', onLoadedMetadata)
          audioPreviewRef.current?.removeEventListener('error', onError)
          resolve(void 0)
        }

        const onError = (e: any) => {
          console.error('❌ Audio load error:', e)
          audioPreviewRef.current?.removeEventListener('loadedmetadata', onLoadedMetadata)
          audioPreviewRef.current?.removeEventListener('error', onError)
          reject(new Error(`Ошибка загрузки аудио: ${e.target?.error?.code || 'неизвестная ошибка'}`))
        }

        audioPreviewRef.current?.addEventListener('loadedmetadata', onLoadedMetadata)
        audioPreviewRef.current?.addEventListener('error', onError)

        // Таймаут на загрузку
        setTimeout(() => {
          console.error('⏰ Timeout waiting for metadata')
          audioPreviewRef.current?.removeEventListener('loadedmetadata', onLoadedMetadata)
          audioPreviewRef.current?.removeEventListener('error', onError)
          reject(new Error('Таймаут загрузки аудио'))
        }, 10000)
      })

      // Воспроизводим
      console.log('▶️ Starting playback...')
      await audioPreviewRef.current.play()
      console.log('✅ Playback started successfully')

    } catch (err: any) {
      console.error('❌ Error playing ringtone:', err)

      if (err.name === 'NotSupportedError') {
        if (currentRingtone.includes('mega.nz')) {
          setError('❌ Не удалось воспроизвести Mega.nz файл. Возможно, megatools не установлен на сервере или ссылка недействительна.')
        } else {
          setError('Формат рингтона не поддерживается браузером. Попробуйте конвертировать файл в MP3.')
        }
      } else if (err.message.includes('DEMUXER_ERROR_COULD_NOT_OPEN')) {
        setError('❌ Файл не может быть декодирован. Возможно, ссылка Mega.nz требует специальной обработки.')
      } else if (err.name === 'NotAllowedError') {
        setError('Браузер блокирует воспроизведение. Нажмите на странице для разрешения.')
      } else if (err.message.includes('CORS')) {
        setError('Проблема с CORS. Проверьте настройки сервера.')
      } else if (err.message.includes('NetworkError') || err.message.includes('Failed to fetch')) {
        setError('Не удалось загрузить файл. Проверьте интернет-соединение.')
      } else if (err.message.includes('403') && currentRingtone.includes('idrivee2')) {
        setError('⚠️ IDrive E2 signed URL может быть истекшим. Попробуйте перезагрузить страницу.')
      } else {
        setError(`Не удалось воспроизвести: ${err.message}`)
      }
    }
  }

  const handleRemoveRingtone = async () => {
    if (!userId) return

    try {
      setLoading(true)
      setError(null)

      await ringtoneAPI.remove(userId)

      console.log('🗑️ Ringtone removed, clearing state')
      setCurrentRingtone(null)
      setSuccess('Рингтон удален. Будет использоваться стандартный звонок.')

      if (audioPreviewRef.current) {
        console.log('🗑️ Clearing audio src')
        audioPreviewRef.current.src = ''
        audioPreviewRef.current.load() // Перезагружаем элемент
      }

    } catch (err: any) {
      console.error('Error removing ringtone:', err)
      setError(err.message || 'Не удалось удалить рингтон')
    } finally {
      setLoading(false)
    }
  }

  const handleStopPreview = () => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause()
      audioPreviewRef.current.currentTime = 0
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Настройки рингтона</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}

          {/* Progress bar */}
          {loading && uploadProgress > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Загрузка...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Current ringtone */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Текущий рингтон</h3>
            {(() => {
              console.log('🎵 Render: currentRingtone =', currentRingtone)
              return null
            })()}
            {currentRingtone ? (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-600">Пользовательский рингтон</span>
                  <button
                    onClick={handleRemoveRingtone}
                    disabled={loading}
                    className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
                  >
                    Удалить
                  </button>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleTestRingtone}
                    disabled={loading}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
                  >
                    ▶ Прослушать
                  </button>
                  <button
                    onClick={handleStopPreview}
                    className="bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 text-sm"
                  >
                    ⏹ Стоп
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4">
                <span className="text-sm text-gray-600">Используется стандартный рингтон</span>
              </div>
            )}
          </div>

          {/* Upload section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Загрузить новый рингтон</h3>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              <div className="flex flex-col items-center">
                <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm text-gray-600">
                  {loading ? 'Загрузка...' : 'Нажмите чтобы выбрать аудиофайл'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  MP3, WAV, OGG (максимум 10MB)
                </p>
              </div>
            </button>
          </div>

          {/* Info */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">💡 Информация</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Рингтон будет играть при входящих звонках</li>
              <li>• Поддерживаются форматы: MP3, WAV, OGG</li>
              <li>• Рекомендуемая длительность: 10-30 секунд</li>
              <li>• При замене старый рингтон автоматически удаляется</li>
              <li>• <strong>Mega.nz ссылки поддерживаются</strong> через потоковое воспроизведение</li>
              <li>• <strong>IDrive E2 ссылки поддерживаются</strong> напрямую</li>
            </ul>
          </div>

          {/* Cloud storage status */}
          {currentRingtone?.includes('mega.nz') && (
            <div className="bg-blue-50 rounded-lg p-4 mt-4 border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">🔄 Mega.nz: Используется потоковое воспроизведение</h4>
              <div className="text-sm text-blue-800 space-y-2">
                <p><strong>Статус:</strong> Файл будет воспроизведен через сервер с помощью megatools.</p>
                <p className="mt-2"><strong>Текущая ссылка:</strong></p>
                <code className="bg-blue-100 p-2 rounded text-xs block break-all">
                  {currentRingtone}
                </code>
                <p className="mt-2 text-xs bg-yellow-100 p-2 rounded">
                  ⚠️ <strong>Требования:</strong> На сервере должен быть установлен megatools для работы с Mega.nz файлами
                </p>
              </div>
            </div>
          )}

          {currentRingtone?.includes('idrivee2') && (
            <div className="bg-green-50 rounded-lg p-4 mt-4 border border-green-200">
              <h4 className="font-semibold text-green-900 mb-2">✅ IDrive E2: Прямая ссылка</h4>
              <div className="text-sm text-green-800 space-y-2">
                <p><strong>Статус:</strong> Файл доступен по прямой signed URL.</p>
                <p className="mt-2"><strong>Текущая ссылка:</strong></p>
                <code className="bg-green-100 p-2 rounded text-xs block break-all">
                  {currentRingtone}
                </code>
                <p className="mt-2 text-xs bg-blue-100 p-2 rounded">
                  ℹ️ <strong>Примечание:</strong> Signed URLs имеют ограниченное время жизни (обычно 1 час)
                </p>
                <div className="mt-2">
                  <button
                    onClick={() => window.location.reload()}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition-colors"
                  >
                    🔄 Обновить страницу для нового URL
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Setup warning */}
          <div className="bg-yellow-50 rounded-lg p-4 mt-4">
            <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Первоначальная настройка</h4>
            <div className="text-sm text-yellow-800 space-y-1">
              <p>Для работы рингтонов необходимо:</p>
              <ol className="list-decimal list-inside space-y-1 mt-2">
                <li>Создать аккаунт на <a href="https://mega.nz" target="_blank" rel="noopener noreferrer" className="underline">mega.nz</a> (бесплатно)</li>
                <li>Создать файл <code className="bg-yellow-200 px-1 rounded">.env.local</code> в корне проекта</li>
                <li>Добавить в него ваши данные Mega.nz:</li>
              </ol>
              <pre className="bg-yellow-200 text-yellow-900 p-2 rounded mt-2 text-xs">
{`MEGA_EMAIL=your_email@example.com
MEGA_PASSWORD=your_password`}
              </pre>
              <p className="mt-2">После настройки перезапустите сервер разработки.</p>
            </div>
          </div>

          {/* Hidden audio element for preview */}
          <audio
            ref={audioPreviewRef}
            loop={false}
            preload="none"
            crossOrigin="anonymous"
            onError={(e) => {
              console.error('Audio element error:', e)
              const target = e.target as HTMLAudioElement
              if (target?.error) {
                console.error('Audio error code:', target.error.code)
                console.error('Audio error message:', target.error.message)
              }
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default RingtoneSettings
