'use client'

import Image from 'next/image'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
  quality?: number
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
  sizes?: string
  fill?: boolean
  onLoad?: () => void
  onError?: () => void
  onContextMenu?: (e: React.MouseEvent) => void
  onDragStart?: (e: React.DragEvent) => void
}

export const OptimizedImage = ({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  quality = 90,
  placeholder = 'empty',
  blurDataURL,
  sizes,
  fill = false,
  onLoad,
  onError,
  onContextMenu,
  onDragStart,
}: OptimizedImageProps) => {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const handleLoad = () => {
    setIsLoading(false)
    onLoad?.()
  }

  const handleError = () => {
    setIsLoading(false)
    setHasError(true)
    onError?.()
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    onContextMenu?.(e)
  }

  const handleDragStart = (e: React.DragEvent) => {
    e.preventDefault()
    onDragStart?.(e)
  }

  if (hasError) {
    return (
      <div 
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground border border-border rounded",
          className
        )}
        style={{ width, height }}
      >
        <span className="text-sm">Ошибка загрузки</span>
      </div>
    )
  }

  const imageProps = {
    src,
    alt,
    className: cn(
      'transition-opacity duration-300',
      isLoading ? 'opacity-0' : 'opacity-100',
      className
    ),
    priority,
    quality,
    placeholder,
    ...(blurDataURL && { blurDataURL }),
    ...(sizes && { sizes }),
    onLoad: handleLoad,
    onError: handleError,
    onContextMenu: handleContextMenu,
    onDragStart: handleDragStart,
  }

  if (fill) {
    return (
      <div className="relative overflow-hidden">
        <Image
          {...imageProps}
          fill
        />
        {isLoading && (
          <div className="absolute inset-0 animate-pulse bg-muted" />
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      <Image
        {...imageProps}
        width={width || 0}
        height={height || 0}
      />
      {isLoading && (
        <div 
          className="absolute inset-0 animate-pulse bg-muted"
          style={{ width, height }}
        />
      )}
    </div>
  )
}

export default OptimizedImage
