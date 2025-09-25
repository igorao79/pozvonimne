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
  }, [searchParams, router, supabase.auth])

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
