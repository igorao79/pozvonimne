import { useRef, useState, useEffect } from 'react'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { AvatarSectionProps } from './types'

const AvatarSection = ({
  avatarUrl,
  username,
  loading,
  onAvatarUpload,
  onRemoveAvatar
}: AvatarSectionProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imageLoading, setImageLoading] = useState(false)
  const [showSkeleton, setShowSkeleton] = useState(false)
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(avatarUrl)

  // Отслеживаем изменения avatarUrl
  useEffect(() => {
    if (avatarUrl !== currentAvatarUrl) {
      setCurrentAvatarUrl(avatarUrl)
      if (avatarUrl) {
        // При новом URL сначала показываем скелетон с небольшой задержкой
        const timer = setTimeout(() => {
          setShowSkeleton(true)
          setImageLoading(true)
        }, 100)
        return () => clearTimeout(timer)
      } else {
        // Если URL убрали, сразу скрываем все
        setShowSkeleton(false)
        setImageLoading(false)
      }
    }
  }, [avatarUrl, currentAvatarUrl])

  const handleImageLoad = () => {
    // Небольшая задержка перед скрытием скелетона для плавности
    setTimeout(() => {
      setImageLoading(false)
      setTimeout(() => setShowSkeleton(false), 300) // Задержка после исчезновения opacity
    }, 200)
  }

  const handleImageError = () => {
    setImageLoading(false)
    setTimeout(() => setShowSkeleton(false), 300)
  }

  return (
    <div className="text-center mb-6">
      <div className="relative inline-block">
        {/* Контейнер для аватара с фиксированными размерами */}
        <div className="w-24 h-24 rounded-full overflow-hidden bg-muted mx-auto mb-4 relative">
          {/* Скелетон с плавным появлением */}
          <div className={`absolute inset-0 transition-all duration-500 ease-in-out ${
            showSkeleton ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}>
            <Skeleton
              circle
              width={96}
              height={96}
              className="absolute inset-0"
              baseColor="hsl(var(--muted))"
              highlightColor="hsl(var(--muted-foreground) / 0.1)"
            />
          </div>

          {/* Изображение с плавным появлением */}
          {avatarUrl ? (
            <img
              key={avatarUrl} // Важно для перерендеринга при изменении URL
              src={avatarUrl}
              alt="Avatar"
              className={`w-full h-full object-cover absolute inset-0 transition-all duration-500 ease-in-out ${
                imageLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
              }`}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          ) : (
            // Placeholder с первой буквой с плавным появлением
            <div className={`w-full h-full flex items-center justify-center bg-primary absolute inset-0 transition-all duration-500 ease-in-out ${
              showSkeleton ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
            }`}>
              <span className="text-2xl font-bold text-primary-foreground transition-all duration-300">
                {username?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(event) => {
            // При выборе нового файла показываем скелетон с плавной анимацией
            setShowSkeleton(true)
            setTimeout(() => setImageLoading(true), 150) // Небольшая задержка для плавности
            onAvatarUpload(event)
          }}
          className="hidden"
        />
      </div>

      {/* Кнопки всегда на одном месте, текст меняется */}
      <div className="flex justify-center space-x-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 text-sm transition-colors min-w-[100px]"
        >
          {avatarUrl ? 'Изменить' : 'Загрузить'}
        </button>
        <button
          onClick={onRemoveAvatar}
          disabled={loading || !avatarUrl}
          className="px-4 py-2 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 disabled:opacity-50 text-sm transition-colors min-w-[100px]"
        >
          Удалить
        </button>
      </div>
    </div>
  )
}

export default AvatarSection
