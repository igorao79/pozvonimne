interface LoadingStateProps {
  title: string
}

const LoadingState = ({ title }: LoadingStateProps) => {
  return (
    <div className="bg-card shadow-xl rounded-lg p-6 border border-border">
      <h2 className="text-xl font-semibold text-foreground mb-4 text-center">
        {title}
      </h2>
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2 text-muted-foreground">Загрузка пользователей...</span>
      </div>
    </div>
  )
}

export default LoadingState
