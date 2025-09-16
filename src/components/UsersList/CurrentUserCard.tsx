interface User {
  id: string
  username: string
  display_name?: string
  avatar_url?: string
  last_seen?: string | null
  status?: string
}

interface CurrentUserCardProps {
  user: User
}

const CurrentUserCard = ({ user }: CurrentUserCardProps) => {
  return (
    <div className="flex items-center justify-between p-3 bg-primary/10 border-2 border-primary rounded-lg">
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
          <p className="font-medium text-primary truncate">
            {user.display_name || user.username} <span className="text-sm font-normal">(Вы)</span>
          </p>
          <p className="text-xs text-primary/80">
            ● онлайн
          </p>
        </div>
      </div>

      <div className="text-sm text-primary font-medium">
        Это вы
      </div>
    </div>
  )
}

export default CurrentUserCard
