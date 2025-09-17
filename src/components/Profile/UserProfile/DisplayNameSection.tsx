import { DisplayNameSectionProps } from './types'

const DisplayNameSection = ({
  newDisplayName,
  displayName,
  loading,
  displayNameAvailable,
  checkingDisplayName,
  onDisplayNameChange,
  onDisplayNameUpdate
}: DisplayNameSectionProps) => {
  // Определяем классы для обводки инпута
  const getInputClasses = () => {
    const hasIcon = newDisplayName && newDisplayName.length >= 3
    const baseClasses = `w-full px-3 py-2 bg-background text-foreground focus:outline-none placeholder:text-muted-foreground transition-colors border rounded-md ${hasIcon ? 'pr-10' : 'pr-3'} focus:ring-2`

    if (!newDisplayName || newDisplayName.length < 3) {
      return `${baseClasses} border-border focus:ring-ring`
    }

    if (checkingDisplayName) {
      return `${baseClasses} border-muted-foreground/50 focus:ring-ring animate-pulse`
    }

    if (displayNameAvailable === true) {
      return `${baseClasses} border-green-500 focus:ring-green-500`
    }

    if (displayNameAvailable === false) {
      return `${baseClasses} border-destructive focus:ring-destructive`
    }

    return `${baseClasses} border-border focus:ring-ring`
  }

  // Определяем иконку для состояния
  const getStatusIcon = () => {
    if (!newDisplayName || newDisplayName.length < 3) return null

    if (checkingDisplayName) {
      return (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-muted-foreground"></div>
        </div>
      )
    }

    if (displayNameAvailable === true) {
      return (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )
    }

    if (displayNameAvailable === false) {
      return (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <svg className="w-4 h-4 text-destructive" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
      )
    }

    return null
  }

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-foreground mb-2">
        Имя и никнейм для звонков
      </label>
      <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
        <div className="flex-1 relative">
          <input
            type="text"
            value={newDisplayName}
            onChange={(e) => {
              onDisplayNameChange(e.target.value)
            }}
            placeholder="Ваше имя (никнейм для звонков)"
            className={getInputClasses()}
            disabled={loading}
          />
          {getStatusIcon()}
        </div>
        <button
          onClick={onDisplayNameUpdate}
          disabled={loading || !newDisplayName || newDisplayName === displayName || displayNameAvailable === false || (newDisplayName.length >= 3 && displayNameAvailable === null)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 transition-colors w-full sm:w-auto"
        >
          Сохранить
        </button>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Это имя будет видно другим пользователям и использоваться как никнейм для звонков
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        3-20 символов, только буквы, цифры и подчеркивание
      </p>
    </div>
  )
}

export default DisplayNameSection
