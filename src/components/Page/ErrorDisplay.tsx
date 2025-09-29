'use client'

interface ErrorDisplayProps {
  error: string | null
}

export default function ErrorDisplay({ error }: ErrorDisplayProps) {
  // Не показываем специальную ошибку для визуального изменения цвета
  if (!error || error === 'CALL_REJECTED_VISUAL') {
    return null
  }

  return (
    <div className="bg-destructive/10 border-l-4 border-destructive p-2 flex-shrink-0">
      <div className="flex">
        <div className="ml-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      </div>
    </div>
  )
}
