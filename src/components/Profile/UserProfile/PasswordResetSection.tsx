import { PasswordResetSectionProps } from './types'

const PasswordResetSection = ({ loading, onPasswordReset }: PasswordResetSectionProps) => {
  return (
    <div className="mb-6">
      <button
        onClick={onPasswordReset}
        disabled={loading}
        className="w-full px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50 dark:bg-yellow-500 dark:hover:bg-yellow-600 transition-colors"
      >
        {loading ? 'Отправка...' : 'Сбросить пароль'}
      </button>
      <p className="text-xs text-muted-foreground mt-1">
        Новый пароль будет отправлен на вашу почту
      </p>
    </div>
  )
}

export default PasswordResetSection



