import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Обрабатываем email confirmation
  if (request.nextUrl.pathname === '/auth/callback') {
    const token_hash = request.nextUrl.searchParams.get('token_hash')
    const type = request.nextUrl.searchParams.get('type')
    
    console.log('🔄 Middleware: Processing callback', {
      pathname: request.nextUrl.pathname,
      token_hash: token_hash?.slice(0, 8) + '...',
      type,
      origin: request.nextUrl.origin
    })
    
    // Если это подтверждение регистрации, перенаправляем на нашу страницу
    if (type === 'signup' && token_hash) {
      // Используем тот же origin, что и в запросе
      const confirmUrl = new URL('/auth/confirm', request.nextUrl.origin)
      confirmUrl.searchParams.set('token_hash', token_hash)
      confirmUrl.searchParams.set('type', type)
      
      console.log('🔄 Middleware: Redirecting to', confirmUrl.toString())
      return NextResponse.redirect(confirmUrl)
    }
  }

  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
