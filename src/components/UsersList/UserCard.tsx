interface User {
  id: string
  username: string
  display_name?: string
  avatar_url?: string
  last_seen?: string | null
  status?: string
}

interface UserCardProps {
  user: User
  isInCall: boolean
  callingUserId: string | null
  formatLastSeen: (lastSignInAt: string | null | undefined, status?: string) => string
  onCallUser: (targetUserId: string, targetUsername: string, displayName: string) => void
  onShowProfile: (userId: string) => void
}

const UserCard = ({ user, isInCall, callingUserId, formatLastSeen, onCallUser, onShowProfile }: UserCardProps) => {
  return (
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
      <div className="flex items-center space-x-3 flex-1">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-muted flex-shrink-0">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.display_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <span className="text-white font-medium text-sm">
                {user.display_name?.charAt(0)?.toUpperCase() || user.username?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <button
            onClick={() => onShowProfile(user.id)}
            className="text-left w-full group"
          >
            <p className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
              {user.display_name || user.username}
            </p>
            {user.last_seen && (
              <p className={`text-xs ${
                formatLastSeen(user.last_seen, user.status) === 'онлайн' && 'text-green-600 dark:text-green-400'
                  ? 'text-green-500 font-medium'
                  : 'text-muted-foreground'
              }`}>
                ● {formatLastSeen(user.last_seen, user.status) === 'онлайн'
                  ? 'онлайн'
                  : `Был в сети: ${formatLastSeen(user.last_seen, user.status)}`}
              </p>
            )}
          </button>
        </div>
      </div>

      <button
        onClick={() => onCallUser(user.id, user.username, user.display_name || '')}
        disabled={isInCall || callingUserId === user.id}
        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ml-2"
      >
        {callingUserId === user.id ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Вызов...
          </>
        ) : (
          <>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21L6.16 11.37a11.045 11.045 0 005.516 5.516l1.983-4.064a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Позвонить
          </>
        )}
      </button>
    </div>
  )
}

export default UserCard
