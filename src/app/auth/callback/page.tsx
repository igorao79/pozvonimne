'use client'

import { useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

const AuthCallbackContent = () => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const token_hash = searchParams.get('token_hash')
        const type = searchParams.get('type')
        const access_token = searchParams.get('access_token')
        const refresh_token = searchParams.get('refresh_token')

        // Если это подтверждение регистрации - перенаправляем на страницу подтверждения
        if (type === 'signup' && token_hash) {
          const confirmUrl = `/auth/confirm?token_hash=${token_hash}&type=${type}`
          router.replace(confirmUrl)
          return
        }

        // Если есть токены доступа (например, после подтверждения email)
        if (access_token && refresh_token) {
          const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token
          })

          if (error) {
            console.error('Error setting session:', error)
            router.replace('/?error=auth_error')
            return
          }

          if (data.user) {
            // Проверяем и создаем профиль пользователя если нужно
            try {
              // Детальное логирование user_metadata для отладки
              console.log('🔍 [DEBUG] User metadata в callback:', {
                user_metadata: data.user.user_metadata,
                email: data.user.email,
                id: data.user.id
              })
              
              // ИСПРАВЛЕНИЕ: НЕ используем email как fallback, чтобы избежать проблемы с display_name
              const displayName = data.user.user_metadata?.display_name
              
              if (!displayName) {
                console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: display_name отсутствует в user_metadata!', {
                  user_id: data.user.id,
                  email: data.user.email,
                  user_metadata: data.user.user_metadata
                })
                
                // Используем временное имя, пользователь сможет изменить его в профиле
                const tempDisplayName = `user_${data.user.id.slice(0, 8)}`
                console.warn(`⚠️ Используем временное имя: ${tempDisplayName}`)
                
                // Создаем профиль с временным именем
                const { error: profileError } = await supabase.rpc('create_profile_after_registration', {
                  user_display_name: tempDisplayName
                })
                
                if (profileError) {
                  console.error('⚠️ Ошибка создания профиля с временным именем:', profileError)
                } else {
                  console.log('✅ Профиль создан с временным именем:', tempDisplayName)
                }
                
                // Перенаправляем на главную, пользователь сможет изменить имя в профиле
                router.replace('/')
                return
              }
              
              console.log('🔍 [DEBUG] Выбранное displayName в callback:', displayName)
              
              const { error: profileError } = await supabase.rpc('create_profile_after_registration', {
                user_display_name: displayName
              })
              
              if (profileError) {
                console.error('⚠️ Ошибка создания профиля в callback:', profileError)
                // Не блокируем перенаправление из-за ошибки профиля
              } else {
                console.log('✅ Профиль создан в callback для:', data.user.email, 'с именем:', displayName)
              }
            } catch (profileErr) {
              console.error('⚠️ Исключение при создании профиля в callback:', profileErr)
              // Не блокируем перенаправление
            }
            
            // Успешная аутентификация - перенаправляем на главную
            router.replace('/?confirmed=true')
            return
          }
        }

        // Fallback - перенаправляем на главную
        router.replace('/')
      } catch (error) {
        console.error('Auth callback error:', error)
        router.replace('/?error=callback_error')
      }
    }

    handleAuthCallback()
  }, [searchParams, router, supabase])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
        <p className="text-muted-foreground">Обрабатываем аутентификацию...</p>
      </div>
    </div>
  )
}

const AuthCallbackPage = () => {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}

export default AuthCallbackPage
