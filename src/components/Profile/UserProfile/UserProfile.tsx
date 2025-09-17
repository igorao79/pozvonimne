'use client'

import useCallStore from '@/store/useCallStore'
import { useProfileData } from './hooks/useProfileData'
import { useDisplayNameValidation } from './hooks/useDisplayNameValidation'
import { useAvatarManager } from './hooks/useAvatarManager'
import { useProfileActions } from './hooks/useProfileActions'
import ProfileHeader from './ProfileHeader'
import MessageDisplay from './MessageDisplay'
import AvatarSection from './AvatarSection'
import DisplayNameSection from './DisplayNameSection'
import EmailSection from './EmailSection'
import PasswordResetSection from './PasswordResetSection'
import { UserProfileProps } from './types'

const UserProfile = ({ onClose }: UserProfileProps) => {
  const { user, userId } = useCallStore()

  // Используем кастомные хуки для управления состоянием
  const {
    loading,
    username,
    displayName,
    avatarUrl,
    newDisplayName,
    error,
    success,
    setLoading,
    setUsername,
    setDisplayName,
    setAvatarUrl,
    setNewDisplayName,
    setError,
    setSuccess
  } = useProfileData(userId)

  const { displayNameAvailable, checkingDisplayName } = useDisplayNameValidation(newDisplayName, displayName)

  const { handleAvatarUpload, handleRemoveAvatar } = useAvatarManager(
    userId,
    avatarUrl,
    setAvatarUrl,
    setLoading,
    setError,
    setSuccess
  )

  const { handleDisplayNameUpdate, handlePasswordReset } = useProfileActions(
    newDisplayName,
    displayName,
    setDisplayName,
    setUsername,
    setLoading,
    setError,
    setSuccess
  )

  const handleDisplayNameChange = (value: string) => {
    setNewDisplayName(value)
    setError(null) // Сбрасываем ошибку при изменении
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-card rounded-lg w-full max-w-sm sm:max-w-md max-h-[90vh] overflow-y-auto overflow-x-hidden border border-border animate-in fade-in duration-300">
        <div className="p-4 sm:p-6">
          <div className="animate-in slide-in-from-top-2 duration-300">
            <ProfileHeader onClose={onClose} />
          </div>

          <div className="animate-in slide-in-from-top-2 duration-300 delay-75">
            <MessageDisplay error={error} success={success} />
          </div>

          <div className="animate-in slide-in-from-bottom-2 duration-300 delay-150">
            <AvatarSection
              avatarUrl={avatarUrl}
              username={username}
              loading={loading}
              onAvatarUpload={handleAvatarUpload}
              onRemoveAvatar={handleRemoveAvatar}
            />
          </div>

          <div className="animate-in slide-in-from-bottom-2 duration-300 delay-225">
            <DisplayNameSection
              newDisplayName={newDisplayName}
              displayName={displayName}
              loading={loading}
              displayNameAvailable={displayNameAvailable}
              checkingDisplayName={checkingDisplayName}
              onDisplayNameChange={handleDisplayNameChange}
              onDisplayNameUpdate={handleDisplayNameUpdate}
            />
          </div>

          <div className="animate-in slide-in-from-bottom-2 duration-300 delay-300">
            <EmailSection email={user?.email} />
          </div>

          <div className="animate-in slide-in-from-bottom-2 duration-300 delay-375">
            <PasswordResetSection
              loading={loading}
              onPasswordReset={handlePasswordReset}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserProfile
