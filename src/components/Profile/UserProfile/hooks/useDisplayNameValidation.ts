import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

export const useDisplayNameValidation = (newDisplayName: string, displayName: string) => {
  const [displayNameAvailable, setDisplayNameAvailable] = useState<boolean | null>(null)
  const [checkingDisplayName, setCheckingDisplayName] = useState(false)

  const supabase = createClient()

  // Проверка уникальности display_name
  useEffect(() => {
    if (!newDisplayName || newDisplayName.length < 3) {
      setDisplayNameAvailable(null)
      return
    }

    // Если имя не изменилось по сравнению с текущим, считаем его доступным
    if (newDisplayName === displayName) {
      setDisplayNameAvailable(true)
      return
    }

    const checkDisplayName = async () => {
      try {
        setCheckingDisplayName(true)
        const { data, error } = await supabase.rpc('is_display_name_available', {
          check_display_name: newDisplayName
        })

        if (error) throw error
        setDisplayNameAvailable(data)
      } catch (err) {
        console.error('Error checking display name:', err)
        setDisplayNameAvailable(false)
      } finally {
        setCheckingDisplayName(false)
      }
    }

    const timeoutId = setTimeout(checkDisplayName, 500)
    return () => clearTimeout(timeoutId)
  }, [newDisplayName, displayName])

  return {
    displayNameAvailable,
    checkingDisplayName
  }
}


