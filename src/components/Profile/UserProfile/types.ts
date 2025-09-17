export interface UserProfileProps {
  onClose: () => void
}

export interface MessageDisplayProps {
  error: string | null
  success: string | null
}

export interface AvatarSectionProps {
  avatarUrl: string
  username: string
  loading: boolean
  onAvatarUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  onRemoveAvatar: () => Promise<void>
}

export interface DisplayNameSectionProps {
  newDisplayName: string
  displayName: string
  loading: boolean
  displayNameAvailable: boolean | null
  checkingDisplayName: boolean
  onDisplayNameChange: (value: string) => void
  onDisplayNameUpdate: () => Promise<void>
}

export interface EmailSectionProps {
  email: string | undefined
}

export interface PasswordResetSectionProps {
  loading: boolean
  onPasswordReset: () => Promise<void>
}

export interface ProfileHeaderProps {
  onClose: () => void
}


