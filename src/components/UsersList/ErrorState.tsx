interface ErrorStateProps {
  title: string
  error: string
  onRetry: () => void
}

const ErrorState = ({ title, error, onRetry }: ErrorStateProps) => {
  return (
    <div className="bg-card shadow-xl rounded-lg p-6 border border-border">
      <h2 className="text-xl font-semibold text-foreground mb-4 text-center">
        {title}
      </h2>
      <div className="text-center py-4">
        <p className="text-destructive mb-2">Ошибка загрузки: {error}</p>
        {error.includes('SQL скрипт') && (
          <div className="bg-yellow-500/10 border border-yellow-500 rounded-lg p-4 mb-4 text-left">
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-2">
              <strong>Требуется настройка базы данных:</strong>
            </p>
            <ol className="text-xs text-yellow-700 space-y-1">
              <li>1. Откройте SQL Editor в Supabase Dashboard</li>
              <li>2. Выполните скрипт из файла <code>supabase_setup.sql</code></li>
              <li>3. Обновите страницу</li>
            </ol>
          </div>
        )}
        <button
          onClick={onRetry}
          className="text-primary hover:text-primary/80 text-sm transition-colors"
        >
          Попробовать снова
        </button>
      </div>
    </div>
  )
}

export default ErrorState
