// УТИЛИТА ДЛЯ ПОЛУЧЕНИЯ ПРАВИЛЬНОГО DISPLAY_NAME ПОЛЬЗОВАТЕЛЯ

import { createClient } from './supabase/client'

interface UserDisplayData {
  display_name: string
  username: string
  avatar_url?: string
}

/**
 * Получает правильный display_name пользователя, приоритизируя user_metadata
 */
export const getUserDisplayName = async (userId: string): Promise<UserDisplayData> => {
  const supabase = createClient()
  
  try {
    // Используем нашу исправленную RPC функцию get_user_display_name
    const { data: displayName, error: rpcError } = await supabase.rpc('get_user_display_name', {
      user_id: userId
    })
    
    if (!rpcError && displayName) {
      // Также получаем username и avatar_url из профиля
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('username, avatar_url')
        .eq('id', userId)
        .single()
      
      return {
        display_name: displayName,
        username: profileData?.username || displayName,
        avatar_url: profileData?.avatar_url
      }
    }
    
    // Fallback: если RPC функция не работает, делаем вручную
    const [authResponse, profileResponse] = await Promise.all([
      supabase.auth.admin.getUserById(userId),
      supabase.from('user_profiles').select('username, display_name, avatar_url').eq('id', userId).single()
    ])
    
    const userMetadata = authResponse.data?.user?.user_metadata
    const profileData = profileResponse.data
    
    const correctDisplayName = userMetadata?.display_name || 
                              profileData?.display_name || 
                              profileData?.username || 
                              `user_${userId.slice(0, 8)}`
    
    return {
      display_name: correctDisplayName,
      username: profileData?.username || correctDisplayName,
      avatar_url: profileData?.avatar_url
    }
    
  } catch (error) {
    console.error('Error getting user display name:', error)
    return {
      display_name: `user_${userId.slice(0, 8)}`,
      username: `user_${userId.slice(0, 8)}`
    }
  }
}

/**
 * Получает правильный display_name для текущего пользователя
 */
export const getCurrentUserDisplayName = async (): Promise<UserDisplayData | null> => {
  const supabase = createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    
    return await getUserDisplayName(user.id)
  } catch (error) {
    console.error('Error getting current user display name:', error)
    return null
  }
}

/**
 * Синхронизирует display_name из user_metadata в user_profiles для конкретного пользователя
 */
export const syncUserDisplayName = async (userId: string): Promise<boolean> => {
  const supabase = createClient()
  
  try {
    // Получаем display_name из user_metadata
    const { data: authData } = await supabase.auth.admin.getUserById(userId)
    const metadataDisplayName = authData?.user?.user_metadata?.display_name
    
    if (!metadataDisplayName) {
      console.warn('No display_name in user_metadata for user:', userId)
      return false
    }
    
    // Обновляем user_profiles
    const { error } = await supabase
      .from('user_profiles')
      .update({ 
        display_name: metadataDisplayName,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
    
    if (error) {
      console.error('Error syncing display name:', error)
      return false
    }
    
    console.log('✅ Display name synced for user:', userId, metadataDisplayName)
    return true
    
  } catch (error) {
    console.error('Error syncing user display name:', error)
    return false
  }
}

